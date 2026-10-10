import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, Group, Text } from "@mantine/core";

/** index(並び順)で管理される一覧アイテムが最低限持つべきフィールド */
export type IndexedItemBase = {
    id: number;
    routeID: number;
    index: number;
};

/** コピー＆ペースト用にクリップボードへ書き出す/読み込むデータの形式 */
export type ClipboardPayload<TClip> = {
    kind: "indexed-list-v1";
    items: TClip[];
};

/** 呼び出し側がRowComponentへ渡す1行分の描画props */
export type RowRenderProps<TItem> = {
    item: TItem;
    isSelected: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    /** 行内の値を更新して即座にストアへ保存する */
    update: (updater: (x: TItem) => TItem) => void;
    /** 選択ハンドル(RowSelectHandle)のクリック処理。行内の好きな位置に<RowSelectHandle>を置き、これを渡す */
    onSelectClick: (e: React.MouseEvent) => void;
    /** この行を（確認のうえ）削除する */
    remove: () => void;
    /** この行の手前に空の行を1件挿入する */
    insertBefore: () => void;
};

/** IndexedListComponentのprops。データの読み書きと行/ヘッダーの描画を呼び出し側に委譲する */
type Props<TItem extends IndexedItemBase> = {
    routeId: number;

    /** 表示する全アイテム（ストアの値をそのまま渡す。更新はonUpdate/onInsert/onRemove経由で行い、変更は即時に保存される） */
    items: TItem[];

    /** 1件の更新を保存する */
    onUpdate: (item: TItem) => void;
    /** 指定位置にアイテムをまとめて挿入する（indexは並び順で振り直される）。idを採番した新規アイテムを返す */
    onInsert: (position: number, items: Omit<TItem, "id">[]) => TItem[];
    /** 指定idのアイテムをまとめて削除する */
    onRemove: (ids: number[]) => void;
    /** 削除前の確認。指定すると標準の確認ダイアログの代わりに使われる（falseを返すと削除を中止。削除に伴う関連データの後始末もここで行う） */
    confirmDelete?: (ids: number[]) => Promise<boolean> | boolean;

    toClip: (item: TItem) => TItem;
    fromClip: (clip: TItem, routeId: number, index: number) => Omit<TItem, "id">;

    createEmpty: (routeId: number, index: number) => Omit<TItem, "id">;

    RowComponent: React.ComponentType<RowRenderProps<TItem>>;
    HeaderComponent: React.ComponentType;
    AppendRowComponent?: React.ReactNode;
};

/**
 * 行の選択用の丸いチェックボックス。入力欄などとは別に、行の選択状態だけを切り替える。
 *
 * @param props checked:選択中か / onClick:クリック処理（RowRenderPropsのonSelectClickを渡す）
 */
export function RowSelectHandle(props: { checked: boolean; onClick: (e: React.MouseEvent) => void }) {
    return <Checkbox className="row-select-handle" size="sm" radius="xl" checked={props.checked} onChange={() => undefined} onClick={props.onClick} aria-label="この行を選択" />;
}

/**
 * nをmin〜maxの範囲に収める
 *
 * @param n 対象の値
 * @param min 下限
 * @param max 上限
 */
function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

/**
 * 駅一覧・列車種別一覧などの「並び替え可能な一覧」を共通化したコンポーネント。
 * 選択(単一/範囲/Ctrl多重選択)、キーボード操作(矢印キー/Delete/Ctrl+C,V,Insert)、
 * コピー＆ペースト、行の挿入・削除・並び替えのロジックをここに集約し、
 * 行とヘッダーの実際の見た目だけを呼び出し側(RowComponent/HeaderComponent)に委ねる。
 *
 * RowComponent/HeaderComponentは必ずモジュールスコープの安定した関数として渡すこと。
 * 呼び出し側のJSX内でインライン定義すると、親が再レンダリングするたびに
 * 別のコンポーネント型として扱われ、Reactが全行を作り直してしまう
 * (フォーカス喪失やスクロール位置のずれの原因になる)。
 */
export function IndexedListComponent<TItem extends IndexedItemBase>(props: Props<TItem>) {
    const { routeId, items, onUpdate, onInsert, onRemove, confirmDelete, toClip, fromClip, createEmpty, RowComponent, HeaderComponent, AppendRowComponent } = props;

    /** 一覧ルートのdiv。キーボードショートカットを受け取るためtabIndexを持つ */
    const listRef = useRef<HTMLDivElement | null>(null);

    /** キーボード操作の基準となる「今いる行」のid */
    const [cursorId, setCursorId] = useState<number | null>(null);
    /** Shift+矢印キーなどの範囲選択で、選択範囲の起点となる行のid */
    const [anchorId, setAnchorId] = useState<number | null>(null);
    /** 現在選択されている行idの集合(ハイライト表示・削除/コピー対象に使う) */
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    /** navigator.clipboardが使えない場合のフォールバック用クリップボード */
    const clipRef = useRef<ClipboardPayload<TItem> | null>(null);

    /** この路線(routeId)に属するアイテムをindex順に並べたもの */
    const ordered = useMemo(() => {
        return [...items].filter((x) => x.routeID === routeId).sort((a, b) => a.index - b.index);
    }, [items, routeId]);

    const orderedIds = useMemo(() => ordered.map((x) => x.id), [ordered]);

    /**
     * orderedIds内でのidの位置を返す(見つからなければ-1)
     *
     * @param id 検索する行ID（nullなら-1）
     */
    const indexOfId = (id: number | null) => (id == null ? -1 : orderedIds.indexOf(id));

    /**
     * 選択中のid集合の中で、表示順が最も後ろにあるidを返す
     *
     * @param sel 選択中の行ID集合
     */
    const lastSelectedId = (sel: Set<number>) => {
        let bestIdx = -1,
            bestId: number | null = null;
        for (const id of sel) {
            const i = indexOfId(id);
            if (i > bestIdx) {
                bestIdx = i;
                bestId = id;
            }
        }
        return bestId;
    };

    /**
     * aIdからbIdまでの表示順範囲にある全idを選択状態として返す(Shift選択用)
     *
     * @param aId 範囲の一端の行ID
     * @param bId 範囲のもう一端の行ID
     */
    const rangeSelect = (aId: number, bId: number) => {
        const a = indexOfId(aId);
        const b = indexOfId(bId);
        if (a < 0 || b < 0) return new Set<number>();
        const [lo, hi] = a < b ? [a, b] : [b, a];
        return new Set(orderedIds.slice(lo, hi + 1));
    };

    /**
     * 指定idのアイテムをupdaterで更新して保存する
     *
     * @param id 更新する行のID
     * @param updater 現在の行を受け取り、更新後の行を返す関数
     */
    const updateById = (id: number, updater: (x: TItem) => TItem) => {
        const cur = items.find((x) => x.id === id);
        if (cur) onUpdate(updater(cur));
    };

    /**
     * 選択中アイテムをtoClip形式に変換してシステムクリップボードへ書き込む(失敗時はclipRefにのみ保持)
     *
     * @param payload 書き込む内容
     */
    async function writeClipboard(payload: ClipboardPayload<TItem>) {
        clipRef.current = payload;
        try {
            await navigator.clipboard.writeText(JSON.stringify(payload));
        } catch (ex) {
            console.warn(ex);
        }
    }
    /** システムクリップボードからこの一覧形式のデータを読み込む。取得失敗時はclipRefにフォールバックする */
    async function readClipboard(): Promise<ClipboardPayload<TItem> | null> {
        try {
            const text = await navigator.clipboard.readText();
            const parsed = JSON.parse(text);
            if (parsed?.kind === "indexed-list-v1" && Array.isArray(parsed.items)) return parsed;
        } catch (ex) {
            console.warn(ex);
        }
        return clipRef.current;
    }

    /** 現在のカーソル位置を基準に、新規挿入すべき位置（orderedの配列位置）を返す(カーソルが無ければ末尾) */
    const getInsertPosition = () => {
        const curIdx = indexOfId(cursorId);
        return curIdx >= 0 ? curIdx : ordered.length;
    };

    /** カーソル位置の手前に空のアイテムを1件挿入し、新規アイテムを選択状態にする(Ctrl+Insert) */
    function insertOne() {
        const position = getInsertPosition();
        const [created] = onInsert(position, [createEmpty(routeId, position)]);

        setSelectedIds(new Set([created.id]));
        setCursorId(created.id);
        setAnchorId(created.id);
        requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }));
    }

    /**
     * 指定した行を確認ダイアログ付きで削除し、カーソルを近傍の残存アイテムへ移動する
     *
     * @param ids 削除する行ID
     */
    async function deleteIds(ids: number[]) {
        if (ids.length === 0) return;

        const ok = confirmDelete ? await confirmDelete(ids) : confirm(`${ids.length}件削除しますか？`);
        if (!ok) return;

        onRemove(ids);

        const idSet = new Set(ids);
        const remaining = orderedIds.filter((id) => !idSet.has(id));
        const curIdx = cursorId != null ? orderedIds.indexOf(cursorId) : -1;
        const nextIdx = clamp(curIdx, 0, remaining.length - 1);
        const nextId = remaining.length ? remaining[nextIdx] : null;

        setSelectedIds(nextId ? new Set([nextId]) : new Set());
        setCursorId(nextId);
        setAnchorId(nextId);
    }

    /** 選択中のアイテムを削除する(Delete/Backspace) */
    function deleteSelected() {
        return deleteIds(Array.from(selectedIds));
    }

    /**
     * 指定した行の手前に空のアイテムを1件挿入し、新規アイテムを選択状態にする
     *
     * @param id この行の手前に挿入する
     */
    function insertBeforeId(id: number) {
        const position = Math.max(0, indexOfId(id));
        const [created] = onInsert(position, [createEmpty(routeId, position)]);

        setSelectedIds(new Set([created.id]));
        setCursorId(created.id);
        setAnchorId(created.id);
    }

    /**
     * 選択中のアイテムをクリップボードへコピーする。キーボード(Ctrl+C)のときは、カーソルを選択範囲の次の行へ進める
     *
     * @param keepSelection trueなら選択状態を変えない（操作バーのボタンから呼ぶとき）
     */
    async function handleCopy(keepSelection = false) {
        if (selectedIds.size === 0) return;
        const selectedOrdered = ordered.filter((x) => selectedIds.has(x.id));
        const payload: ClipboardPayload<TItem> = {
            kind: "indexed-list-v1",
            items: selectedOrdered.map(toClip),
        };
        await writeClipboard(payload);
        if (keepSelection) return;

        const lastId = lastSelectedId(selectedIds);
        const lastIdx = indexOfId(lastId);
        const nextIdx = clamp(lastIdx + 1, 0, orderedIds.length - 1);
        const nextId = orderedIds.length ? orderedIds[nextIdx] : null;
        setCursorId(nextId);
        setAnchorId(nextId);
        setSelectedIds(nextId ? new Set([nextId]) : new Set());
        requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }));
    }

    /** クリップボードの内容をカーソル位置(または末尾)へ新規アイテムとして貼り付ける(Ctrl+V) */
    async function paste() {
        const clip = await readClipboard();
        if (!clip || clip.items.length === 0) return;

        const position = selectedIds.size === 0 ? ordered.length : getInsertPosition();
        const createdList = onInsert(
            position,
            clip.items.map((c, k) => fromClip(c, routeId, position + k)),
        );

        const newSel = new Set(createdList.map((x) => x.id));
        const newCursor = createdList.length ? createdList[createdList.length - 1].id : cursorId;
        setSelectedIds(newSel);
        setAnchorId(createdList.length ? createdList[0].id : newCursor);
        setCursorId(newCursor);
        requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }));
    }

    /** 全行を選択する */
    function selectAll() {
        if (orderedIds.length === 0) return;
        setSelectedIds(new Set(orderedIds));
        setCursorId(orderedIds[orderedIds.length - 1]);
        setAnchorId(orderedIds[0]);
    }

    /** 選択を解除する */
    function clearSelection() {
        setSelectedIds(new Set());
        setAnchorId(null);
    }

    /**
     * 文字入力中の要素（テキスト入力・セレクトなど）かを返す。ここではショートカットを奪わない
     *
     * @param t キーイベントの発生元
     */
    function isTextEditing(t: HTMLElement | null) {
        if (!t) return false;
        if (t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable) return true;
        if (t.tagName === "INPUT") return !["checkbox", "radio", "button", "submit", "range", "color"].includes((t as HTMLInputElement).type);
        return false;
    }

    /**
     * 指定行の最初のテキスト入力にフォーカスして編集を始める
     *
     * @param id 編集する行ID
     * @param selectText trueなら入力済みの文字を全選択する
     */
    function focusRowInput(id: number | null, selectText: boolean) {
        if (id == null) return;
        const input = listRef.current?.querySelector(`[data-row-id="${id}"] input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])`) as HTMLInputElement | null;
        if (!input) return;
        input.focus();
        if (selectText) input.select();
    }

    /**
     * 一覧ルートのonKeyDownハンドラ。「選択モード」（一覧自体・チェックボックスなどにフォーカスがある状態）では、
     * 矢印キーでの移動/範囲選択、Space(選択切替)、Ctrl+A/C/V/Insert、Delete、Enter/F2(名前の編集開始)を処理する。
     * 文字入力中は何も奪わず、Escapeだけで選択モードに戻る。
     *
     * @param e 一覧ルートで受け取ったキーイベント
     */
    async function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        const target = e.target as HTMLElement;

        if (isTextEditing(target)) {
            if (e.key !== "Escape") return;
            const rowEl = target.closest("[data-row-id]");
            if (!rowEl) return;
            e.preventDefault();
            const id = Number(rowEl.getAttribute("data-row-id"));
            setSelectedIds(new Set([id]));
            setCursorId(id);
            setAnchorId(id);
            target.blur();
            listRef.current?.focus({ preventScroll: true });
            return;
        }
        if (orderedIds.length === 0) return;

        const isCtrl = e.ctrlKey || e.metaKey;
        const onRoot = target === listRef.current;

        const curId = cursorId ?? orderedIds[0];
        const curIdx = indexOfId(curId);
        const dir = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
        if (dir !== 0) {
            e.preventDefault();
            const nextIdx = clamp(curIdx + dir, 0, orderedIds.length - 1);
            const nextId = orderedIds[nextIdx];
            if (e.shiftKey) {
                const a = anchorId ?? curId;
                setAnchorId(a);
                setCursorId(nextId);
                setSelectedIds(rangeSelect(a, nextId));
            } else {
                setAnchorId(nextId);
                setCursorId(nextId);
                setSelectedIds(new Set([nextId]));
            }
            return;
        }

        if (isCtrl && (e.key === "a" || e.key === "A")) {
            e.preventDefault();
            selectAll();
            return;
        }
        if (isCtrl && (e.key === "c" || e.key === "C")) {
            e.preventDefault();
            await handleCopy();
            return;
        }
        if (isCtrl && (e.key === "v" || e.key === "V")) {
            e.preventDefault();
            await paste();
            return;
        }
        if (isCtrl && e.key === "Insert") {
            e.preventDefault();
            insertOne();
            return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            await deleteSelected();
            return;
        }
        if (e.key === "Escape") {
            clearSelection();
            return;
        }

        // 以下は一覧自体にフォーカスがあるときだけ（チェックボックスやボタン上では、その要素の標準動作を優先する）
        if (!onRoot) return;
        if (e.key === " ") {
            e.preventDefault();
            toggleSelected(curId);
            return;
        }
        if (e.key === "Enter" || e.key === "F2") {
            e.preventDefault();
            focusRowInput(curId, true);
            return;
        }
        if (e.key.length === 1 && !isCtrl && !e.altKey && cursorId != null) {
            // そのまま文字を打ち始めたら、その行の名前の編集に入る（入力された文字は新しくフォーカスした欄に入る）
            focusRowInput(cursorId, false);
        }
    }

    /**
     * 指定行の選択状態を切り替える（他の選択は維持）
     *
     * @param id 対象の行ID
     */
    function toggleSelected(id: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        setCursorId(id);
        setAnchorId(id);
    }

    /**
     * 選択ハンドルのクリック処理。通常は追加選択の切り替え、Shift+クリックは範囲選択
     *
     * @param id 対象の行ID
     * @param e クリックイベント
     */
    function onHandleClick(id: number, e: React.MouseEvent) {
        if (e.shiftKey && (anchorId != null || cursorId != null)) {
            const a = anchorId ?? cursorId!;
            setSelectedIds(rangeSelect(a, id));
            setCursorId(id);
            return;
        }
        toggleSelected(id);
    }

    /**
     * idの行用のonMouseDownハンドラを作る。行の余白をクリックしたときの選択（単一/Ctrl追加/Shift範囲）を処理する。
     * 入力欄・ボタン・チェックボックスの操作では選択状態を変えない（選択は選択ハンドルで行う）。
     *
     * @param id 対象の行ID
     */
    const rowMouseDown = (id: number, e: React.MouseEvent) => {
        // 入力欄などはブラウザ標準のフォーカス付与に任せる（ここでlistRefにフォーカスを奪うと、
        // フォーカス移動と競合してスクロール位置がずれる不具合が起きるため）
        const isInteractiveTarget = !!(e.target as HTMLElement)?.closest("input, select, textarea, button, label");
        if (isInteractiveTarget) return;
        listRef.current?.focus({ preventScroll: true });

        const isSelected = selectedIds.has(id);

        if (e.shiftKey && cursorId != null) {
            const a = anchorId ?? cursorId;
            setSelectedIds(rangeSelect(a, id));
            setCursorId(id);
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            toggleSelected(id);
            return;
        }

        if (isSelected && selectedIds.size === 1) {
            setSelectedIds(new Set());
            setCursorId(null);
            setAnchorId(null);
            return;
        }
        setSelectedIds(new Set([id]));
        setCursorId(id);
        setAnchorId(id);
    };

    // カーソル行が画面外なら見える位置までスクロールする（キーボード移動用）
    useEffect(() => {
        if (cursorId == null) return;
        const raf = requestAnimationFrame(() => {
            (listRef.current?.querySelector(`[data-row-id="${cursorId}"]`) as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
        });
        return () => cancelAnimationFrame(raf);
    }, [cursorId]);

    // 行に渡すコールバックは、行IDごとに同じ関数を使い回す（行コンポーネントのReact.memoを効かせるため）。
    // 中身は常に最新の関数(latest)を呼ぶので、古いクロージャを掴むことはない。
    const latest = useRef({ rowMouseDown, updateById, deleteIds, insertBeforeId, onHandleClick });
    useLayoutEffect(() => {
        latest.current = { rowMouseDown, updateById, deleteIds, insertBeforeId, onHandleClick };
    });
    const handlerCache = useRef(new Map<number, Omit<RowRenderProps<TItem>, "item" | "isSelected">>());
    useLayoutEffect(() => {
        // 削除された行のぶんを掃除する
        const alive = new Set(orderedIds);
        for (const id of handlerCache.current.keys()) if (!alive.has(id)) handlerCache.current.delete(id);
    }, [orderedIds]);

    /**
     * 行IDに対応する、安定した(再描画しても同じ参照の)コールバック一式を返す
     *
     * @param id 行ID
     */
    function getRowHandlers(id: number) {
        let h = handlerCache.current.get(id);
        if (!h) {
            h = {
                onMouseDown: (e) => latest.current.rowMouseDown(id, e),
                onSelectClick: (e) => latest.current.onHandleClick(id, e),
                update: (updater) => latest.current.updateById(id, updater),
                remove: () => void latest.current.deleteIds([id]),
                insertBefore: () => latest.current.insertBeforeId(id),
            };
            handlerCache.current.set(id, h);
        }
        return h;
    }

    return (
        <div>
            {/* 選択操作バー：PC・スマホ共通。選択中の行に対する操作をここからも行える */}
            <div className="indexed-toolbar">
                <Group gap="xs" justify="space-between" wrap="wrap">
                    <Text size="sm" fw={600}>
                        {selectedIds.size > 0 ? `${selectedIds.size}件選択中` : "未選択"}
                    </Text>
                    <Group gap={4} wrap="wrap">
                        <Button size="compact-xs" variant="default" onClick={selectAll} disabled={orderedIds.length === 0} title="すべて選択 (Ctrl+A)">
                            全選択
                        </Button>
                        <Button size="compact-xs" variant="default" onClick={() => void handleCopy(true)} disabled={selectedIds.size === 0} title="コピー (Ctrl+C)">
                            コピー
                        </Button>
                        <Button size="compact-xs" variant="default" onClick={() => void paste()} title="貼り付け (Ctrl+V)">
                            貼り付け
                        </Button>
                        <Button
                            size="compact-xs"
                            variant="default"
                            color="red"
                            c="red"
                            onClick={() => void deleteSelected()}
                            disabled={selectedIds.size === 0}
                            title="削除 (Delete)"
                        >
                            削除
                        </Button>
                        <Button size="compact-xs" variant="subtle" color="gray" onClick={clearSelection} disabled={selectedIds.size === 0} title="選択解除 (Esc)">
                            解除
                        </Button>
                    </Group>
                </Group>
                <Text className="indexed-hint" size="xs" c="dimmed">
                    左端の○で選択（Shift:範囲）／入力欄で Esc → 選択モード：↑↓ 移動、Shift+↑↓ 範囲、Space 選択、Ctrl+A/C/V、Delete、Enter/F2 で名前を編集
                </Text>
            </div>

            <div
                className="indexed-list"
                ref={listRef}
                tabIndex={0}
                onKeyDown={onKeyDown}
                onFocus={(e) => {
                    // 行の中の入力欄などにフォーカスが入ったら、その行をキーボード操作の基準にする（選択は変えない）
                    const rowEl = (e.target as HTMLElement).closest("[data-row-id]");
                    if (rowEl) setCursorId(Number(rowEl.getAttribute("data-row-id")));
                }}
                style={{ outline: "none", width: "fit-content" }}
            >
                <HeaderComponent />
                {ordered.map((item) => (
                    <RowComponent key={item.id} item={item} isSelected={selectedIds.has(item.id)} {...getRowHandlers(item.id)} />
                ))}

                {AppendRowComponent ?? null}
            </div>
        </div>
    );
}

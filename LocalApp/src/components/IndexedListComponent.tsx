import React, { useMemo, useRef, useState } from "react";

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

    /** 選択中のアイテムを確認ダイアログ付きで削除し、カーソルを近傍の残存アイテムへ移動する(Delete/Backspace) */
    async function deleteSelected() {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        const ok = confirmDelete ? await confirmDelete(ids) : confirm(`${ids.length}件削除しますか？`);
        if (!ok) return;

        onRemove(ids);

        const remaining = orderedIds.filter((id) => !selectedIds.has(id));
        const curIdx = cursorId != null ? orderedIds.indexOf(cursorId) : -1;
        const nextIdx = clamp(curIdx, 0, remaining.length - 1);
        const nextId = remaining.length ? remaining[nextIdx] : null;

        setSelectedIds(nextId ? new Set([nextId]) : new Set());
        setCursorId(nextId);
        setAnchorId(nextId);
    }

    /** 選択中のアイテムをクリップボードへコピーし、カーソルを選択範囲の次の行へ進める(Ctrl+C) */
    async function handleCopy() {
        if (selectedIds.size === 0) return;
        const selectedOrdered = ordered.filter((x) => selectedIds.has(x.id));
        const payload: ClipboardPayload<TItem> = {
            kind: "indexed-list-v1",
            items: selectedOrdered.map(toClip),
        };
        await writeClipboard(payload);

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

    /**
     * 一覧ルートのonKeyDownハンドラ。矢印キーでの移動/範囲選択とコピペ・挿入・削除のショートカットをまとめて処理する
     *
     * @param e 一覧ルートで受け取ったキーイベント
     */
    async function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        if (orderedIds.length === 0) return;

        const isCtrl = e.ctrlKey || e.metaKey;

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
    }

    /**
     * idの行用のonMouseDownハンドラを作る。単一選択/Ctrl追加選択/Shift範囲選択を切り替える
     *
     * @param id 対象の行ID
     */
    const makeRowMouseDown = (id: number) => (e: React.MouseEvent) => {
        // チェックボックスや入力欄など、行内の操作可能な要素をクリックした場合は
        // ブラウザ標準のフォーカス付与に任せる。ここで listRef にフォーカスを
        // 奪うと、ブラウザ側のフォーカス移動と競合してスクロール位置がずれ、
        // 1回目のクリックが正しく反映されない(あるいは意図せずスクロールする)
        // 不具合が起きるため。
        const targetTag = (e.target as HTMLElement)?.tagName;
        const isInteractiveTarget = targetTag === "INPUT" || targetTag === "SELECT" || targetTag === "TEXTAREA" || targetTag === "BUTTON";
        if (!isInteractiveTarget) {
            listRef.current?.focus({ preventScroll: true });
        }

        const isSelected = selectedIds.has(id);

        if (e.shiftKey && cursorId != null) {
            const a = anchorId ?? cursorId;
            setSelectedIds(rangeSelect(a, id));
            setCursorId(id);
            return;
        }

        if (!e.ctrlKey && !e.metaKey) {
            if (isSelected && selectedIds.size === 1) {
                setSelectedIds(new Set());
                setCursorId(null);
                setAnchorId(null);
                return;
            }
            setSelectedIds(new Set([id]));
            setCursorId(id);
            setAnchorId(id);
            return;
        }
    };

    return (
        <div>
            <div ref={listRef} tabIndex={0} onKeyDown={onKeyDown} style={{ outline: "none", width: "fit-content" }}>
                <HeaderComponent />
                {ordered.map((item) => (
                    <RowComponent
                        key={item.id}
                        item={item}
                        isSelected={selectedIds.has(item.id)}
                        onMouseDown={makeRowMouseDown(item.id)}
                        update={(updater) => updateById(item.id, updater)}
                    />
                ))}

                {AppendRowComponent ?? null}
            </div>
        </div>
    );
}

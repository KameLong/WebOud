import React, { useEffect, useMemo, useRef } from "react";
import { Checkbox } from "@mantine/core";
import { clamp, lastSelectedId, selectMany, selectNearAfterRemove } from "./listSelection.ts";
import { isImeComposing } from "../lib/keyboard.ts";
import { useListClipboard } from "./useListClipboard.ts";
import { useListSelection } from "./useListSelection.ts";
import { useStableRowHandlers, type RowHandlers } from "./useStableRowHandlers.ts";
import { focusRowInput, isTextEditing } from "./indexedListDom.ts";
import { IndexedListToolbar } from "./IndexedListToolbar.tsx";

/** index(並び順)で管理される一覧アイテムが最低限持つべきフィールド */
export type IndexedItemBase = {
    id: number;
    routeID: number;
    index: number;
};

/** 呼び出し側がRowComponentへ渡す1行分の描画props */
export type RowRenderProps<TItem> = {
    item: TItem;
    isSelected: boolean;
} & {
    /** 行のmousedown処理（選択） */
    onMouseDown: RowHandlers<TItem>["onMouseDown"];
    /** 選択ハンドル(RowSelectHandle)のクリック処理。行内の好きな位置に<RowSelectHandle>を置き、これを渡す */
    onSelectClick: RowHandlers<TItem>["onSelectClick"];
    /** 行内の値を更新して即座にストアへ保存する */
    update: RowHandlers<TItem>["update"];
    /** この行を（確認のうえ）削除する */
    remove: RowHandlers<TItem>["remove"];
    /** この行の手前に空の行を1件挿入する */
    insertBefore: RowHandlers<TItem>["insertBefore"];
};

/** IndexedListのprops。データの読み書きと行/ヘッダーの描画を呼び出し側に委譲する */
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
    /** クリップボードのデータから新しい行を作る。貼り付けられない行（不正なデータなど）はnullを返すと読み飛ばされる */
    fromClip: (clip: TItem, routeId: number, index: number) => Omit<TItem, "id"> | null;

    /** 挿入する新しい行を作る（Ctrl+Insertや行間の＋ボタン）。作れない場合（入力不足など）はnullを返すと何も挿入されない */
    createEmpty: (routeId: number, index: number) => Omit<TItem, "id"> | null;

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
 * 駅一覧・列車種別一覧などの「並び替え可能な一覧」を共通化したコンポーネント。
 * 選択(単一/範囲/Ctrl多重選択)、キーボード操作(矢印キー/Delete/Ctrl+C,V,Insert)、
 * コピー＆ペースト、行の挿入・削除・並び替えのロジックをここに集約し、
 * 行とヘッダーの実際の見た目だけを呼び出し側(RowComponent/HeaderComponent)に委ねる。
 * 選択状態は useListSelection（計算は domain/listSelection.ts）、コピー＆ペーストは useListClipboard、
 * 操作バーは IndexedListToolbar に分けている。
 *
 * RowComponent/HeaderComponentは必ずモジュールスコープの安定した関数として渡すこと。
 * 呼び出し側のJSX内でインライン定義すると、親が再レンダリングするたびに
 * 別のコンポーネント型として扱われ、Reactが全行を作り直してしまう
 * (フォーカス喪失やスクロール位置のずれの原因になる)。
 */
export function IndexedList<TItem extends IndexedItemBase>(props: Props<TItem>) {
    const { routeId, items, onUpdate, onInsert, onRemove, confirmDelete, toClip, fromClip, createEmpty, RowComponent, HeaderComponent, AppendRowComponent } = props;

    /** 一覧ルートのdiv。キーボードショートカットを受け取るためtabIndexを持つ */
    const listRef = useRef<HTMLDivElement | null>(null);
    const clipboard = useListClipboard<TItem>();

    /** この路線(routeId)に属するアイテムをindex順に並べたもの */
    const ordered = useMemo(() => [...items].filter((x) => x.routeID === routeId).sort((a, b) => a.index - b.index), [items, routeId]);
    const orderedIds = useMemo(() => ordered.map((x) => x.id), [ordered]);

    const sel = useListSelection(orderedIds);
    const { cursorId, selectedIds } = sel.selection;

    /** 一覧にフォーカスを戻す（選択モードに入る） */
    const focusList = () => listRef.current?.focus({ preventScroll: true });

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

    /** 現在のカーソル位置を基準に、新規挿入すべき位置（orderedの配列位置）を返す(カーソルが無ければ末尾) */
    const getInsertPosition = () => {
        const curIdx = orderedIds.indexOf(cursorId ?? -1);
        return curIdx >= 0 ? curIdx : ordered.length;
    };

    /**
     * 指定位置に空のアイテムを1件挿入し、新規アイテムを選択状態にする。作れない場合（入力不足など）は何もしない
     *
     * @param position 挿入位置（orderedの配列位置）
     * @returns 挿入したか
     */
    function insertEmptyAt(position: number): boolean {
        const dto = createEmpty(routeId, position);
        if (!dto) return false;
        const [created] = onInsert(position, [dto]);
        sel.selectOnly(created.id);
        return true;
    }

    /** カーソル位置の手前に空のアイテムを1件挿入する(Ctrl+Insert) */
    function insertOne() {
        if (insertEmptyAt(getInsertPosition())) requestAnimationFrame(focusList);
    }

    /**
     * 指定した行の手前に空のアイテムを1件挿入する
     *
     * @param id この行の手前に挿入する
     */
    function insertBeforeId(id: number) {
        insertEmptyAt(Math.max(0, orderedIds.indexOf(id)));
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
        sel.set(selectNearAfterRemove(orderedIds, ids, cursorId));
    }

    /**
     * 選択中のアイテムをクリップボードへコピーする。キーボード(Ctrl+C)のときは、カーソルを選択範囲の次の行へ進める
     *
     * @param keepSelection trueなら選択状態を変えない（操作バーのボタンから呼ぶとき）
     */
    async function handleCopy(keepSelection = false) {
        if (selectedIds.size === 0) return;
        await clipboard.write(ordered.filter((x) => selectedIds.has(x.id)).map(toClip));
        if (keepSelection) return;

        const lastIdx = orderedIds.indexOf(lastSelectedId(orderedIds, selectedIds) ?? -1);
        sel.selectOnly(orderedIds.length ? orderedIds[clamp(lastIdx + 1, 0, orderedIds.length - 1)] : null);
        requestAnimationFrame(focusList);
    }

    /** クリップボードの内容をカーソル位置(または末尾)へ新規アイテムとして貼り付ける(Ctrl+V) */
    async function paste() {
        const clipItems = await clipboard.read();
        if (!clipItems || clipItems.length === 0) return;

        const position = selectedIds.size === 0 ? ordered.length : getInsertPosition();
        const dtos = clipItems.map((c, k) => fromClip(c, routeId, position + k)).filter((d): d is Omit<TItem, "id"> => d !== null);
        if (dtos.length === 0) return;
        const created = onInsert(position, dtos);

        const newCursor = created.length ? created[created.length - 1].id : cursorId;
        sel.set(selectMany(created.map((x) => x.id), newCursor, created.length ? created[0].id : newCursor));
        requestAnimationFrame(focusList);
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
            if (e.key !== "Escape" || isImeComposing(e)) return;
            const rowEl = target.closest("[data-row-id]");
            if (!rowEl) return;
            e.preventDefault();
            sel.selectOnly(Number(rowEl.getAttribute("data-row-id")));
            target.blur();
            focusList();
            return;
        }
        if (orderedIds.length === 0) return;

        const isCtrl = e.ctrlKey || e.metaKey;
        const onRoot = target === listRef.current;

        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            sel.move(e.key === "ArrowUp" ? -1 : 1, e.shiftKey);
            return;
        }
        if (isCtrl && (e.key === "a" || e.key === "A")) {
            e.preventDefault();
            sel.selectAll();
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
            await deleteIds(Array.from(selectedIds));
            return;
        }
        if (e.key === "Escape") {
            sel.clear();
            return;
        }

        // 以下は一覧自体にフォーカスがあるときだけ（チェックボックスやボタン上では、その要素の標準動作を優先する）
        if (!onRoot) return;
        const curId = cursorId ?? orderedIds[0];
        if (e.key === " ") {
            e.preventDefault();
            sel.toggle(curId);
            return;
        }
        if (e.key === "Enter" || e.key === "F2") {
            e.preventDefault();
            focusRowInput(listRef.current, curId, true);
            return;
        }
        if (e.key.length === 1 && !isCtrl && !e.altKey && cursorId != null) {
            // そのまま文字を打ち始めたら、その行の名前の編集に入る（入力された文字は新しくフォーカスした欄に入る）
            focusRowInput(listRef.current, cursorId, false);
        }
    }

    /**
     * 選択ハンドルのクリック処理。通常は追加選択の切り替え、Shift+クリックは範囲選択
     *
     * @param id 対象の行ID
     * @param e クリックイベント
     */
    function onHandleClick(id: number, e: React.MouseEvent) {
        if (e.shiftKey && sel.extendTo(id)) return;
        sel.toggle(id);
    }

    /**
     * 行の余白をクリックしたときの選択（単一/Ctrl追加/Shift範囲）を処理する。
     * 入力欄・ボタン・チェックボックスの操作では選択状態を変えない（選択は選択ハンドルで行う）。
     *
     * @param id 対象の行ID
     * @param e mousedownイベント
     */
    const rowMouseDown = (id: number, e: React.MouseEvent) => {
        // 入力欄などはブラウザ標準のフォーカス付与に任せる（ここでlistRefにフォーカスを奪うと、
        // フォーカス移動と競合してスクロール位置がずれる不具合が起きるため）
        const isInteractiveTarget = !!(e.target as HTMLElement)?.closest("input, select, textarea, button, label");
        if (isInteractiveTarget) return;
        focusList();

        if (e.shiftKey && cursorId != null && sel.extendTo(id)) return;
        if (e.ctrlKey || e.metaKey) {
            sel.toggle(id);
            return;
        }
        // 選択中の唯一の行をもう一度押したら、選択を解除する
        sel.selectOnly(selectedIds.has(id) && selectedIds.size === 1 ? null : id);
    };

    // カーソル行が画面外なら見える位置までスクロールする（キーボード移動用）
    useEffect(() => {
        if (cursorId == null) return;
        const raf = requestAnimationFrame(() => {
            (listRef.current?.querySelector(`[data-row-id="${cursorId}"]`) as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
        });
        return () => cancelAnimationFrame(raf);
    }, [cursorId]);

    const getRowHandlers = useStableRowHandlers<TItem>(orderedIds, { rowMouseDown, updateById, deleteIds, insertBeforeId, onHandleClick });

    return (
        <div>
            <IndexedListToolbar
                selectedCount={selectedIds.size}
                hasItems={orderedIds.length > 0}
                onSelectAll={sel.selectAll}
                onCopy={() => void handleCopy(true)}
                onPaste={() => void paste()}
                onDelete={() => void deleteIds(Array.from(selectedIds))}
                onClear={sel.clear}
            />

            <div
                className="indexed-list"
                ref={listRef}
                tabIndex={0}
                onKeyDown={onKeyDown}
                onFocus={(e) => {
                    // 行の中の入力欄などにフォーカスが入ったら、その行をキーボード操作の基準にする（選択は変えない）
                    const rowEl = (e.target as HTMLElement).closest("[data-row-id]");
                    if (rowEl) sel.setCursor(Number(rowEl.getAttribute("data-row-id")));
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

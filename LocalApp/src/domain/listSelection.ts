/** 一覧の選択状態（キーボード操作の基準行・範囲選択の起点・選択中の行） */
export type ListSelection = {
    /** キーボード操作の基準となる「今いる行」のid */
    cursorId: number | null;
    /** Shift+矢印キーなどの範囲選択で、選択範囲の起点となる行のid */
    anchorId: number | null;
    /** 選択されている行idの集合 */
    selectedIds: Set<number>;
};

/** 何も選択していない状態 */
export const NO_SELECTION: ListSelection = { cursorId: null, anchorId: null, selectedIds: new Set() };

/**
 * 値を範囲に収めます。
 *
 * @param n 対象の値
 * @param min 下限
 * @param max 上限
 */
export function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}

/**
 * 1行だけを選択した状態にします（カーソルと範囲選択の起点も同じ行）。nullなら何も選択しない状態です。
 *
 * @param id 選択する行のid
 */
export function selectOnly(id: number | null): ListSelection {
    return id == null ? NO_SELECTION : { cursorId: id, anchorId: id, selectedIds: new Set([id]) };
}

/**
 * 複数の行を選択した状態にします。
 *
 * @param ids 選択する行のid
 * @param cursorId カーソルを置く行
 * @param anchorId 範囲選択の起点にする行
 */
export function selectMany(ids: number[], cursorId: number | null, anchorId: number | null): ListSelection {
    return { cursorId, anchorId, selectedIds: new Set(ids) };
}

/**
 * aからbまで（表示順）の行idを返します。どちらかが一覧に無ければ空です。
 *
 * @param orderedIds 表示順の行id
 * @param a 範囲の一端の行id
 * @param b 範囲のもう一端の行id
 */
export function rangeIds(orderedIds: number[], a: number, b: number): number[] {
    const ia = orderedIds.indexOf(a);
    const ib = orderedIds.indexOf(b);
    if (ia < 0 || ib < 0) return [];
    return orderedIds.slice(Math.min(ia, ib), Math.max(ia, ib) + 1);
}

/**
 * 選択中の行のうち、表示順が最も後ろの行idを返します。
 *
 * @param orderedIds 表示順の行id
 * @param selectedIds 選択中の行id
 */
export function lastSelectedId(orderedIds: number[], selectedIds: Set<number>): number | null {
    let bestIdx = -1;
    let bestId: number | null = null;
    for (const id of selectedIds) {
        const i = orderedIds.indexOf(id);
        if (i > bestIdx) {
            bestIdx = i;
            bestId = id;
        }
    }
    return bestId;
}

/**
 * 矢印キーでカーソルを1行動かします。Shiftを押していれば範囲選択を広げ、押していなければその行だけを選択します。
 *
 * @param sel 現在の選択
 * @param orderedIds 表示順の行id（空でないこと）
 * @param dir -1:上 1:下
 * @param extend Shiftを押しているか
 */
export function moveCursor(sel: ListSelection, orderedIds: number[], dir: -1 | 1, extend: boolean): ListSelection {
    const curId = sel.cursorId ?? orderedIds[0];
    const nextId = orderedIds[clamp(orderedIds.indexOf(curId) + dir, 0, orderedIds.length - 1)];
    if (!extend) return selectOnly(nextId);
    const anchorId = sel.anchorId ?? curId;
    return selectMany(rangeIds(orderedIds, anchorId, nextId), nextId, anchorId);
}

/**
 * 指定した行の選択状態を切り替えます（他の選択は維持。カーソルと起点はその行になる）。
 *
 * @param sel 現在の選択
 * @param id 対象の行id
 */
export function toggleSelected(sel: ListSelection, id: number): ListSelection {
    const selectedIds = new Set(sel.selectedIds);
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    return { cursorId: id, anchorId: id, selectedIds };
}

/**
 * 起点（無ければカーソル）から指定した行までを選択します（Shift+クリック）。起点もカーソルも無ければnull。
 *
 * @param sel 現在の選択
 * @param orderedIds 表示順の行id
 * @param id クリックした行のid
 */
export function extendSelection(sel: ListSelection, orderedIds: number[], id: number): ListSelection | null {
    const base = sel.anchorId ?? sel.cursorId;
    if (base == null) return null;
    return { ...sel, cursorId: id, selectedIds: new Set(rangeIds(orderedIds, base, id)) };
}

/**
 * 全行を選択します（カーソルは末尾、起点は先頭）。行が無ければそのままです。
 *
 * @param sel 現在の選択
 * @param orderedIds 表示順の行id
 */
export function selectAll(sel: ListSelection, orderedIds: number[]): ListSelection {
    if (orderedIds.length === 0) return sel;
    return selectMany(orderedIds, orderedIds[orderedIds.length - 1], orderedIds[0]);
}

/**
 * 選択を解除します（カーソルの位置は残す）。
 *
 * @param sel 現在の選択
 */
export function clearSelection(sel: ListSelection): ListSelection {
    return { ...sel, anchorId: null, selectedIds: new Set() };
}

/**
 * 指定した行を除いた一覧で、カーソルに近い行を1行だけ選択します（削除のあと）。
 *
 * @param orderedIds 削除前の表示順の行id
 * @param removedIds 削除した行id
 * @param cursorId 削除前のカーソルの行
 */
export function selectNearAfterRemove(orderedIds: number[], removedIds: number[], cursorId: number | null): ListSelection {
    const removed = new Set(removedIds);
    const remaining = orderedIds.filter((id) => !removed.has(id));
    const curIdx = cursorId != null ? orderedIds.indexOf(cursorId) : -1;
    return selectOnly(remaining.length ? remaining[clamp(curIdx, 0, remaining.length - 1)] : null);
}

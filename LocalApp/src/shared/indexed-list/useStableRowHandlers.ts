import { useLayoutEffect, useRef } from "react";
import type React from "react";

/** 行ごとに渡す操作 */
export type RowHandlers<TItem> = {
    onMouseDown: (e: React.MouseEvent) => void;
    onSelectClick: (e: React.MouseEvent) => void;
    update: (updater: (x: TItem) => TItem) => void;
    remove: () => void;
    insertBefore: () => void;
};

/** 行の操作の実体（行のidを受け取る） */
type RowActions<TItem> = {
    rowMouseDown: (id: number, e: React.MouseEvent) => void;
    onHandleClick: (id: number, e: React.MouseEvent) => void;
    updateById: (id: number, updater: (x: TItem) => TItem) => void;
    deleteIds: (ids: number[]) => unknown;
    insertBeforeId: (id: number) => void;
};

/**
 * 行に渡す操作を、行idごとに同じ関数（再描画しても同じ参照）にして返します。行コンポーネントのReact.memoを効かせるためです。
 * 関数の中身は、その時点の最新の actions を呼ぶので、古い状態を掴むことはありません。
 *
 * @param orderedIds 表示順の行id（無くなった行の関数を捨てるために使う）
 * @param actions 行の操作の実体（毎回の描画で最新のものを渡す）
 * @returns 行idから、その行に渡す操作を得る関数
 */
export function useStableRowHandlers<TItem>(orderedIds: number[], actions: RowActions<TItem>): (id: number) => RowHandlers<TItem> {
    const latest = useRef(actions);
    useLayoutEffect(() => {
        latest.current = actions;
    });
    const cache = useRef(new Map<number, RowHandlers<TItem>>());
    useLayoutEffect(() => {
        // 削除された行のぶんを掃除する
        const alive = new Set(orderedIds);
        for (const id of cache.current.keys()) if (!alive.has(id)) cache.current.delete(id);
    }, [orderedIds]);

    return (id) => {
        let h = cache.current.get(id);
        if (!h) {
            h = {
                onMouseDown: (e) => latest.current.rowMouseDown(id, e),
                onSelectClick: (e) => latest.current.onHandleClick(id, e),
                update: (updater) => latest.current.updateById(id, updater),
                remove: () => void latest.current.deleteIds([id]),
                insertBefore: () => latest.current.insertBeforeId(id),
            };
            cache.current.set(id, h);
        }
        return h;
    };
}

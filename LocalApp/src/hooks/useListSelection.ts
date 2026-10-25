import { useState } from "react";
import { NO_SELECTION, clearSelection, extendSelection, moveCursor, selectAll, selectOnly, toggleSelected, type ListSelection } from "../domain/listSelection.ts";

/**
 * 並び替え可能な一覧の選択状態（カーソル・範囲選択の起点・選択中の行）と、その操作です。
 * 状態の変え方は domain/listSelection.ts の純粋な関数にあり、ここでは現在の表示順を渡して呼ぶだけにしています。
 *
 * @param orderedIds 表示順の行id
 */
export function useListSelection(orderedIds: number[]) {
    const [selection, setSelection] = useState<ListSelection>(NO_SELECTION);

    return {
        selection,
        /** 選択状態をそのまま差し替える（貼り付け直後など、呼び出し側で組み立てた状態を入れるとき） */
        set: setSelection,
        /** 1行だけを選択する（nullなら選択解除） */
        selectOnly: (id: number | null) => setSelection(selectOnly(id)),
        /** カーソルだけを動かす（選択は変えない） */
        setCursor: (id: number) => setSelection((s) => ({ ...s, cursorId: id })),
        /** 矢印キーでカーソルを動かす */
        move: (dir: -1 | 1, extend: boolean) => setSelection((s) => moveCursor(s, orderedIds, dir, extend)),
        toggle: (id: number) => setSelection((s) => toggleSelected(s, id)),
        /** Shift+クリックの範囲選択。起点もカーソルも無いときは何もせず false を返す */
        extendTo: (id: number): boolean => {
            const next = extendSelection(selection, orderedIds, id);
            if (next) setSelection(next);
            return next !== null;
        },
        selectAll: () => setSelection((s) => selectAll(s, orderedIds)),
        clear: () => setSelection(clearSelection),
    };
}

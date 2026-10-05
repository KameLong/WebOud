import { useEffect, useRef } from "react";
import type { Cursor } from "../domain/types.ts";

/**
 * cursor変化で自動スクロール（rAFでまとめる）。
 * 列を仮想化しているため、カーソルの列がまだ描画されていないときは、列番号から横位置を計算して先にスクロールし、
 * 描画されるのを待ってから縦方向も含めて表示位置を合わせる。
 *
 * @param scrollRootRef スクロール対象コンテナのref
 * @param cursor 現在のカーソル位置。変化するとそのセルが見える位置までスクロールする
 * @param columns 列の仮想化情報。colsRef:列を並べるコンテナ / width:1列の幅(px) / stickyLeft:左に固定表示されている部分の幅(px)
 */
export function useAutoScrollCursor(
    scrollRootRef: React.RefObject<HTMLElement | null>,
    cursor: Cursor,
    columns: { colsRef: React.RefObject<HTMLElement | null>; width: number; stickyLeft: number },
) {
    const rafId = useRef<number | null>(null);
    const { colsRef, width, stickyLeft } = columns;

    useEffect(() => {
        const root = scrollRootRef.current;
        if (!root) return;

        const selector = `[data-r="${cursor.r}"][data-c="${cursor.c}"][data-part="${cursor.part}"]`;

        /** @param retries 列の描画待ちで再試行できる残り回数 */
        const attempt = (retries: number) => {
            const el = root.querySelector(selector) as HTMLElement | null;
            if (el) {
                el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
                return;
            }
            const cols = colsRef.current;
            if (!cols || retries <= 0) return;

            // 未描画の列：横位置を計算して、その列が見える位置までスクロールする
            const colsLeft = cols.getBoundingClientRect().left - root.getBoundingClientRect().left + root.scrollLeft;
            const colLeft = colsLeft + cursor.c * width;
            if (colLeft - stickyLeft < root.scrollLeft) {
                root.scrollLeft = colLeft - stickyLeft;
            } else if (colLeft + width > root.scrollLeft + root.clientWidth) {
                root.scrollLeft = colLeft + width - root.clientWidth;
            }
            rafId.current = requestAnimationFrame(() => attempt(retries - 1));
        };

        if (rafId.current != null) cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(() => attempt(5));

        return () => {
            if (rafId.current != null) cancelAnimationFrame(rafId.current);
        };
    }, [scrollRootRef, cursor, colsRef, width, stickyLeft]);
}

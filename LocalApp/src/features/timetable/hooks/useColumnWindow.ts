import { useCallback, useLayoutEffect, useState } from "react";

/**
 * 横スクロールする固定幅の列のうち、表示範囲（＋前後の余裕）に入る列の範囲を求めます（列の仮想化用）。
 * スクロールとリサイズに追従し、範囲が変わったときだけ再レンダリングを起こします。
 *
 * @param scrollRef スクロールするコンテナのref
 * @param colsRef 列を並べるコンテナのref（先頭列の左端位置の測定に使う）
 * @param count 列の総数
 * @param colWidth 1列の幅(px)。全列で同じ固定幅であること
 * @param active コンテナが描画されているか（falseの間は測定しない）
 * @param overscan 表示範囲の左右に余分に描画する列数
 * @returns 描画する列の範囲 [first, last)
 */
export function useColumnWindow(
    scrollRef: React.RefObject<HTMLElement | null>,
    colsRef: React.RefObject<HTMLElement | null>,
    count: number,
    colWidth: number,
    active: boolean,
    overscan = 8,
) {
    const [range, setRange] = useState({ first: 0, last: 40 });

    const update = useCallback(() => {
        const root = scrollRef.current;
        const cols = colsRef.current;
        if (!root || !cols) return;
        const colsLeft = cols.getBoundingClientRect().left - root.getBoundingClientRect().left + root.scrollLeft;
        const x0 = root.scrollLeft - colsLeft;
        const first = Math.min(count, Math.max(0, Math.floor(x0 / colWidth) - overscan));
        const last = Math.min(count, Math.max(0, Math.ceil((x0 + root.clientWidth) / colWidth) + overscan));
        setRange((prev) => (prev.first === first && prev.last === last ? prev : { first, last }));
    }, [scrollRef, colsRef, count, colWidth, overscan]);

    useLayoutEffect(() => {
        const root = scrollRef.current;
        if (!active || !root) return;
        update();

        let raf = 0;
        const onScroll = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(update);
        };
        root.addEventListener("scroll", onScroll, { passive: true });
        const ro = new ResizeObserver(update);
        ro.observe(root);
        return () => {
            cancelAnimationFrame(raf);
            root.removeEventListener("scroll", onScroll);
            ro.disconnect();
        };
    }, [active, scrollRef, update]);

    return range;
}

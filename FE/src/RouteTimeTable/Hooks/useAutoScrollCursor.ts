import {useEffect, useRef} from "react";
import type {Cursor} from "../domain/types.ts";

/** cursor変化で自動スクロール（rAFでまとめる） */
export function useAutoScrollCursor(scrollRootRef: React.RefObject<HTMLElement|null>, cursor: Cursor) {
    const rafId = useRef<number | null>(null);

    useEffect(() => {
        const root = scrollRootRef.current;
        if (!root) return;

        if (rafId.current != null) cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(() => {
            const selector = `[data-r="${cursor.r}"][data-c="${cursor.c}"][data-part="${cursor.part}"]`;
            const el = root.querySelector(selector) as HTMLElement | null;
            if (!el) return;
            el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
        });

        return () => {
            if (rafId.current != null) cancelAnimationFrame(rafId.current);
        };
    }, [scrollRootRef, cursor]);
}

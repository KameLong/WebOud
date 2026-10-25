import { useEffect, useState } from "react";

/** 指定幅(デフォルト780px、PC/スマホ切り替えの境界と同じ)以下かどうかを監視して返す */
export function useIsMobile(breakpoint = 780): boolean {
    const [isMobile, setIsMobile] = useState(() => window.matchMedia(`(max-width: ${breakpoint}px)`).matches);

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
        const onChange = () => setIsMobile(mql.matches);
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, [breakpoint]);

    return isMobile;
}

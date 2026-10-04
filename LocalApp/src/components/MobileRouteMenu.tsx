import { useRef, useState } from "react";
import { RouteTreeList } from "./RouteTreeList.tsx";

const SWIPE_THRESHOLD = 28;

/**
 * スマホ幅(900px未満)専用のボトムシート型メニュー。
 * 画面下端中央のボタンのクリック、または画面下端からの上方向スワイプで開く。
 * シートを下方向にスワイプ、背景タップ、またはツリー内の項目選択で閉じる。
 * PC幅ではCSS(.mobile-menu-*)側で非表示になる。
 */
export function MobileRouteMenu() {
    const [open, setOpen] = useState(false);
    const touchStartY = useRef<number | null>(null);

    function onEdgeTouchStart(e: React.TouchEvent) {
        touchStartY.current = e.touches[0].clientY;
    }
    function onEdgeTouchMove(e: React.TouchEvent) {
        if (touchStartY.current == null) return;
        const movedUp = touchStartY.current - e.touches[0].clientY;
        if (movedUp > SWIPE_THRESHOLD) {
            setOpen(true);
            touchStartY.current = null;
        }
    }
    function onEdgeTouchEnd() {
        touchStartY.current = null;
    }

    function onSheetTouchStart(e: React.TouchEvent) {
        touchStartY.current = e.touches[0].clientY;
    }
    function onSheetTouchMove(e: React.TouchEvent) {
        if (touchStartY.current == null) return;
        const movedDown = e.touches[0].clientY - touchStartY.current;
        if (movedDown > SWIPE_THRESHOLD) {
            setOpen(false);
            touchStartY.current = null;
        }
    }
    function onSheetTouchEnd() {
        touchStartY.current = null;
    }

    return (
        <>
            {/* 画面下端からの上スワイプでメニューを開くための検知帯(PC幅ではCSSで非表示) */}
            <div className="mobile-menu-edge" onTouchStart={onEdgeTouchStart} onTouchMove={onEdgeTouchMove} onTouchEnd={onEdgeTouchEnd} />

            <button className="mobile-menu-fab" onClick={() => setOpen(true)}>
                ☰ メニュー
            </button>

            <div className={`mobile-menu-scrim ${open ? "open" : ""}`} onClick={() => setOpen(false)} aria-hidden={!open}>
                <div
                    className={`mobile-menu-sheet ${open ? "open" : ""}`}
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={onSheetTouchStart}
                    onTouchMove={onSheetTouchMove}
                    onTouchEnd={onSheetTouchEnd}
                >
                    <div className="mobile-menu-grabber" />
                    <RouteTreeList onNavigate={() => setOpen(false)} />
                </div>
            </div>
        </>
    );
}

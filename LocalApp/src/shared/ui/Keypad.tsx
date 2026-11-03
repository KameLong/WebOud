import type { MouseEvent, ReactNode } from "react";

/** ボタンを押しても、入力欄・グリッドからフォーカスが外れないようにする */
function keepFocus(e: MouseEvent) {
    e.preventDefault();
}

/**
 * 画面下端に固定表示するスマホ用キーパッドの枠。
 * 時刻表のグリッド用・各ダイアログ用のキーパッドはすべてこの枠とKeypadKeyで作り、見た目と配置（6列×4行）を統一する。
 *
 * @param props className:追加のクラス / collapsed:下に隠すか / zIndex:重なり順（ダイアログの上に出すとき用） / children:キー（KeypadKey）
 */
export function Keypad(props: { className?: string; collapsed?: boolean; zIndex?: number; children: ReactNode }) {
    const { className, collapsed, zIndex, children } = props;
    const classes = ["kp-panel", className, collapsed ? "kp-collapsed" : ""].filter(Boolean).join(" ");
    return (
        <div className={classes} aria-hidden={collapsed || undefined} style={zIndex ? { zIndex } : undefined} onPointerDown={(e) => e.stopPropagation()}>
            {children}
        </div>
    );
}

/**
 * キーパッドのキー1つ。
 *
 * @param props label:表示 / onPress:押したとき / title:ツールチップ / disabled:無効 / small:文字を小さくする（「通過」などの文字キー用）
 * / colSpan,rowSpan:マスをまたぐ数 / accent:決定キーなど目立たせる
 */
export function KeypadKey(props: { label: ReactNode; onPress: () => void; title?: string; disabled?: boolean; small?: boolean; colSpan?: number; rowSpan?: number; accent?: boolean }) {
    const { label, onPress, title, disabled, small, colSpan, rowSpan, accent } = props;
    return (
        <button
            type="button"
            className={["kp-key", small ? "kp-key-small" : "", accent ? "kp-key-accent" : ""].filter(Boolean).join(" ")}
            onMouseDown={keepFocus}
            onClick={onPress}
            title={title}
            disabled={disabled}
            style={{ gridColumn: colSpan ? `span ${colSpan}` : undefined, gridRow: rowSpan ? `span ${rowSpan}` : undefined }}
        >
            {label}
        </button>
    );
}

/** キーパッドの空きマス */
export function KeypadBlank(props: { colSpan?: number }) {
    return <div style={props.colSpan ? { gridColumn: `span ${props.colSpan}` } : undefined} />;
}

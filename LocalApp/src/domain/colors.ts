/**
 * "#rrggbb" または "#rgb" 形式の色を、0〜255のRGBに分解します。読み取れない場合はnullを返します。
 *
 * @param color 色（"#rrggbb" / "#rgb"）
 */
export function parseHexColor(color: string): { r: number; g: number; b: number } | null {
    const hex = color.replace("#", "");
    const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
}

/**
 * 背景色の上に載せる文字色（白/黒）を明るさから決めます。
 *
 * @param bg "#rrggbb" または "#rgb" 形式の背景色
 */
export function readableTextColor(bg: string): "#000" | "#fff" {
    const rgb = parseHexColor(bg);
    if (!rgb) return "#fff";
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 > 160 ? "#000" : "#fff";
}

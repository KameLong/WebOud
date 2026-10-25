/**
 * 日本語・中国語の文字（漢字・かな・全角の記号など）を含むか。
 * 含まない文字列（英語など）は、文字の間隔を広げて枠にそろえる「均等割付」をせず、そのままの間隔で表示する。
 *
 * @param text 調べる文字列
 */
export function hasCjk(text: string): boolean {
    return /[　-ヿ㐀-鿿＀-￯]/.test(text);
}

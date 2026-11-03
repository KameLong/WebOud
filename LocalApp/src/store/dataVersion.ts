/**
 * 保存するJSON（ブラウザ内の保存データ、エクスポートしたファイル）のバージョン。
 *
 * バージョンは "メジャー.マイナー" の形式で、JSONの `version` に書く。JSONの要素を追加するたびに上げる。
 *
 * ・マイナーバージョン（1.0 → 1.1 → 1.2 …）：
 *   要素を追加したが、古いデータにその要素が無くても、デフォルト値で暗黙に補える場合。
 *   古いデータをそのまま読める（読むときに、無い要素をデフォルト値で補う）。
 * ・メジャーバージョン（1.x → 2.0 → 3.0 …）：
 *   古いデータを、デフォルト値で暗黙に解決できない場合（要素の意味や形を変えた、削除した、
 *   追加した要素に、古いデータから決められない値が必要、など）。
 *   古いデータは変換が必要になる。このアプリが対応していないメジャーバージョンのデータは読み込まない。
 *
 * バージョンを上げたら、下の DATA_VERSION を更新し、この下に変更の内容を書き足す。
 *
 * 変更の履歴：
 *   1.0  最初のバージョン。
 *        （バージョンの無い、これ以前のデータは 1.0 として扱う。ストアの version が数値の 1 のデータも同じ）
 */
export const DATA_VERSION = "1.0";

const SUPPORTED_MAJOR = 1;

/**
 * JSONの version を、メジャーとマイナーに分けます。version が無い、または数値の 1 のような古い形式は 1.0 として扱います。
 *
 * @param version JSONの version の値
 * @returns メジャーとマイナー。読み取れない形式のときは null
 */
export function parseDataVersion(version: unknown): { major: number; minor: number } | null {
    if (version === undefined) return { major: 1, minor: 0 };
    if (typeof version === "number") return Number.isInteger(version) && version >= 0 ? { major: version, minor: 0 } : null;
    if (typeof version !== "string") return null;
    const m = /^(\d+)(?:\.(\d+))?$/.exec(version);
    return m ? { major: Number(m[1]), minor: Number(m[2] ?? 0) } : null;
}

/**
 * このアプリで読めるバージョンかを返します。メジャーバージョンが同じなら、マイナーバージョンが新しくても読めます
 * （知らない要素は無視する）。
 *
 * @param version JSONの version の値
 */
export function isSupportedDataVersion(version: unknown): boolean {
    return parseDataVersion(version)?.major === SUPPORTED_MAJOR;
}

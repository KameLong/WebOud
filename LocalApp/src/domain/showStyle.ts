/** 駅の1方向分の表示（着/番線/発）の並び */
export type Part = "arr" | "track" | "dep";

/** 駅のshowStyleは方向ごとに4bitずつ持つ（下位4bitが下り、次の4bitが上り）。各4bit内: 1=着 2=番線 4=発（8は予約） */
export const SHOW_STYLE_BITS = 4;
export const SHOW_STYLE_MASK = 0b1111;
/** 着/番線/発のビット */
export const SHOW_ARR = 0b001;
export const SHOW_TRACK = 0b010;
export const SHOW_DEP = 0b100;

/**
 * 駅のshowStyleから、指定方向の4bitを取り出します。
 *
 * @param showStyle 駅のshowStyle（下位4bitが下り、次の4bitが上り）
 * @param direct 0:下り 1:上り
 */
export function getDirectStyle(showStyle: number, direct: number): number {
    return (showStyle >> (direct === 1 ? SHOW_STYLE_BITS : 0)) & SHOW_STYLE_MASK;
}

/**
 * showStyleの指定方向の4bitだけを差し替えた値を返します。
 *
 * @param showStyle 元のshowStyle
 * @param direct 0:下り 1:上り
 * @param bits 新しい4bit値
 */
export function setDirectStyle(showStyle: number, direct: number, bits: number): number {
    const shift = direct === 1 ? SHOW_STYLE_BITS : 0;
    return (showStyle & ~(SHOW_STYLE_MASK << shift)) | ((bits & SHOW_STYLE_MASK) << shift);
}

/**
 * 下り・上りの4bit値からshowStyleを組み立てます。
 *
 * @param down 下りの4bit値
 * @param up 上りの4bit値
 */
export function makeShowStyle(down: number, up: number): number {
    return setDirectStyle(setDirectStyle(0, 0, down), 1, up);
}

/**
 * 1方向分の表示スタイル（4bit）を着/番線/発の真偽値に展開します。
 *
 * @param bits getDirectStyleで取り出した1方向分の4bit値
 */
export function decodeShowStyle(bits: number): { showArr: boolean; showTrack: boolean; showDep: boolean } {
    return {
        showArr: (bits & SHOW_ARR) !== 0,
        showTrack: (bits & SHOW_TRACK) !== 0,
        showDep: (bits & SHOW_DEP) !== 0,
    };
}

/**
 * 表示スタイルから、表示するパート（着/番線/発）を上から順に返します。
 *
 * @param stationShowStyle 駅のshowStyle（全体）
 * @param direct 0:下り 1:上り
 */
export function decodeParts(stationShowStyle: number, direct: number): Part[] {
    const { showArr, showTrack, showDep } = decodeShowStyle(getDirectStyle(stationShowStyle, direct));

    const parts: Part[] = [];
    if (showArr) parts.push("arr");
    if (showTrack) parts.push("track");
    if (showDep) parts.push("dep");
    return parts;
}

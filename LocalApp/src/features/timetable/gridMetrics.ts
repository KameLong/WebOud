import { decodeShowStyle } from "../../domain/showStyle.ts";

/** 文字サイズ14pxのときの、着と発の区切り線の太さ(px)。PDF出力など画面のgridMetricsを使わない箇所の基準 */
export const ARR_BORDER_BOTTOM_WIDTH = 1;

export type GridMetrics = {
    FONT_SIZE: number;
    LINE_HEIGHT: number;
    TRAIN_WIDTH: number;
    /** 時刻表の1列の幅(px)。列の右枠線(THIN_LINE)を含む。列の仮想化で位置計算に使うため、全列で同一の固定幅にすること */
    COLUMN_WIDTH: number;
    STATION_NAME_WIDTH: number;
    /** 細い罫線の太さ(px)。文字サイズに比例する（14pxで1px） */
    THIN_LINE: number;
    /** 太い罫線の太さ(px)。細い罫線の2倍 */
    THICK_LINE: number;
};

/**
 * 設定画面の文字サイズ(px)から、時刻表グリッドで使う寸法一式を計算します。
 *
 * @param fontSize 全体の文字サイズ(px)
 */
export function gridMetrics(fontSize: number): GridMetrics {
    const LINE_HEIGHT = fontSize * 1.25;
    const TRAIN_WIDTH = fontSize * 3;
    // 罫線の太さも文字サイズに連動させる。小数だとにじむので整数に丸める
    const THIN_LINE = Math.max(1, Math.round(fontSize / 14));
    const THICK_LINE = THIN_LINE * 2;
    return {
        FONT_SIZE: fontSize,
        LINE_HEIGHT,
        TRAIN_WIDTH,
        COLUMN_WIDTH: TRAIN_WIDTH + THIN_LINE,
        STATION_NAME_WIDTH: fontSize * 6,
        THIN_LINE,
        THICK_LINE,
    };
}

/**
 * 1駅分のセルの高さ(px)を返します。
 *
 * @param style 1方向分の表示スタイル（getDirectStyleで取り出した4bit値）
 * @param lineHeight 1行分の高さ(px)（gridMetricsのLINE_HEIGHT）
 * @param arrBorder 着と発の間の区切り線の太さ(px)（gridMetricsのTHIN_LINE）
 */
export function cellHeight(style: number, lineHeight: number, arrBorder: number = ARR_BORDER_BOTTOM_WIDTH) {
    const { showArr, showTrack, showDep } = decodeShowStyle(style);
    const lines = Number(showArr) + Number(showTrack) + Number(showDep);
    return lineHeight * lines + (showArr && showDep ? arrBorder : 0);
}

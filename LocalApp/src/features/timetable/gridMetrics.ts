import { decodeShowStyle } from "../../domain/showStyle.ts";

export const ARR_BORDER_BOTTOM_WIDTH = 1;

export type GridMetrics = {
    FONT_SIZE: number;
    LINE_HEIGHT: number;
    TRAIN_WIDTH: number;
    /** 時刻表の1列の幅(px)。列の右枠線(1px)を含む。列の仮想化で位置計算に使うため、全列で同一の固定幅にすること */
    COLUMN_WIDTH: number;
    STATION_NAME_WIDTH: number;
};

/**
 * 設定画面の文字サイズ(px)から、時刻表グリッドで使う寸法一式を計算します。
 *
 * @param fontSize 全体の文字サイズ(px)
 */
export function gridMetrics(fontSize: number): GridMetrics {
    const LINE_HEIGHT = fontSize * 1.25;
    const TRAIN_WIDTH = fontSize * 3;
    return {
        FONT_SIZE: fontSize,
        LINE_HEIGHT,
        TRAIN_WIDTH,
        COLUMN_WIDTH: TRAIN_WIDTH + 1,
        STATION_NAME_WIDTH: fontSize * 6,
    };
}

/**
 * 1駅分のセルの高さ(px)を返します。
 *
 * @param style 1方向分の表示スタイル（getDirectStyleで取り出した4bit値）
 * @param lineHeight 1行分の高さ(px)（gridMetricsのLINE_HEIGHT）
 */
export function cellHeight(style: number, lineHeight: number) {
    const { showArr, showTrack, showDep } = decodeShowStyle(style);
    const lines = Number(showArr) + Number(showTrack) + Number(showDep);
    return lineHeight * lines + (showArr && showDep ? ARR_BORDER_BOTTOM_WIDTH : 0);
}

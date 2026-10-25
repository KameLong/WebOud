import type { StationDto } from "../../../domain/dto.ts";
import { ARR_BORDER_BOTTOM_WIDTH, gridMetrics } from "../gridMetrics.ts";
import { decodeParts, decodeShowStyle, getDirectStyle } from "../../../domain/showStyle.ts";

/** 用紙の向き（A4） */
export type PdfOrientation = "landscape" | "portrait";

/** 用紙の余白(pt) */
export const MARGIN = 20;
/** ページ上部のタイトル行の高さ(pt) */
export const TITLE_H = 20;
/** 画面のpxをPDFのptにする倍率（CSSの1px = 0.75pt。画面と同じ大きさ・同じ比率で描く） */
export const S = 0.75;
/** 罫線の太さ：細線(画面の1px)と太線(画面の2px)。単位はpt */
export const THIN = 1 * S;
export const THICK = 2 * S;

/** A4(pt)。向きに応じて幅と高さを入れ替える */
export function pageSize(orientation: PdfOrientation): { w: number; h: number } {
    return orientation === "portrait" ? { w: 595.28, h: 841.89 } : { w: 841.89, h: 595.28 };
}

/** 駅1つ分の、描画する行（着/番線/発）の並び */
export type StationRows = { station: StationDto; parts: ("arr" | "track" | "dep")[]; showArr: boolean; showDep: boolean };

/** 路線時刻表PDFの寸法と、ページの分け方 */
export type RouteTimetablePlan = {
    pageW: number;
    pageH: number;
    /** 文字サイズ・行の高さ・列の幅（列の右の細線を含む）・駅名の幅・着/番線/発ラベルの幅(いずれもpt) */
    fs: number;
    lineH: number;
    colW: number;
    nameColW: number;
    labelW: number;
    /** 駅名欄の内側の幅と、左右の太い枠を含む幅 */
    stationInnerW: number;
    stationColW: number;
    /** 見出しの高さ（太い下枠を含む）と、列車名欄の高さ */
    headH: number;
    nameRowH: number;
    /** 着と発の間の細線の太さ */
    arrBorder: number;
    /** 駅ごとの行 */
    stationRows: StationRows[];
    /** 1ページに入る列車の列数 */
    colsPerPage: number;
    /** 駅をページごとに分けたまとまり */
    stationChunks: StationRows[][];
    /** 本体（駅の行）に使える高さ */
    availBodyH: number;
    /** 列車の列のページ数 */
    colPages: number;
    /** 全ページ数 */
    totalPages: number;
    /** A4に収まらない部分があるときの理由（空なら、すべて収まる） */
    overflow: string[];
};

/**
 * 駅1つの高さ（画面のcellHeight：行数×行の高さ + 着と発の両方があるときの区切り線1px）を返します。
 *
 * @param r 駅の行
 * @param lineH 1行の高さ(pt)
 */
export function stationHeight(r: StationRows, lineH: number): number {
    return lineH * r.parts.length + (r.showArr && r.showDep ? ARR_BORDER_BOTTOM_WIDTH * S : 0);
}

/**
 * 駅を、高さの合計がmaxHeightを超えない範囲で、ページごとのまとまりに分けます。
 *
 * @param rows 駅ごとの行
 * @param lineH 1行の高さ
 * @param maxHeight 1ページに入る高さ
 */
function chunkStations(rows: StationRows[], lineH: number, maxHeight: number): StationRows[][] {
    const out: StationRows[][] = [[]];
    let h = 0;
    for (const r of rows) {
        const rh = stationHeight(r, lineH);
        if (h + rh > maxHeight && out[out.length - 1].length > 0) {
            out.push([]);
            h = 0;
        }
        out[out.length - 1].push(r);
        h += rh;
    }
    return out;
}

/**
 * 路線時刻表PDFの寸法（画面の寸法を0.75倍したもの）と、A4に収めるためのページの分け方を求めます。
 * 列車の列と駅は、A4に収まるようにページを分けます。1列・1駅ぶんがA4に入らない場合（文字サイズが大きすぎる場合）は、
 * その旨を overflow に入れるので、呼び出し側は文字サイズを小さくするよう案内します。
 *
 * @param stations 駅（その方向の走行順）
 * @param direct 0:下り 1:上り
 * @param tripCount 列車の本数
 * @param fontSize 画面の文字サイズ(px)
 * @param orientation 用紙の向き
 */
export function planRouteTimetable(stations: StationDto[], direct: number, tripCount: number, fontSize: number, orientation: PdfOrientation): RouteTimetablePlan {
    const { w: pageW, h: pageH } = pageSize(orientation);
    const m = gridMetrics(fontSize);
    const fs = m.FONT_SIZE * S;
    const lineH = m.LINE_HEIGHT * S;
    const colW = m.COLUMN_WIDTH * S;
    const nameColW = m.STATION_NAME_WIDTH * S;
    const labelW = m.LINE_HEIGHT * S;
    const stationInnerW = nameColW + labelW;
    const stationColW = stationInnerW + THICK * 2;
    const headH = (m.LINE_HEIGHT * 7 + 2) * S;
    const nameRowH = (m.FONT_SIZE * 4 + 8) * S;
    const arrBorder = ARR_BORDER_BOTTOM_WIDTH * S;

    // 駅ごとの行（着/番線/発）。表示する行が1つも無い駅は、画面と同じく「発」だけ出す
    const stationRows: StationRows[] = stations.map((station) => {
        const parts = decodeParts(station.showStyle, direct);
        const s = decodeShowStyle(getDirectStyle(station.showStyle, direct));
        return { station, parts: parts.length > 0 ? parts : ["dep"], showArr: s.showArr, showDep: s.showDep };
    });

    const frameH = THICK + headH + THICK; // 上の太枠 + 見出し + 下の太枠（本体を除く）
    const availBodyH = pageH - MARGIN * 2 - TITLE_H - frameH;
    const rawCols = Math.floor((pageW - MARGIN * 2 - stationColW) / colW);
    const colsPerPage = Math.max(1, rawCols);
    const stationChunks = chunkStations(stationRows, lineH, availBodyH);
    const colPages = Math.max(1, Math.ceil(tripCount / colsPerPage));

    const overflow: string[] = [];
    if (rawCols < 1) overflow.push("列車の列が1列も用紙の幅に収まりません");
    const tallest = Math.max(0, ...stationRows.map((r) => stationHeight(r, lineH)));
    if (tallest > availBodyH) overflow.push("1駅分の高さが用紙の高さに収まりません");
    if (frameH + TITLE_H + MARGIN * 2 > pageH) overflow.push("見出しが用紙の高さに収まりません");

    return {
        pageW,
        pageH,
        fs,
        lineH,
        colW,
        nameColW,
        labelW,
        stationInnerW,
        stationColW,
        headH,
        nameRowH,
        arrBorder,
        stationRows,
        colsPerPage,
        stationChunks,
        availBodyH,
        colPages,
        totalPages: colPages * stationChunks.length,
        overflow,
    };
}

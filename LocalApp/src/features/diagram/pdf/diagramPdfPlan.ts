import type { DiagramStation } from "../DiagramData.ts";
import { pageSize, type PdfOrientation } from "../../timetable/pdf/routeTimetablePlan.ts";

/** ダイヤグラムは午前3時から翌午前3時までの24時間 */
export const DIAGRAM_START_SECONDS = 3 * 3600;
export const DIAGRAM_SPAN_HOURS = 24;

/** 1mmあたりのpt */
const PT_PER_MM = 72 / 25.4;

/** 余白の初期値(mm) */
export const DEFAULT_MARGIN_MM = 10;
/** 横方向（時間軸）の1ページあたりの時間の初期値（時間） */
export const DEFAULT_HOURS_PER_PAGE = 3;
/** ページ上部のタイトル行と、時刻の目盛りの高さ(pt) */
export const TITLE_H = 16;
export const TIME_HEADER_H = 14;
/** 先頭の駅の線を、描画領域の上端に張り付かせないための余白(pt) */
export const DIAGRAM_PAD = 6;

/**
 * mmをptにします。
 *
 * @param mm ミリメートル
 */
export function mmToPt(mm: number): number {
    return mm * PT_PER_MM;
}

/** ダイヤグラムPDFの設定（ダイアログで指定する値） */
export type DiagramPdfOptions = {
    orientation: PdfOrientation;
    /** 余白(mm) */
    marginMm: number;
    /** 横方向（時間軸）の1ページあたりの時間（時間） */
    hoursPerPage: number;
    /** ダイヤグラムの高さ(mm)。nullなら、用紙の高さいっぱい（縦に分けない） */
    heightMm: number | null;
};

/** ダイヤグラムPDFの寸法と、ページの分け方 */
export type DiagramPdfPlan = {
    pageW: number;
    pageH: number;
    margin: number;
    /** 駅名欄の幅(pt) */
    stationColW: number;
    /** 描画領域（時刻の目盛りと駅名欄を除いた部分）の幅・高さ(pt) */
    plotW: number;
    plotH: number;
    /** ダイヤグラム全体の高さ(pt)（先頭と末尾の余白を除く、先頭の駅から末尾の駅まで） */
    heightPt: number;
    /** 縦軸の縮尺（秒あたりのpt）と、横軸の縮尺（秒あたりのpt） */
    yScale: number;
    xScale: number;
    /** 1ページに入れる時間（時間。1〜24に丸めたもの） */
    hours: number;
    /** 時間方向のページ数と、縦方向のページ数（高さが用紙を超えるとき） */
    pagesX: number;
    slices: number;
    totalPages: number;
    /** 用紙の高さいっぱいに収まる高さ(mm)。高さの初期値 */
    fitHeightMm: number;
    /** 描けないときの理由（空なら描ける） */
    overflow: string[];
};

/**
 * ダイヤグラムPDFの寸法と、ページの分け方を求めます。横は、1ページに入れる時間（初期は3時間）ごとに、午前3時から翌午前3時までを
 * ページに分けます。高さが用紙に入らないときは、縦にもページを分けます。どのページにも、駅名欄と時刻の目盛りを付けます。
 *
 * @param stations 縦位置つきの駅（ダイヤグラムの駅の並び）
 * @param options 用紙の向き・余白・1ページの時間・高さ
 */
export function planDiagramPdf(stations: DiagramStation[], options: DiagramPdfOptions): DiagramPdfPlan {
    const { w: pageW, h: pageH } = pageSize(options.orientation);
    const margin = mmToPt(Math.max(0, options.marginMm));
    const maxNameLen = Math.max(0, ...stations.map((s) => [...s.station.name].length));
    // 駅名は8ptで描く。全角の駅名がおおむね収まる幅（上下限あり）
    const stationColW = Math.min(110, Math.max(40, maxNameLen * 8.5 + 10));
    const plotW = pageW - margin * 2 - stationColW;
    const plotH = pageH - margin * 2 - TITLE_H - TIME_HEADER_H;
    const hours = Math.min(DIAGRAM_SPAN_HOURS, Math.max(1, Math.round(options.hoursPerPage)));

    const first = stations[0]?.stationTime ?? 0;
    const last = stations[stations.length - 1]?.stationTime ?? 0;
    const totalSeconds = Math.max(1, last - first);

    const fitHeightPt = Math.max(0, plotH - DIAGRAM_PAD * 2);
    const heightPt = options.heightMm == null ? fitHeightPt : Math.max(mmToPt(20), mmToPt(options.heightMm));
    const contentH = heightPt + DIAGRAM_PAD * 2;
    const slices = plotH > 0 ? Math.max(1, Math.ceil(contentH / plotH - 1e-9)) : 1;
    const pagesX = Math.ceil(DIAGRAM_SPAN_HOURS / hours);

    const overflow: string[] = [];
    if (plotW < 60) overflow.push("余白が大きすぎて、横の描画領域がありません");
    if (plotH < 60) overflow.push("余白が大きすぎて、縦の描画領域がありません");
    if (stations.length < 2) overflow.push("駅が2つ以上ありません");

    return {
        pageW,
        pageH,
        margin,
        stationColW,
        plotW,
        plotH,
        heightPt,
        yScale: heightPt / totalSeconds,
        hours,
        xScale: plotW / (hours * 3600),
        pagesX,
        slices,
        totalPages: pagesX * slices,
        fitHeightMm: Math.floor(fitHeightPt / PT_PER_MM),
        overflow,
    };
}

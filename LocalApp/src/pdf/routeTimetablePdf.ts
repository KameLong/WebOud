import { PDFDocument } from "pdf-lib";
import { ariTimeStr, depTimeStr } from "../domain/stopTimeText.ts";
import type { StationDto, TrainTypeDto, TripWithStopTimesDto } from "../domain/dto.ts";
import { decodeParts, decodeShowStyle, getDirectStyle } from "../domain/utils.ts";
import type { FontSubsetter } from "./fontSubset.ts";
import { Canvas, embedTextFonts, type PdfFonts } from "./pdfCommon.ts";

/** 路線時刻表PDFの入力（画面の時刻表と同じ内容） */
export type RouteTimetablePdfInput = {
    /** 路線名 */
    routeName: string;
    /** 0:下り 1:上り */
    direct: number;
    /** 駅（その方向の走行順に並べたもの。上りは逆順） */
    stations: StationDto[];
    /** 列車（空の列を除いた、その方向の列車を並び順どおりに） */
    trips: TripWithStopTimesDto[];
    /** 種別ID→種別 */
    trainTypeById: Map<number, TrainTypeDto>;
};

// ---- 用紙・寸法(pt)。A4横 ----
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 20;
/** ページ上部のタイトル行の高さ */
const TITLE_H = 20;
/** 列車の見出し（種別・番号・列車名）1行の高さ */
const HEAD_ROW_H = 12;
/** 列車1列の幅 */
const COL_W = 27;
/** 駅名欄の着/番線/発ラベルの幅 */
const LABEL_W = 14;
/** 1行(着・番線・発の1つ)の高さの上限と下限。下限を下回るときは、駅をページに分ける */
const MAX_LINE_H = 14;
const MIN_LINE_H = 9;
/** 見出しの種別の既定値 */
const FALLBACK_TYPE: TrainTypeDto = { id: 0, name: "", routeID: 0, index: 0, shortName: "", color: "#000000", fontBold: false, lineBold: false, lineStyle: 0 };

/** 駅1つ分の、描画する行（着/番線/発）の並び */
type StationRows = { station: StationDto; parts: ("arr" | "track" | "dep")[]; showArr: boolean; showDep: boolean };

/**
 * 配列を、1つあたりの上限(maxCount)を超えないように分けます。
 *
 * @param items 対象
 * @param maxCount 1つあたりの最大件数
 */
function chunk<T>(items: T[], maxCount: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += maxCount) out.push(items.slice(i, i + maxCount));
    return out.length > 0 ? out : [[]];
}

/**
 * 駅を、行数の合計がmaxLinesを超えない範囲で、ページごとのまとまりに分けます。
 *
 * @param rows 駅ごとの行
 * @param maxLines 1ページに入る行数
 */
function chunkStations(rows: StationRows[], maxLines: number): StationRows[][] {
    const out: StationRows[][] = [[]];
    let lines = 0;
    for (const r of rows) {
        if (lines + r.parts.length > maxLines && out[out.length - 1].length > 0) {
            out.push([]);
            lines = 0;
        }
        out[out.length - 1].push(r);
        lines += r.parts.length;
    }
    return out;
}

/**
 * 路線時刻表（1方向）を、A4横のPDFにします。列車が多いときは、列車の列を何ページかに分けます。
 * どのページにも、駅名欄（駅名と着/番線/発）と、列車の見出し（種別・番号・列車名）を表示します。
 * ブラウザの印刷機能は使わず、日本語フォントを埋め込んだPDFを直接作るので、環境によってレイアウトが変わりません。
 *
 * @param input 路線名・方向・駅・列車
 * @param fonts 埋め込む日本語フォント（標準・太字）
 * @param subset フォントを必要な文字だけに絞る関数
 * @returns PDFファイルの内容
 */
export async function buildRouteTimetablePdf(input: RouteTimetablePdfInput, fonts: PdfFonts, subset: FontSubsetter): Promise<Uint8Array> {
    const { stations, trips, direct } = input;
    const directLabel = direct === 1 ? "上り" : "下り";
    const title = `${input.routeName}　${directLabel}時刻表`;

    const doc = await PDFDocument.create();
    doc.setTitle(title);
    doc.setCreator("WebOud");

    const used = [
        "0123456789:()（）/ -",
        "‥║⇂〇着番線発列車種別番号名ページ時刻表上下り",
        title,
        ...stations.map((s) => s.name),
        ...trips.flatMap((t) => [t.no, t.name]),
        ...[...input.trainTypeById.values()].map((t) => t.shortName),
    ].join("");
    const { regular, bold } = await embedTextFonts(doc, fonts, subset, used);

    // 駅ごとの行（着/番線/発）。表示する行が1つも無い駅は、画面と同じく「発」だけ出す
    const stationRows: StationRows[] = stations.map((station) => {
        const parts = decodeParts(station.showStyle, direct);
        const s = decodeShowStyle(getDirectStyle(station.showStyle, direct));
        return { station, parts: parts.length > 0 ? parts : ["dep"], showArr: s.showArr, showDep: s.showDep };
    });

    // 駅名欄の幅（いちばん長い駅名に合わせる。広がりすぎないよう上限あり）
    const measurer = new Canvas(doc.addPage([PAGE_W, PAGE_H]), regular, bold);
    doc.removePage(0);
    const NAME_FS = 8.5;
    const nameW = Math.min(110, Math.max(48, Math.max(0, ...stations.map((s) => measurer.measure(s.name, NAME_FS))) + 8));
    const stationColW = nameW + LABEL_W;

    const colsPerPage = Math.max(1, Math.floor((PAGE_W - MARGIN * 2 - stationColW) / COL_W));
    const colChunks = chunk(trips, colsPerPage);
    const headH = HEAD_ROW_H * 3;
    const availBodyH = PAGE_H - MARGIN * 2 - TITLE_H - headH;
    const stationChunks = chunkStations(stationRows, Math.max(3, Math.floor(availBodyH / MIN_LINE_H)));

    const totalPages = colChunks.length * stationChunks.length;
    let pageNo = 0;
    for (const cols of colChunks) {
        for (const rows of stationChunks) {
            pageNo++;
            const page = doc.addPage([PAGE_W, PAGE_H]);
            const c = new Canvas(page, regular, bold);

            const left = MARGIN;
            const top = MARGIN;
            const bodyTop = top + TITLE_H + headH;
            const totalLines = rows.reduce((sum, r) => sum + r.parts.length, 0);
            const lineH = Math.min(MAX_LINE_H, availBodyH / Math.max(1, totalLines));
            const bodyH = lineH * totalLines;
            const tableW = stationColW + COL_W * Math.max(1, cols.length);
            const fs = Math.min(9, lineH * 0.72);

            // タイトル行とページ番号
            c.text(title, left, top + TITLE_H / 2 - 2, 12, "#000000", { bold: true });
            c.text(`${pageNo} / ${totalPages} ページ`, PAGE_W - MARGIN, top + TITLE_H / 2 - 2, 9, "#555555", { align: "right" });

            // 列車の見出し（種別略称・番号・列車名）。駅名欄の左上にも項目名を入れる
            const heads = ["列車種別", "列車番号", "列車名"];
            heads.forEach((h, i) => c.text(h, left + 3, top + TITLE_H + HEAD_ROW_H * (i + 0.5), 7.5, "#333333"));
            cols.forEach((trip, ci) => {
                const x = left + stationColW + COL_W * ci;
                const type = input.trainTypeById.get(trip.trainTypeID) ?? FALLBACK_TYPE;
                const cx = x + COL_W / 2;
                const inner = COL_W - 3;
                const bd = type.fontBold;
                c.text(type.shortName, cx, top + TITLE_H + HEAD_ROW_H * 0.5, c.fitSize(type.shortName, 8, inner, 5, bd), type.color, { bold: bd, align: "center" });
                c.text(trip.no, cx, top + TITLE_H + HEAD_ROW_H * 1.5, c.fitSize(trip.no, 8, inner, 5, bd), type.color, { bold: bd, align: "center" });
                c.text(trip.name, cx, top + TITLE_H + HEAD_ROW_H * 2.5, c.fitSize(trip.name, 7, inner, 4.5), "#333333", { align: "center" });
            });

            // 駅名欄（駅名と着/番線/発のラベル）と、各セルの時刻
            let y = bodyTop;
            rows.forEach((r) => {
                const blockH = lineH * r.parts.length;
                const nameSize = c.fitSize(r.station.name, NAME_FS, nameW - 6, 5);
                c.text(r.station.name, left + 3, y + blockH / 2, nameSize, "#000000");

                r.parts.forEach((part, pi) => {
                    const cy = y + lineH * (pi + 0.5);
                    const label = part === "arr" ? "着" : part === "dep" ? "発" : "番線";
                    c.text(label, left + stationColW - 2, cy, Math.min(6.5, lineH * 0.6), "#444444", { align: "right" });
                    if (pi > 0) c.hline(left + nameW, left + tableW, y + lineH * pi, "#888888", 0.3);

                    cols.forEach((trip, ci) => {
                        const st = trip.stopTimesByStationId[r.station.id];
                        const text = part === "arr" ? ariTimeStr(st, r.showArr, r.showDep, false) : part === "dep" ? depTimeStr(st, r.showArr, r.showDep, false) : "";
                        if (!text) return;
                        const type = input.trainTypeById.get(trip.trainTypeID) ?? FALLBACK_TYPE;
                        const x = left + stationColW + COL_W * ci;
                        c.text(text, x + COL_W / 2, cy, fs, type.color, { bold: type.fontBold, align: "center" });
                    });
                });

                y += blockH;
                // 駅と駅の区切り（最後の駅は外枠で兼ねる）
                if (r !== rows[rows.length - 1]) c.hline(left, left + tableW, y, "#000000", 0.6);
            });

            // 縦の罫線（列ごと）と、見出し・外枠
            cols.forEach((_, ci) => c.vline(left + stationColW + COL_W * (ci + 1), top + TITLE_H, bodyTop + bodyH, "#666666", 0.4));
            c.hline(left, left + tableW, top + TITLE_H + HEAD_ROW_H, "#888888", 0.3);
            c.hline(left, left + tableW, top + TITLE_H + HEAD_ROW_H * 2, "#888888", 0.3);
            c.hline(left, left + tableW, bodyTop, "#000000", 1);
            c.vline(left + nameW, bodyTop, bodyTop + bodyH, "#888888", 0.3);
            c.vline(left + stationColW, top + TITLE_H, bodyTop + bodyH, "#000000", 1);
            c.frame(left, top + TITLE_H, tableW, headH + bodyH, "#000000", 1.2);
            if (trips.length === 0) c.text("この方向の列車はありません", left + stationColW + 12, bodyTop + 14, 10, "#666666");
        }
    }

    return doc.save();
}

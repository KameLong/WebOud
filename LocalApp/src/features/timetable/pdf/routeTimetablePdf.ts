import { FALLBACK_TRAIN_TYPE } from "../../../domain/defaults.ts";
import { ariTimeStr, depTimeStr } from "../../../domain/stopTimeText.ts";
import type { StationDto, TrainTypeDto, TripWithStopTimesDto } from "../../../domain/dto.ts";
import { gridMetrics } from "../gridMetrics.ts";
import type { FontSubsetter } from "../../../shared/pdf/fontSubset.ts";
import { Canvas, createPdfDocument, type PdfFonts } from "../../../shared/pdf/pdfCommon.ts";
import { MARGIN, planRouteTimetable, S, stationHeight, THICK, THIN, TITLE_H, type PdfOrientation, type RouteTimetablePlan, type StationRows } from "./routeTimetablePlan.ts";
import { translate } from "./../messages.ts";
import { commonT } from "../../../shared/i18n/common.ts";
import { translate as pdfTranslate } from "../../../shared/pdf/messages.ts";

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
    /** 画面の文字サイズ(px)。画面と同じ比率の寸法・罫線の太さで描くために使う（省略時は14） */
    fontSize?: number;
    /** 用紙の向き（A4。省略時は横） */
    orientation?: PdfOrientation;
};

/** 罫線の色（画面の#333） */
const LINE_COLOR = "#333333";

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

/** 1ページ分の描画に共通の値 */
type PageCtx = {
    c: Canvas;
    input: RouteTimetablePdfInput;
    plan: RouteTimetablePlan;
    /** 画面の寸法(px) */
    m: ReturnType<typeof gridMetrics>;
    /** このページの列車の列と、駅の行 */
    cols: TripWithStopTimesDto[];
    rows: StationRows[];
    /** 表の左端・上端、見出しの上端、本体の上端、表の下端、列車の列の左端(pt) */
    left: number;
    top: number;
    headTop: number;
    bodyTop: number;
    tableBottom: number;
    cellsLeft: number;
};

/**
 * 列車の種別（無ければ既定の種別）を返します。
 *
 * @param input 入力
 * @param trip 列車
 */
function typeOf(input: RouteTimetablePdfInput, trip: TripWithStopTimesDto): TrainTypeDto {
    return input.trainTypeById.get(trip.trainTypeID) ?? FALLBACK_TRAIN_TYPE;
}

/**
 * 駅名欄の左上（列車種別/列車番号の項目名）。背景は画面と同じ薄い灰色。
 *
 * @param p ページの値
 */
function drawCorner({ c, plan, m, left, headTop }: PageCtx) {
    const cm = commonT().t;
    const { fs, lineH, stationInnerW, headH } = plan;
    c.rect(left + THICK, headTop, stationInnerW, headH, "#fafafa");
    const justifyW = stationInnerW - m.FONT_SIZE * 0.4 * S;
    const justifyX = left + THICK + m.FONT_SIZE * 0.2 * S;
    c.justifiedText(cm("trainType"), justifyX, headTop + lineH / 2, justifyW, fs);
    c.justifiedText(cm("trainNo"), justifyX, headTop + lineH + THIN + lineH / 2, justifyW, fs);
}

/**
 * 列車の見出し（種別略称・番号・縦書きの列車名）。
 *
 * @param p ページの値
 */
function drawTrainHeaders({ c, input, plan, m, cols, headTop, cellsLeft }: PageCtx) {
    const { fs, lineH, colW, nameRowH } = plan;
    const typeRowY = headTop + lineH / 2;
    const noRowY = headTop + lineH + THIN + lineH / 2;
    const nameRowTop = headTop + lineH + THIN + lineH + THICK;
    cols.forEach((trip, ci) => {
        const x = cellsLeft + colW * ci;
        const cx = x + (colW - THIN) / 2;
        const type = typeOf(input, trip);
        const inner = colW - THIN - 2;
        c.text(type.shortName, cx, typeRowY, c.fitSize(type.shortName, fs, inner, fs * 0.5, false), type.color, { align: "center" });
        c.text(trip.no, cx, noRowY, c.fitSize(trip.no, fs, inner, fs * 0.5, false), type.color, { align: "center" });
        // 列車名は縦書き。1列に4文字、最大2列（右の列から）。収まらない分は切り詰める
        const chars = [...(trip.name ?? "")].slice(0, 8);
        const colCount = Math.ceil(chars.length / 4);
        const vcw = Math.ceil(m.FONT_SIZE * 1.2) * S; // 縦書き1列の幅
        const textTop = nameRowTop + (nameRowH - (m.FONT_SIZE * 4 + 2) * S) / 2;
        chars.forEach((ch, k) => {
            const colIdx = Math.floor(k / 4);
            const rowIdx = k % 4;
            const cxChar = cx + (colCount * vcw) / 2 - vcw / 2 - colIdx * vcw;
            // 縦書きでは、長音「ー」は縦棒にする
            c.text(ch === "ー" ? "｜" : ch, cxChar, textTop + fs * (rowIdx + 0.5), fs, type.color, { align: "center" });
        });
    });
}

/**
 * 本体：駅名欄（駅名と着/番線/発）と、各セルの時刻。
 *
 * @param p ページの値
 */
function drawBody({ c, input, plan, m, cols, rows, left, bodyTop, cellsLeft }: PageCtx) {
    const cm = commonT().t;
    const { fs, lineH, colW, nameColW, labelW, stationInnerW, arrBorder } = plan;
    let y = bodyTop;
    for (const r of rows) {
        const blockH = stationHeight(r, lineH);
        // 駅名は、画面のFitTextX（均等割付）と同じ。駅名の幅は駅名欄の幅から、ラベル欄との間隔(0.5文字)を引いたもの
        const nameW = nameColW - m.FONT_SIZE * 0.5 * S - m.FONT_SIZE * 0.4 * S;
        c.justifiedText(r.station.name, left + THICK + m.FONT_SIZE * 0.2 * S, y + blockH / 2, nameW, fs);

        let py = y;
        r.parts.forEach((part, pi) => {
            const ph = lineH + (part === "arr" && r.showArr && r.showDep ? arrBorder : 0);
            const cy = py + lineH / 2;
            const label = cm(part === "arr" ? "arr" : part === "dep" ? "dep" : "track");
            c.text(label, left + THICK + stationInnerW - labelW / 2, cy, c.fitSize(label, fs, labelW, fs * 0.5), "#000000", { align: "center" });
            // 番線を表示する駅では、駅名欄の行の間に薄い灰色の区切り線（画面の#ddd）
            if (pi > 0 && r.parts.includes("track")) c.rect(left + THICK + nameColW, py, labelW, THIN, "#dddddd");

            cols.forEach((trip, ci) => {
                const st = trip.stopTimesByStationId[r.station.id];
                const text = part === "arr" ? ariTimeStr(st, r.showArr, r.showDep, false) : part === "dep" ? depTimeStr(st, r.showArr, r.showDep, false) : "";
                if (!text) return;
                // 時刻の数字は、画面と同じDiaProで描く（画面では太字にしない）
                c.text(text, cellsLeft + colW * ci + (colW - THIN) / 2, cy, fs, typeOf(input, trip).color, { dia: true, align: "center" });
            });
            // 着と発の両方があるとき、着の下に黒い細線（時刻のセル側だけ）
            if (part === "arr" && r.showArr && r.showDep) c.rect(cellsLeft, py + lineH, colW * Math.max(1, cols.length), arrBorder, "#000000");
            py += ph;
        });
        y += blockH;
    }
}

/**
 * 罫線（画面と同じ：列の右は細線、見出しの区切りと外枠は太線）。
 *
 * @param p ページの値
 */
function drawRules({ c, plan, cols, left, top, headTop, bodyTop, tableBottom, cellsLeft }: PageCtx) {
    const { lineH, colW, stationColW } = plan;
    const tableW = stationColW + colW * Math.max(1, cols.length);
    cols.forEach((_, ci) => c.rect(cellsLeft + colW * (ci + 1) - THIN, top, THIN, tableBottom - top, LINE_COLOR));
    c.rect(left, headTop + lineH, tableW, THIN, LINE_COLOR); // 種別の下（細線）
    c.rect(left, headTop + lineH + THIN + lineH, tableW, THICK, LINE_COLOR); // 番号の下（太線）
    c.rect(left, bodyTop - THICK, tableW, THICK, LINE_COLOR); // 見出しの下（太線）
    c.rect(left, top, tableW, THICK, LINE_COLOR); // 上の外枠
    c.rect(left, tableBottom - THICK, tableW, THICK, LINE_COLOR); // 下の外枠
    c.rect(left, top, THICK, tableBottom - top, LINE_COLOR); // 左の外枠
    c.rect(left + stationColW - THICK, top, THICK, tableBottom - top, LINE_COLOR); // 駅名欄の右（太線）
}

/**
 * 路線時刻表（1方向）を、A4のPDFにします。画面の時刻表と同じ寸法・同じ比率の罫線で描き（文字サイズの設定に合わせて拡大縮小）、
 * 列車や駅が多いときは、A4に収まるようにページを分けます。どのページにも、駅名欄と、列車の見出し（種別・番号・列車名）を表示します。
 * ブラウザの印刷機能は使わず、日本語フォントを埋め込んだPDFを直接作るので、環境によってレイアウトが変わりません。
 *
 * @param input 路線名・方向・駅・列車・文字サイズ・用紙の向き
 * @param fonts 埋め込むフォント（日本語フォント・DiaPro）
 * @param subset フォントを必要な文字だけに絞る関数
 * @returns PDFファイルの内容
 */
export async function buildRouteTimetablePdf(input: RouteTimetablePdfInput, fonts: PdfFonts, subset: FontSubsetter): Promise<Uint8Array> {
    const { stations, trips, direct } = input;
    const { t, allText } = translate();
    const cm = commonT().t;
    const title = t("pdfTitle", { route: input.routeName, direction: cm(direct === 1 ? "up" : "down") });

    // 画面（StationSidebar / TrainColumn / TrainHeader / StopCell）と同じ寸法。単位はpt
    const fontSizePx = input.fontSize ?? 14;
    const m = gridMetrics(fontSizePx);
    const plan = planRouteTimetable(stations, direct, trips.length, fontSizePx, input.orientation ?? "landscape");
    const { pageW, pageH, lineH, stationColW, headH, colsPerPage, stationChunks, totalPages } = plan;

    const used = [
        "0123456789:()（）/ -",
        "‥║⇂〇｜",
        allText(),
        commonT().allText(),
        pdfTranslate().allText(),
        title,
        ...stations.map((s) => s.name),
        ...trips.flatMap((t) => [t.no, t.name]),
        ...[...input.trainTypeById.values()].map((t) => t.shortName),
    ].join("");
    const { doc, textFonts } = await createPdfDocument(title, fonts, subset, used);

    let pageNo = 0;
    for (const cols of chunk(trips, colsPerPage)) {
        for (const rows of stationChunks) {
            pageNo++;
            const c = new Canvas(doc.addPage([pageW, pageH]), textFonts);
            const top = MARGIN + TITLE_H;
            const headTop = top + THICK; // 見出しの上端（上の太枠の下）
            const bodyTop = headTop + headH;
            const bodyH = rows.reduce((sum, r) => sum + stationHeight(r, lineH), 0);
            const p: PageCtx = { c, input, plan, m, cols, rows, left: MARGIN, top, headTop, bodyTop, tableBottom: bodyTop + bodyH + THICK, cellsLeft: MARGIN + stationColW };

            // タイトル行とページ番号
            c.text(title, MARGIN, MARGIN + TITLE_H / 2 - 2, 12, "#000000", { bold: true });
            c.text(pdfTranslate().t("pageOf", { page: pageNo, total: totalPages }), pageW - MARGIN, MARGIN + TITLE_H / 2 - 2, 9, "#555555", { align: "right" });

            drawCorner(p);
            drawTrainHeaders(p);
            drawBody(p);
            drawRules(p);
            if (trips.length === 0) c.text(t("pdfNoTrains"), p.cellsLeft + 12, bodyTop + 14, 10, "#666666");
        }
    }

    return doc.save();
}

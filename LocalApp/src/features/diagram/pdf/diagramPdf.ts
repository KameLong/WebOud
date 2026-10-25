import type { DiagramStation } from "../DiagramData.ts";
import type { DiagramLine } from "../DiagramCanvas.ts";
import type { FontSubsetter } from "../../../shared/pdf/fontSubset.ts";
import { Canvas, createPdfDocument, type PdfFonts } from "../../../shared/pdf/pdfCommon.ts";
import {
    DEFAULT_HOURS_PER_PAGE,
    DEFAULT_MARGIN_MM,
    DIAGRAM_PAD,
    DIAGRAM_SPAN_HOURS,
    DIAGRAM_START_SECONDS,
    planDiagramPdf,
    TIME_HEADER_H,
    TITLE_H,
    type DiagramPdfOptions,
    type DiagramPdfPlan,
} from "./diagramPdfPlan.ts";
import { translate } from "../messages.ts";
import { translate as pdfTranslate } from "../../../shared/pdf/messages.ts";

/** ダイヤグラムPDFの入力（画面のダイヤグラムと同じ内容） */
export type DiagramPdfInput = {
    /** 路線名 */
    routeName: string;
    /** 縦位置つきの駅 */
    stations: DiagramStation[];
    /** 下り・上りの運行線（点は、x=0:00からの秒（3時より前は翌日扱い）、y=駅の縦位置） */
    downLines: DiagramLine[];
    upLines: DiagramLine[];
    /** 用紙の向き・余白・1ページの時間・高さ（省略時は、横・余白10mm・3時間・用紙の高さいっぱい） */
    options?: Partial<DiagramPdfOptions>;
};

/** 縦線の色（画面と同じ灰色） */
const GRID_COLOR = "#aaaaaa";
/** 駅の横線の色 */
const STATION_LINE_COLOR = "#808080";
/** 画面の1px = 0.75pt。運行線の太さは、画面と同じ比率（通常1px、線太は2.5px） */
const PX = 0.75;
const LINE_WIDTH = 1 * PX;
const BOLD_LINE_WIDTH = 2.5 * PX;
/** 時刻の目盛りを置く間隔の候補(秒)。目盛り同士が最低このptあくものを選ぶ */
const LABEL_STEPS = [300, 600, 900, 1200, 1800, 3600];
const LABEL_MIN_GAP = 28;
/** 列車番号の文字サイズと、線からの距離・線の始点からの距離(pt) */
const NUMBER_SIZE = 6.5;
const NUMBER_OFFSET = 2;
const NUMBER_INSET = 1.5;

/**
 * 秒を「h:mm」にします（24時を超える時刻は24を引く）。
 *
 * @param seconds 0:00からの秒
 */
function hm(seconds: number): string {
    const h = Math.floor(seconds / 3600) % 24;
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}:${m.toString().padStart(2, "0")}`;
}

/** 1ページ分の描画に必要な、ページごとに決まる値 */
type PageView = {
    /** このページが表す時間帯(秒) */
    t0: number;
    t1: number;
    /** 時刻(秒)・駅の縦位置を、このページ上の座標にする */
    xOf: (t: number) => number;
    yOf: (y: number) => number;
};

/**
 * 運行線の描画（折れ線と、列車番号）。
 *
 * @param c 描画先
 * @param view このページの値
 * @param plan 寸法
 * @param line 運行線
 */
function drawTrainLine(c: Canvas, view: PageView, plan: DiagramPdfPlan, line: DiagramLine) {
    const { t0, t1, xOf, yOf } = view;
    if (line.points.length < 2) return;
    const xs = line.points.map((p) => p.x);
    if (Math.max(...xs) < t0 || Math.min(...xs) > t1) return; // このページの時間帯に入らない列車は省く
    c.polyline(
        line.points.map((p) => ({ x: xOf(p.x), y: yOf(p.y) })),
        line.color,
        line.bold ? BOLD_LINE_WIDTH : LINE_WIDTH,
    );

    // 列車番号は、駅間（縦位置が変わる区間）のうち、このページの時間帯に入る最初の線分に沿って、傾きに合わせて描く
    const seg = line.points.findIndex((p, i) => {
        const q = line.points[i + 1];
        return !!q && q.y !== p.y && Math.max(p.x, q.x) > t0 && Math.min(p.x, q.x) < t1;
    });
    if (seg < 0 || !line.number) return;
    const p = line.points[seg];
    const q = line.points[seg + 1];
    // 線分のうち、このページに入る部分の始点（ページの端から少し内側）
    const startX = Math.max(p.x, t0 + 20 / plan.xScale);
    const ratio = q.x === p.x ? 0 : (startX - p.x) / (q.x - p.x);
    const sx = xOf(startX);
    const sy = yOf(p.y + (q.y - p.y) * ratio);
    const angle = Math.atan2(yOf(q.y) - yOf(p.y), xOf(q.x) - xOf(p.x));
    // 線に重ならないよう、線の少し上（傾いた向きでの上側）に置く
    c.rotatedText(line.number, sx + NUMBER_INSET + Math.sin(angle) * NUMBER_OFFSET, sy - Math.cos(angle) * NUMBER_OFFSET, NUMBER_SIZE, line.color, angle, { dia: true });
}

/**
 * ダイヤグラムをPDFにします。横（時間軸）は、1ページに入れる時間（初期は3時間）ごとに、午前3時から翌午前3時までを複数ページに分け、
 * 高さが用紙に入らないときは縦にも分けます。どのページにも、駅名欄と時刻の目盛りを付けます。
 * ブラウザの印刷機能は使わず、日本語フォントを埋め込んだPDFを直接作るので、環境によってレイアウトが変わりません。
 *
 * @param input 路線名・駅・運行線・設定
 * @param fonts 埋め込むフォント（日本語フォント・DiaPro）
 * @param subset フォントを必要な文字だけに絞る関数
 * @returns PDFファイルの内容
 */
export async function buildDiagramPdf(input: DiagramPdfInput, fonts: PdfFonts, subset: FontSubsetter): Promise<Uint8Array> {
    const options: DiagramPdfOptions = {
        orientation: input.options?.orientation ?? "landscape",
        marginMm: input.options?.marginMm ?? DEFAULT_MARGIN_MM,
        hoursPerPage: input.options?.hoursPerPage ?? DEFAULT_HOURS_PER_PAGE,
        heightMm: input.options?.heightMm ?? null,
    };
    const { stations } = input;
    const plan = planDiagramPdf(stations, options);
    const { pageW, pageH, margin, stationColW, plotW, plotH, yScale, xScale, hours, pagesX, slices, totalPages } = plan;
    const { t, allText } = translate();
    const pdfT = pdfTranslate().t;
    const title = t("pdfTitle", { route: input.routeName });
    const firstTime = stations[0]?.stationTime ?? 0;
    const lastTime = stations[stations.length - 1]?.stationTime ?? firstTime;
    const allLines = [...input.downLines, ...input.upLines];

    const used = ["0123456789:()（）/ -", allText(), pdfTranslate().allText(), title, ...stations.map((s) => s.station.name), ...allLines.map((l) => l.number)].join("");
    const { doc, textFonts } = await createPdfDocument(title, fonts, subset, used);

    const labelStep = LABEL_STEPS.find((step) => step * xScale >= LABEL_MIN_GAP) ?? 3600;
    const plotX = margin + stationColW;
    const plotY = margin + TITLE_H + TIME_HEADER_H;

    let pageNo = 0;
    for (let px = 0; px < pagesX; px++) {
        const t0 = DIAGRAM_START_SECONDS + px * hours * 3600;
        const t1 = Math.min(t0 + hours * 3600, DIAGRAM_START_SECONDS + DIAGRAM_SPAN_HOURS * 3600);
        for (let slice = 0; slice < slices; slice++) {
            pageNo++;
            const c = new Canvas(doc.addPage([pageW, pageH]), textFonts);
            const xOf = (t: number) => plotX + (t - t0) * xScale;
            // 縦に分けたときは、ページごとに縦位置をずらす
            const yOf = (y: number) => plotY + DIAGRAM_PAD + (y - firstTime) * yScale - slice * plotH;
            const view: PageView = { t0, t1, xOf, yOf };
            const topY = Math.max(plotY, yOf(firstTime));
            const bottomY = Math.min(plotY + plotH, yOf(lastTime));

            // タイトル行とページ番号（時間の範囲つき）
            c.text(title, margin, margin + TITLE_H / 2, 11, "#000000", { bold: true });
            const sliceNote = slices > 1 ? t("pdfSliceNote", { n: slice + 1, total: slices }) : "";
            c.text(`${hm(t0)}-${hm(t1)}${sliceNote}  ${pdfT("pageOf", { page: pageNo, total: totalPages })}`, pageW - margin, margin + TITLE_H / 2, 9, "#555555", { align: "right" });

            // 時刻の目盛り（上端）
            for (let t = Math.ceil(t0 / labelStep) * labelStep; t <= t1; t += labelStep) {
                c.text(hm(t), xOf(t), plotY - TIME_HEADER_H / 2, 8, "#666666", { dia: true, align: "center" });
            }

            // 描画領域（はみ出した線は切る）
            c.clipped(plotX, plotY, plotW, plotH, () => {
                // 縦線：10分ごと（細）・30分（中）・1時間（太）
                for (let t = Math.ceil(t0 / 600) * 600; t <= t1; t += 600) {
                    const min = Math.floor((t % 3600) / 60);
                    if (min !== 0 && min !== 30 && 600 * xScale < 8) continue; // 細すぎるときは10分線を省く
                    c.line(xOf(t), topY, xOf(t), bottomY, GRID_COLOR, min === 0 ? 1.2 : min === 30 ? 0.6 : 0.3);
                }
                for (const st of stations) c.line(plotX, yOf(st.stationTime), plotX + plotW, yOf(st.stationTime), STATION_LINE_COLOR, 0.6);
                for (const line of allLines) drawTrainLine(c, view, plan, line);
            });

            // 駅名欄（駅の横線と駅名）。どのページにも付ける
            for (const st of stations) {
                const y = yOf(st.stationTime);
                if (y < plotY - 6 || y > plotY + plotH + 2) continue;
                c.line(margin, y, plotX, y, STATION_LINE_COLOR, 0.6);
                c.text(st.station.name, margin + 2, y - 5, 8, "#000000", { align: "left" });
            }
            // 駅名欄と描画領域の境界線
            c.line(plotX, topY, plotX, bottomY, "#303030", 1.2);
        }
    }

    return doc.save();
}

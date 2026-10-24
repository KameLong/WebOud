import { PDFDocument } from "pdf-lib";
import { readableTextColor } from "../domain/colors.ts";
import type { TrainTypeDto } from "../domain/dto.ts";
import type { FontSubsetter } from "./fontSubset.ts";
import { Canvas, embedTextFonts, type PdfFonts } from "./pdfCommon.ts";
import { collectDestinations, collectTrainTypes, type StationTimetableHour } from "../hooks/useStationTimetable.ts";

/** 駅時刻表PDFの入力（画面の1方向分の表と同じ内容） */
export type { PdfFonts } from "./pdfCommon.ts";

export type StationTimetablePdfInput = {
    /** 駅名 */
    stationName: string;
    /** 方面の駅名 */
    towards: string;
    /** 時間帯ごとの発車時刻（3時始まり・翌2時終わりの24行） */
    hours: StationTimetableHour[];
    /** 文字のみで表す基準種別のID */
    baseTypeId: number;
};

// ---- 用紙・配色（画面の駅時刻表に合わせる）----
/** A4縦(pt) */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
/** 用紙の余白(8mm) */
const MARGIN = 22.68;
/** 外枠・見出し帯の色 */
const BRAND = "#0a72be";
/** 時の数字セルの色 */
const HOUR_CELL = "#06406e";
/** 偶数行の背景 */
const STRIPE = "#e4e4e4";
/** 見出し帯の高さ */
const HEAD_H = 34;
/** 時の数字セルの幅 */
const HOUR_W = 36;
/** 外枠の太さ（画面の3px = 2.25pt） */
const BORDER_W = 2.25;

/** 時刻の印の大きさの候補（大きい順）。最も混み合う行が1行に収まる最大のものを全行で使う */
const BADGE_SIZES = [
    { fs: 12, w: 24, gap: 4 },
    { fs: 10.5, w: 21, gap: 3 },
    { fs: 9, w: 18.5, gap: 2 },
];

/**
 * 時刻の印（種別色で塗った四角＋分）または色付き文字（基準種別）を描く。
 *
 * @param c 描画先
 * @param x 左端
 * @param cy 縦の中心
 * @param size 印の大きさ（文字サイズ・幅）
 * @param trainType 列車種別
 * @param plain 文字のみ（基準種別）か
 * @param label 表示する文字
 */
function drawBadge(c: Canvas, x: number, cy: number, size: { fs: number; w: number }, trainType: TrainTypeDto, plain: boolean, label: string) {
    const h = size.fs + 4;
    if (!plain) c.rect(x, cy - h / 2, size.w, h, trainType.color);
    // 時刻（分）の数字は、画面と同じDiaProで描く
    c.text(label, x + size.w / 2, cy, size.fs, plain ? trainType.color : readableTextColor(trainType.color), { bold: trainType.fontBold || !plain, dia: true, align: "center" });
}

/** 凡例の項目（横に並べ、幅が足りなければ折り返す） */
type LegendItem = { width: number; draw: (c: Canvas, x: number, cy: number) => void };

/**
 * 凡例の項目を、指定幅で折り返しながら並べたときの行（各行の項目と開始位置）を求めます。
 *
 * @param items 項目
 * @param maxWidth 1行の最大幅
 * @param gap 項目の間隔
 */
function flowLines(items: LegendItem[], maxWidth: number, gap: number): { item: LegendItem; x: number }[][] {
    const lines: { item: LegendItem; x: number }[][] = [[]];
    let x = 0;
    for (const item of items) {
        if (x > 0 && x + item.width > maxWidth) {
            lines.push([]);
            x = 0;
        }
        lines[lines.length - 1].push({ item, x });
        x += item.width + gap;
    }
    return lines;
}

/**
 * PDFに描く可能性のある文字を、すべて集めます（フォントをこの文字だけに絞るため）。
 *
 * @param input 駅時刻表の入力
 * @param stationLabel 「駅」を補った駅名
 */
function collectUsedText(input: StationTimetablePdfInput, stationLabel: string): string {
    const parts = ["0123456789()（）:/ -", "発車時刻表方面種別行先印ゆき記号この駅が始発終着のため到着時刻を表示（名称未設定）", "➡▲●", stationLabel, input.towards];
    for (const t of collectTrainTypes([input.hours])) parts.push(t.name);
    for (const d of collectDestinations([input.hours])) parts.push(d.char, d.name);
    for (const h of input.hours) for (const e of h.entries) parts.push(e.destChar);
    return parts.join("");
}

/**
 * 1方向分の駅時刻表を、A4縦1枚のPDFにします。
 * 画面の表と同じ内容（見出し帯・時の列・種別色の印・始発/終着の記号・凡例）を、用紙の大きさに合わせて描きます。
 * ブラウザの印刷機能を使わず、日本語フォントを埋め込んだPDFファイルを直接作るので、環境によってレイアウトが変わりません。
 *
 * @param input 駅名・方面・時間帯ごとの発車時刻・基準種別
 * @param fonts 埋め込む日本語フォント（標準・太字）
 * @param subset フォントを必要な文字だけに絞る関数（PDFが小さくなる。pdf-lib自身のサブセット化は文字が欠けるため使わない）
 * @returns PDFファイルの内容
 */
export async function buildStationTimetablePdf(input: StationTimetablePdfInput, fonts: PdfFonts, subset: FontSubsetter): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const stationLabel = input.stationName.endsWith("駅") ? input.stationName : `${input.stationName}駅`;
    doc.setTitle(`${stationLabel}発 ${input.towards}方面 発車時刻表`);
    doc.setCreator("WebOud");

    // このPDFで使う文字だけに絞ったフォントを埋め込む
    const used = collectUsedText(input, stationLabel);
    const textFonts = await embedTextFonts(doc, fonts, subset, used);

    const page = doc.addPage([PAGE_W, PAGE_H]);
    const c = new Canvas(page, textFonts);

    const sheetX = MARGIN;
    const sheetY = MARGIN;
    const sheetW = PAGE_W - MARGIN * 2;
    const sheetH = PAGE_H - MARGIN * 2;
    c.rect(sheetX, sheetY, sheetW, sheetH, "#ffffff");

    // ---- 見出し帯 ----
    c.rect(sheetX, sheetY, sheetW, HEAD_H, BRAND);
    const headTitle = `${stationLabel}発 ➡ ${input.towards}方面`;
    const headRight = "発車時刻表";
    const headRightW = c.measure(headRight, 13, true);
    // 右の「発車時刻表」と重ならないよう、長い見出しは文字サイズを小さくして収める
    const headMaxW = sheetW - 12 - 12 - headRightW - 12;
    const headSize = Math.max(9, Math.min(17, (17 * headMaxW) / c.measure(headTitle, 17, true)));
    c.text(headTitle, sheetX + 12, sheetY + HEAD_H / 2, headSize, "#ffffff", { bold: true });
    c.text(headRight, sheetX + sheetW - 12, sheetY + HEAD_H / 2, 13, "#ffffff", { bold: true, align: "right" });

    // ---- 凡例（高さを先に決める）----
    const trainTypes = collectTrainTypes([input.hours]);
    const destinations = collectDestinations([input.hours]);
    const LEGEND_FS = 8.5;
    const LEGEND_PITCH = 13;
    const legendTitleW = 34;
    const legendLeft = sheetX + 10;
    const legendItemsX = legendLeft + legendTitleW + 8;
    const legendMaxW = sheetX + sheetW - 10 - legendItemsX;
    const BADGE_LEGEND = { fs: 8, w: 18 };

    const legendRows: { title: string; items: LegendItem[] }[] = [];
    if (trainTypes.length > 0) {
        legendRows.push({
            title: "種別",
            items: [...trainTypes].reverse().map((t) => {
                const name = t.name || "（名称未設定）";
                return {
                    width: BADGE_LEGEND.w + 4 + c.measure(name, LEGEND_FS),
                    draw: (cv, x, cy) => {
                        drawBadge(cv, x, cy, BADGE_LEGEND, t, t.id === input.baseTypeId, "00");
                        cv.text(name, x + BADGE_LEGEND.w + 4, cy, LEGEND_FS, "#000000");
                    },
                };
            }),
        });
        if (destinations.length > 0) {
            legendRows.push({
                title: "行先",
                items: destinations.map((d) => {
                    const head = `${d.char}`;
                    const rest = `印 ${d.name}ゆき`;
                    const hw = c.measure(head, LEGEND_FS, true);
                    return {
                        width: hw + c.measure(rest, LEGEND_FS),
                        draw: (cv, x, cy) => {
                            cv.text(head, x, cy, LEGEND_FS, "#000000", { bold: true });
                            cv.text(rest, x + hw, cy, LEGEND_FS, "#000000");
                        },
                    };
                }),
            });
        }
        const symbols = ["● この駅が始発", "▲ この駅が終着", "(00) 終着のため到着時刻を表示"];
        legendRows.push({
            title: "記号",
            items: symbols.map((s) => ({ width: c.measure(s, LEGEND_FS), draw: (cv, x, cy) => cv.text(s, x, cy, LEGEND_FS, "#000000") })),
        });
    }
    const legendLines = legendRows.map((r) => flowLines(r.items, legendMaxW, 12));
    const legendPad = 6;
    const legendRowGap = 3;
    const legendH = legendRows.length === 0 ? 0 : legendPad * 2 + legendLines.reduce((sum, ls) => sum + ls.length * LEGEND_PITCH, 0) + legendRowGap * (legendRows.length - 1);
    const legendTop = sheetY + sheetH - legendH;

    // ---- 時間帯ごとの行 ----
    const bodyTop = sheetY + HEAD_H;
    const bodyH = legendTop - bodyTop;
    const hasAnyTrain = input.hours.some((h) => h.entries.length > 0);

    if (!hasAnyTrain) {
        c.text("この駅に停車する列車はありません", sheetX + 16, bodyTop + 24, 12, "#666666");
    } else {
        const cellsX = sheetX + HOUR_W + 8;
        const cellsW = sheetX + sheetW - 8 - cellsX;
        const perLineFor = (s: { w: number; gap: number }) => Math.max(1, Math.floor((cellsW + s.gap) / (s.w + s.gap)));
        const maxEntries = Math.max(...input.hours.map((h) => h.entries.length));
        // 最も混み合う行が1行に収まる最大の大きさを、全行で共通に使う（収まらなければ最小の大きさで折り返す）
        const size = BADGE_SIZES.find((s) => perLineFor(s) >= maxEntries) ?? BADGE_SIZES[BADGE_SIZES.length - 1];
        const perLine = perLineFor(size);
        const linesOf = input.hours.map((h) => Math.max(1, Math.ceil(h.entries.length / perLine)));
        const unit = bodyH / linesOf.reduce((a, b) => a + b, 0);

        let y = bodyTop;
        input.hours.forEach((h, i) => {
            const rowH = unit * linesOf[i];
            if (i % 2 === 0) c.rect(sheetX + HOUR_W, y, sheetW - HOUR_W, rowH, STRIPE);
            c.rect(sheetX, y, HOUR_W, rowH, HOUR_CELL);
            c.hline(sheetX, sheetX + HOUR_W, y + rowH, "#ffffff", 1.5);
            c.text(String(h.hour), sheetX + HOUR_W / 2, y + rowH / 2, 15, "#ffffff", { bold: true, dia: true, align: "center" });

            h.entries.forEach((e, k) => {
                const line = Math.floor(k / perLine);
                const col = k % perLine;
                const x = cellsX + col * (size.w + size.gap);
                const cy = y + unit * (line + 0.5) + 1.5;
                const mm = Math.floor((e.time % 3600) / 60)
                    .toString()
                    .padStart(2, "0");
                drawBadge(c, x, cy, size, e.trainType, e.trainType.id === input.baseTypeId, e.isArrivalOnly ? `(${mm})` : mm);
                const badgeTop = cy - (size.fs + 4) / 2;
                if (e.destChar) c.text(e.destChar, x + 0.5, badgeTop - 3, 6.5, "#333333");
                const marker = e.isOrigin && e.isTerminus ? "●▲" : e.isOrigin ? "●" : e.isTerminus ? "▲" : "";
                if (marker) c.text(marker, x + size.w, badgeTop - 3, 5.5, "#333333", { align: "right" });
            });
            y += rowH;
        });
    }

    // ---- 凡例 ----
    if (legendRows.length > 0) {
        c.hline(sheetX, sheetX + sheetW, legendTop, BRAND, 1.5);
        let ly = legendTop + legendPad;
        legendRows.forEach((r, ri) => {
            const lines = legendLines[ri];
            const firstCy = ly + LEGEND_PITCH / 2;
            c.text(r.title, legendLeft, firstCy, LEGEND_FS + 0.5, "#000000", { bold: true });
            c.hline(legendLeft, legendLeft + legendTitleW, firstCy + 6.5, BRAND, 1.5);
            lines.forEach((line, li) => {
                const cy = ly + LEGEND_PITCH * (li + 0.5);
                line.forEach(({ item, x }) => item.draw(c, legendItemsX + x, cy));
            });
            ly += lines.length * LEGEND_PITCH + legendRowGap;
        });
    }

    // 外枠は最後に描いて、塗りの上に重ねる
    c.frame(sheetX, sheetY, sheetW, sheetH, BRAND, BORDER_W);

    return doc.save();
}

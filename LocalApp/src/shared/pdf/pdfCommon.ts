import fontkit from "@pdf-lib/fontkit";
import { clip, degrees, endPath, PDFDocument, popGraphicsState, pushGraphicsState, rectangle, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { parseHexColor } from "../../domain/colors.ts";
import type { FontSubsetter } from "./fontSubset.ts";

/** PDFに埋め込む日本語フォントのデータ */
export type PdfFonts = {
    /** 日本語フォント（標準・太字） */
    regular: Uint8Array;
    bold: Uint8Array;
    /** 時刻の数字に使うDiaProフォント（標準・太字） */
    diaRegular: Uint8Array;
    diaBold: Uint8Array;
};

/** PDFで使うフォント一式 */
export type PdfTextFonts = { regular: TextFont; bold: TextFont; diaRegular: TextFont; diaBold: TextFont };

/** フォントに無い文字を置き換える先（それも無ければ「?」） */
const FALLBACK_CHARS: Record<string, string> = { "➡": "→", "▲": "△", "●": "○", "⇂": "↓", "║": "｜" };

/** 置き換え先の文字（フォントを絞るときに残すため） */
export const FALLBACK_TARGET_CHARS = "→△○↓｜?";

/**
 * "#rrggbb"をpdf-libの色にします（読み取れなければ黒）。
 *
 * @param color 色
 */
export function toRgb(color: string) {
    const c = parseHexColor(color) ?? { r: 0, g: 0, b: 0 };
    return rgb(c.r / 255, c.g / 255, c.b / 255);
}

/** 1つのフォント（と、含まれる文字の集合）を扱いやすくまとめたもの */
export type TextFont = { font: PDFFont; chars: Set<number> };

/**
 * フォントに文字があるか。
 *
 * @param f フォント
 * @param ch 1文字
 */
function hasChar(f: TextFont, ch: string): boolean {
    return f.chars.has(ch.codePointAt(0)!);
}

/**
 * フォントに無い文字を、代わりの文字に置き換えます（それも無ければ「?」）。
 *
 * @param f フォント
 * @param text 文字列（undefined/nullは空文字列として扱う）
 */
export function safe(f: TextFont, text: string | null | undefined): string {
    // 古いデータなどで列車番号・列車名が無い(undefined)ことがあるので、空文字列として扱う
    return [...(text ?? "")]
        .map((ch) => {
            if (hasChar(f, ch)) return ch;
            const alt = FALLBACK_CHARS[ch];
            return alt && hasChar(f, alt) ? alt : "?";
        })
        .join("");
}

/**
 * PDFに日本語フォント（標準・太字）を埋め込みます。フォントは、PDFで使う文字だけに絞ってから埋め込みます
 * （pdf-lib自身のサブセット化は文字が欠けるため使わない）。
 *
 * @param doc PDF文書
 * @param fonts フォントのデータ（日本語フォントとDiaPro）
 * @param subset フォントを必要な文字だけに絞る関数
 * @param used PDFに描く可能性のある文字
 */
async function embedTextFonts(doc: PDFDocument, fonts: PdfFonts, subset: FontSubsetter, used: string): Promise<PdfTextFonts> {
    doc.registerFontkit(fontkit);
    const text = used + FALLBACK_TARGET_CHARS;
    const embed = async (bytes: Uint8Array): Promise<TextFont> => {
        const font = await doc.embedFont(await subset(bytes, text), { subset: false });
        return { font, chars: new Set(font.getCharacterSet()) };
    };
    return { regular: await embed(fonts.regular), bold: await embed(fonts.bold), diaRegular: await embed(fonts.diaRegular), diaBold: await embed(fonts.diaBold) };
}

/**
 * PDF文書を作り、このPDFで使う文字だけに絞ったフォントを埋め込みます。
 *
 * @param title 文書のタイトル
 * @param fonts フォントのデータ（日本語フォントとDiaPro）
 * @param subset フォントを必要な文字だけに絞る関数
 * @param used PDFに描く可能性のある文字
 */
export async function createPdfDocument(title: string, fonts: PdfFonts, subset: FontSubsetter, used: string): Promise<{ doc: PDFDocument; textFonts: PdfTextFonts }> {
    const doc = await PDFDocument.create();
    doc.setTitle(title);
    doc.setCreator("WebOud");
    return { doc, textFonts: await embedTextFonts(doc, fonts, subset, used) };
}

/** 用紙の上端を原点(下向きが正)にした座標で描くための、小さな描画ヘルパー */
export class Canvas {
    private page: PDFPage;
    private fonts: PdfTextFonts;
    private pageH: number;

    constructor(page: PDFPage, fonts: PdfTextFonts) {
        this.page = page;
        this.fonts = fonts;
        this.pageH = page.getHeight();
    }

    /**
     * 文字列を、フォントごとの連続した部分（run）に分ける。dia指定のときは、DiaProにある文字はDiaPro、
     * 無い文字（「〇」「:」「（」など）は日本語フォントで描く。
     */
    private runs(text: string, bold: boolean, dia: boolean): { font: TextFont; text: string }[] {
        const jp = bold ? this.fonts.bold : this.fonts.regular;
        if (!dia) return [{ font: jp, text: safe(jp, text) }];
        const dm = bold ? this.fonts.diaBold : this.fonts.diaRegular;
        const out: { font: TextFont; text: string }[] = [];
        for (const ch of text ?? "") {
            const f = hasChar(dm, ch) ? dm : jp;
            const t = f === jp ? safe(jp, ch) : ch;
            const last = out[out.length - 1];
            if (last && last.font === f) last.text += t;
            else out.push({ font: f, text: t });
        }
        return out;
    }

    /** 長方形を塗る（y:上端、下向き座標） */
    rect(x: number, y: number, w: number, h: number, color: string) {
        this.page.drawRectangle({ x, y: this.pageH - y - h, width: w, height: h, color: toRgb(color) });
    }

    /** 枠線だけの長方形 */
    frame(x: number, y: number, w: number, h: number, color: string, lineWidth: number) {
        this.page.drawRectangle({ x, y: this.pageH - y - h, width: w, height: h, borderColor: toRgb(color), borderWidth: lineWidth });
    }

    /** 水平線 */
    hline(x1: number, x2: number, y: number, color: string, lineWidth: number) {
        this.line(x1, y, x2, y, color, lineWidth);
    }

    /** 線分（任意の向き）。座標は上端が原点・下向きが正 */
    line(x1: number, y1: number, x2: number, y2: number, color: string, lineWidth: number) {
        this.page.drawLine({ start: { x: x1, y: this.pageH - y1 }, end: { x: x2, y: this.pageH - y2 }, thickness: lineWidth, color: toRgb(color) });
    }

    /** 折れ線（隣り合う点を線分でつなぐ） */
    polyline(points: { x: number; y: number }[], color: string, lineWidth: number) {
        for (let i = 1; i < points.length; i++) this.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y, color, lineWidth);
    }

    /**
     * 長方形の範囲の中だけに描く（範囲からはみ出した部分は見えない）。drawの中で描いたものが対象。
     */
    clipped(x: number, y: number, w: number, h: number, draw: () => void) {
        this.page.pushOperators(pushGraphicsState(), rectangle(x, this.pageH - y - h, w, h), clip(), endPath());
        try {
            draw();
        } finally {
            this.page.pushOperators(popGraphicsState());
        }
    }

    /**
     * 傾けた文字を描く。(x, y)は文字の左端のベースライン、angleは右へ水平を0とし、下向きを正とする角度（ラジアン）。
     * 数字だけならDiaPro、それ以外の文字を含むときは日本語フォントで描く。
     */
    rotatedText(text: string | null | undefined, x: number, y: number, size: number, color: string, angle: number, opts: { dia?: boolean } = {}) {
        const t0 = text ?? "";
        const dm = this.fonts.diaRegular;
        const useDia = !!opts.dia && [...t0].every((ch) => hasChar(dm, ch));
        const f = useDia ? dm : this.fonts.regular;
        const t = useDia ? t0 : safe(f, t0);
        this.page.drawText(t, { x, y: this.pageH - y, size, font: f.font, color: toRgb(color), rotate: degrees((-angle * 180) / Math.PI) });
    }

    /**
     * 文字を描く。centerYは文字の縦方向の中心（下向き座標）、align="center"のときxは中心。
     */
    text(text: string | null | undefined, x: number, centerY: number, size: number, color: string, opts: { bold?: boolean; dia?: boolean; align?: "left" | "center" | "right" } = {}) {
        const runs = this.runs(text ?? "", !!opts.bold, !!opts.dia);
        const widths = runs.map((r) => r.font.font.widthOfTextAtSize(r.text, size));
        const total = widths.reduce((a, b) => a + b, 0);
        let left = opts.align === "center" ? x - total / 2 : opts.align === "right" ? x - total : x;
        runs.forEach((r, i) => {
            // 文字の縦中心が指定位置に来るよう、ベースラインを少し下げる
            if (r.text) this.page.drawText(r.text, { x: left, y: this.pageH - centerY - size * 0.34, size, font: r.font.font, color: toRgb(color) });
            left += widths[i];
        });
    }

    /** 文字の幅を測る */
    measure(text: string | null | undefined, size: number, bold = false, dia = false): number {
        return this.runs(text ?? "", bold, dia).reduce((sum, r) => sum + r.font.font.widthOfTextAtSize(r.text, size), 0);
    }

    /**
     * 均等割付で文字を描く（画面のFitTextXと同じ）。文字を指定幅いっぱいに、文字の間隔を均等にして並べる。
     * 1文字のときは左寄せ。幅に収まらないときは、収まるまで文字を小さくする。
     *
     * @param text 文字列
     * @param x 左端
     * @param centerY 縦の中心
     * @param width 並べる幅
     * @param size 希望の文字サイズ
     */
    justifiedText(text: string | null | undefined, x: number, centerY: number, width: number, size: number) {
        const chars = [...(text ?? "")];
        if (chars.length === 0) return;
        const fit = this.fitSize(text, size, width, size * 0.4);
        const total = chars.reduce((sum, ch) => sum + this.measure(ch, fit), 0);
        const gap = chars.length > 1 ? Math.max(0, (width - total) / (chars.length - 1)) : 0;
        let cx = x;
        for (const ch of chars) {
            this.text(ch, cx, centerY, fit, "#000000");
            cx += this.measure(ch, fit) + gap;
        }
    }

    /**
     * 指定幅に収まるよう、必要なら文字サイズを小さくした大きさを返す
     *
     * @param text 文字列
     * @param size 希望の文字サイズ
     * @param maxWidth 収めたい幅
     * @param minSize これより小さくしない
     */
    fitSize(text: string | null | undefined, size: number, maxWidth: number, minSize: number, bold = false, dia = false): number {
        const w = this.measure(text, size, bold, dia);
        return w <= maxWidth ? size : Math.max(minSize, (size * maxWidth) / w);
    }
}

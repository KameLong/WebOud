import fontkit from "@pdf-lib/fontkit";
import { rgb, type PDFDocument, type PDFFont, type PDFPage } from "pdf-lib";
import { parseHexColor } from "../domain/colors.ts";
import type { FontSubsetter } from "./fontSubset.ts";

/** PDFに埋め込む日本語フォントのデータ */
export type PdfFonts = { regular: Uint8Array; bold: Uint8Array };

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
 * フォントに無い文字を、代わりの文字に置き換えます（それも無ければ「?」）。
 *
 * @param f フォント
 * @param text 文字列（undefined/nullは空文字列として扱う）
 */
export function safe(f: TextFont, text: string | null | undefined): string {
    // 古いデータなどで列車番号・列車名が無い(undefined)ことがあるので、空文字列として扱う
    return [...(text ?? "")]
        .map((ch) => {
            if (f.chars.has(ch.codePointAt(0)!)) return ch;
            const alt = FALLBACK_CHARS[ch];
            return alt && f.chars.has(alt.codePointAt(0)!) ? alt : "?";
        })
        .join("");
}

/**
 * PDFに日本語フォント（標準・太字）を埋め込みます。フォントは、PDFで使う文字だけに絞ってから埋め込みます
 * （pdf-lib自身のサブセット化は文字が欠けるため使わない）。
 *
 * @param doc PDF文書
 * @param fonts フォントのデータ
 * @param subset フォントを必要な文字だけに絞る関数
 * @param used PDFに描く可能性のある文字
 */
export async function embedTextFonts(doc: PDFDocument, fonts: PdfFonts, subset: FontSubsetter, used: string): Promise<{ regular: TextFont; bold: TextFont }> {
    doc.registerFontkit(fontkit);
    const text = used + FALLBACK_TARGET_CHARS;
    const regularFont = await doc.embedFont(await subset(fonts.regular, text), { subset: false });
    const boldFont = await doc.embedFont(await subset(fonts.bold, text), { subset: false });
    return {
        regular: { font: regularFont, chars: new Set(regularFont.getCharacterSet()) },
        bold: { font: boldFont, chars: new Set(boldFont.getCharacterSet()) },
    };
}

/** 用紙の上端を原点(下向きが正)にした座標で描くための、小さな描画ヘルパー */
export class Canvas {
    private page: PDFPage;
    private regular: TextFont;
    private bold: TextFont;
    private pageH: number;

    constructor(page: PDFPage, regular: TextFont, bold: TextFont) {
        this.page = page;
        this.regular = regular;
        this.bold = bold;
        this.pageH = page.getHeight();
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
        this.page.drawLine({ start: { x: x1, y: this.pageH - y }, end: { x: x2, y: this.pageH - y }, thickness: lineWidth, color: toRgb(color) });
    }

    /** 垂直線 */
    vline(x: number, y1: number, y2: number, color: string, lineWidth: number) {
        this.page.drawLine({ start: { x, y: this.pageH - y1 }, end: { x, y: this.pageH - y2 }, thickness: lineWidth, color: toRgb(color) });
    }

    /**
     * 文字を描く。centerYは文字の縦方向の中心（下向き座標）、align="center"のときxは中心。
     */
    text(text: string | null | undefined, x: number, centerY: number, size: number, color: string, opts: { bold?: boolean; align?: "left" | "center" | "right" } = {}) {
        const f = opts.bold ? this.bold : this.regular;
        const t = safe(f, text);
        const w = f.font.widthOfTextAtSize(t, size);
        const left = opts.align === "center" ? x - w / 2 : opts.align === "right" ? x - w : x;
        // 文字の縦中心が指定位置に来るよう、ベースラインを少し下げる
        this.page.drawText(t, { x: left, y: this.pageH - centerY - size * 0.34, size, font: f.font, color: toRgb(color) });
    }

    /** 文字の幅を測る */
    measure(text: string | null | undefined, size: number, bold = false): number {
        const f = bold ? this.bold : this.regular;
        return f.font.widthOfTextAtSize(safe(f, text), size);
    }

    /**
     * 指定幅に収まるよう、必要なら文字サイズを小さくした大きさを返す
     *
     * @param text 文字列
     * @param size 希望の文字サイズ
     * @param maxWidth 収めたい幅
     * @param minSize これより小さくしない
     */
    fitSize(text: string | null | undefined, size: number, maxWidth: number, minSize: number, bold = false): number {
        const w = this.measure(text, size, bold);
        return w <= maxWidth ? size : Math.max(minSize, (size * maxWidth) / w);
    }
}

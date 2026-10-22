import hbSubsetWasmUrl from "harfbuzzjs/dist/harfbuzz-subset.wasm?url";
import { createFontSubsetter } from "./fontSubset.ts";
import type { PdfFonts } from "./stationTimetablePdf.ts";

let cache: Promise<PdfFonts> | null = null;

/**
 * 指定のURLのフォントファイルを読み込みます。
 *
 * @param url フォントファイルのURL
 */
async function fetchFont(url: string): Promise<Uint8Array> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`フォントを読み込めませんでした (${res.status}): ${url}`);
    return new Uint8Array(await res.arrayBuffer());
}

/**
 * PDFに埋め込む日本語フォント(BIZ UDゴシック)を読み込みます。最初のPDF出力のときだけ通信し、以降は読み込み済みのものを使います。
 */
export function loadPdfFonts(): Promise<PdfFonts> {
    if (!cache) {
        const base = `${import.meta.env.BASE_URL}pdf-font/`;
        cache = Promise.all([fetchFont(`${base}BIZUDGothic-Regular.ttf`), fetchFont(`${base}BIZUDGothic-Bold.ttf`)])
            .then(([regular, bold]) => ({ regular, bold }))
            .catch((e) => {
                cache = null; // 失敗したら、次回やり直せるようにする
                throw e;
            });
    }
    return cache;
}

/**
 * フォントを必要な文字だけに絞る関数（ブラウザ用。harfbuzzのwasmは、最初に使うときだけ読み込む）。
 */
export const subsetFontInBrowser = createFontSubsetter(async () => {
    const res = await fetch(hbSubsetWasmUrl);
    if (!res.ok) throw new Error(`フォント処理用のファイルを読み込めませんでした (${res.status})`);
    return res.arrayBuffer();
});

/**
 * ファイルをダウンロードさせます。
 *
 * @param bytes ファイルの内容
 * @param filename 保存するファイル名
 * @param mime MIMEタイプ
 */
export function downloadBytes(bytes: Uint8Array, filename: string, mime = "application/pdf") {
    const blob = new Blob([bytes as BlobPart], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

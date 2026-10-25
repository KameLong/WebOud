import { translate } from "./messages.ts";
import hbSubsetWasmUrl from "harfbuzzjs/dist/harfbuzz-subset.wasm?url";
import { createFontSubsetter } from "./fontSubset.ts";
import type { PdfFonts } from "./pdfCommon.ts";
import type { Lang } from "../i18n/languages.ts";
import { getLanguage } from "../../store/settings.ts";

/** 言語ごとの読み込み結果（一度読み込んだフォントは使い回す） */
const cache = new Map<Lang, Promise<PdfFonts>>();

/**
 * 指定のURLのフォントファイルを読み込みます。
 *
 * @param url フォントファイルのURL
 */
async function fetchFont(url: string): Promise<Uint8Array> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(translate().t("fontLoadFailed", { status: res.status, url }));
    return new Uint8Array(await res.arrayBuffer());
}

/**
 * PDFに埋め込むフォントを読み込みます。本文のフォントは言語ごとに違い、日本語・Englishは BIZ UDゴシック、
 * 繁體中文は Noto Sans TC（無い文字は BIZ UDゴシックで補う）です。時刻の数字には、どの言語でもDiaProを使います。
 * 最初のPDF出力のときだけ通信し、以降は読み込み済みのものを使います。
 *
 * @param lang PDFの言語（表示言語）
 */
export function loadPdfFonts(lang: Lang = getLanguage()): Promise<PdfFonts> {
    let loading = cache.get(lang);
    if (!loading) {
        const base = `${import.meta.env.BASE_URL}pdf-font/`;
        const dia = `${import.meta.env.BASE_URL}font/`;
        const names = lang === "zh-TW" ? ["NotoSansTC-Regular.ttf", "NotoSansTC-Bold.ttf"] : [];
        loading = Promise.all([
            fetchFont(`${base}BIZUDGothic-Regular.ttf`),
            fetchFont(`${base}BIZUDGothic-Bold.ttf`),
            fetchFont(`${dia}DiaPro-Regular.ttf`),
            fetchFont(`${dia}DiaPro-Bold.ttf`),
            ...names.map((n) => fetchFont(`${base}${n}`)),
        ])
            .then(([jpRegular, jpBold, diaRegular, diaBold, tcRegular, tcBold]) => ({
                // 繁體中文の太字は、Noto Sans TC Boldに無い文字を、Regular、BIZ UDゴシックの順で補う
                regular: tcRegular ? [tcRegular, jpRegular] : [jpRegular],
                bold: tcBold ? [tcBold, tcRegular, jpBold] : [jpBold],
                diaRegular,
                diaBold,
            }))
            .catch((e) => {
                cache.delete(lang); // 失敗したら、次回やり直せるようにする
                throw e;
            });
        cache.set(lang, loading);
    }
    return loading;
}

/**
 * フォントを必要な文字だけに絞る関数（ブラウザ用。harfbuzzのwasmは、最初に使うときだけ読み込む）。
 */
export const subsetFontInBrowser = createFontSubsetter(async () => {
    const res = await fetch(hbSubsetWasmUrl);
    if (!res.ok) throw new Error(translate().t("wasmLoadFailed", { status: res.status }));
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

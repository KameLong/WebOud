import { createI18n, defineMessages } from "../i18n/core.ts";

export const messages = defineMessages({
    ja: {
        orientation: "用紙の向き",
        landscape: "A4 横",
        portrait: "A4 縦",
        landscapeShort: "横",
        portraitShort: "縦",
        fontLoadFailed: "フォントを読み込めませんでした ({status}): {url}",
        wasmLoadFailed: "フォント処理用のファイルを読み込めませんでした ({status})",
        subsetStartFailed: "フォントの絞り込みを開始できませんでした",
        subsetFailed: "フォントを必要な文字だけに絞れませんでした",
        subsetEmpty: "絞り込んだフォントが空でした",
        pageOf: "{page} / {total} ページ",
    },
    en: {
        orientation: "Paper orientation",
        landscape: "A4 landscape",
        portrait: "A4 portrait",
        landscapeShort: "landscape",
        portraitShort: "portrait",
        fontLoadFailed: "Could not load the font ({status}): {url}",
        wasmLoadFailed: "Could not load the font processing file ({status})",
        subsetStartFailed: "Could not start reducing the font",
        subsetFailed: "Could not reduce the font to the needed characters",
        subsetEmpty: "The reduced font was empty",
        pageOf: "Page {page} / {total}",
    },
    "zh-TW": {
        orientation: "紙張方向",
        landscape: "A4 橫向",
        portrait: "A4 直向",
        landscapeShort: "橫向",
        portraitShort: "直向",
        fontLoadFailed: "無法載入字型 ({status})：{url}",
        wasmLoadFailed: "無法載入字型處理用的檔案 ({status})",
        subsetStartFailed: "無法開始縮減字型",
        subsetFailed: "無法將字型縮減為所需的文字",
        subsetEmpty: "縮減後的字型是空的",
        pageOf: "第 {page} / {total} 頁",
    },
});

export const { useT, translate } = createI18n(messages);

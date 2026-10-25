import { createI18n, defineMessages } from "../../shared/i18n/core.ts";

export const messages = defineMessages({
    ja: {
        title: "設定",
        fontSize: "全体の文字サイズ",
        fontSizeLabel: "全体の文字サイズ(px)",
        resetFontSize: "既定に戻す（{size}px）",
        fontSizeHelp: "時刻表グリッドなどの表示もこの文字サイズに合わせて拡大縮小します（{min}〜{max}pxの範囲）。変更は自動で保存され、すぐに反映されます。",
        language: "表示言語",
        languageHelp: "画面とPDFの言語です。ブラウザの言語設定では切り替わらず、ここで選んだ言語が使われます。路線のデータ（駅名や列車名など）は翻訳されません。",
    },
    en: {
        title: "Settings",
        fontSize: "Overall text size",
        fontSizeLabel: "Overall text size (px)",
        resetFontSize: "Reset to default ({size}px)",
        fontSizeHelp: "The timetable grid and other displays scale with this text size (range {min}–{max}px). Changes are saved automatically and applied immediately.",
        language: "Display language",
        languageHelp: "The language of the screens and PDFs. It is not switched by your browser's language; the language chosen here is always used. Your line data (station names, train names, etc.) is not translated.",
    },
    "zh-TW": {
        title: "設定",
        fontSize: "整體文字大小",
        fontSizeLabel: "整體文字大小（px）",
        resetFontSize: "還原為預設值（{size}px）",
        fontSizeHelp: "時刻表格線等的顯示也會依此文字大小縮放（範圍 {min}～{max}px）。變更會自動儲存並立即套用。",
        language: "顯示語言",
        languageHelp: "畫面與 PDF 使用的語言。不會依瀏覽器的語言設定切換，一律使用此處選擇的語言。路線資料（站名、列車名稱等）不會被翻譯。",
    },
});

export const { useT, translate } = createI18n(messages);

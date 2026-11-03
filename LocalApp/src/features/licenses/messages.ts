import { createI18n, defineMessages } from "../../shared/i18n/core.ts";

export const messages = defineMessages({
    ja: {
        title: "ライセンス表記",
        backToSettings: "設定へ戻る",
        intro: "このアプリは、次のオープンソースソフトウェアを利用しています。各ソフトウェアの作者と、ライセンスの条件に従って利用しています。",
        count: "{n} 件",
        loading: "読み込み中…",
        loadFailed: "ライセンス情報を読み込めませんでした。",
        noText: "このパッケージには、ライセンス文のファイルが含まれていません。ライセンスの種類は上記のとおりです。",
        repository: "配布元",
    },
    en: {
        title: "Open source licenses",
        backToSettings: "Back to settings",
        intro: "This app uses the open source software listed below, in accordance with the terms of each license.",
        count: "{n} packages",
        loading: "Loading…",
        loadFailed: "Failed to load the license information.",
        noText: "This package does not include a license text file. The license type is shown above.",
        repository: "Source",
    },
    "zh-TW": {
        title: "授權聲明",
        backToSettings: "返回設定",
        intro: "本應用程式使用下列開放原始碼軟體，並依各軟體的授權條款使用。",
        count: "{n} 個",
        loading: "讀取中…",
        loadFailed: "無法讀取授權資訊。",
        noText: "此套件未附授權條款檔案。授權類型如上所示。",
        repository: "來源",
    },
});

export const { useT, translate } = createI18n(messages);

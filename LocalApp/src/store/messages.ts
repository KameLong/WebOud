import { createI18n, defineMessages } from "../shared/i18n/core.ts";

export const messages = defineMessages({
    ja: {
        duplicateName: "「{name}」という名前の路線はすでにあります",
        invalidFile: "不正なファイル形式です",
        sampleLoadFailed: "サンプルダイヤを読み込めませんでした ({status})",
    },
    en: {
        duplicateName: "A line named \"{name}\" already exists",
        invalidFile: "Invalid file format",
        sampleLoadFailed: "Could not load the sample timetable ({status})",
    },
    "zh-TW": {
        duplicateName: "已有名為「{name}」的路線",
        invalidFile: "檔案格式不正確",
        sampleLoadFailed: "無法載入範例時刻表 ({status})",
    },
});

export const { useT, translate } = createI18n(messages);

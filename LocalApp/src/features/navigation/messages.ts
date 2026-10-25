import { createI18n, defineMessages } from "../../shared/i18n/core.ts";

export const messages = defineMessages({
    ja: { routeList: "← 路線一覧", settings: "⚙ 設定", menu: "☰ メニュー", edit: "路線編集", downTimetable: "下り時刻表", upTimetable: "上り時刻表", diagram: "ダイヤグラム", stationTimetable: "駅時刻表" },
    en: { routeList: "← Lines", settings: "⚙ Settings", menu: "☰ Menu", edit: "Edit line", downTimetable: "Down timetable", upTimetable: "Up timetable", diagram: "Diagram", stationTimetable: "Station timetable" },
    "zh-TW": { routeList: "← 路線一覽", settings: "⚙ 設定", menu: "☰ 選單", edit: "路線編輯", downTimetable: "下行時刻表", upTimetable: "上行時刻表", diagram: "運行圖", stationTimetable: "車站時刻表" },
});

export const { useT, translate } = createI18n(messages);

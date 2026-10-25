import type { TrainTypeDto } from "./dto.ts";

/**
 * 標準の列車種別（普通・略称なし・黒）。路線を作るときに最初から用意し、
 * 種別をすべて削除したときにも自動で追加し直す（路線には常に1つ以上の種別がある）。
 */
export const DEFAULT_TRAIN_TYPE: Omit<TrainTypeDto, "id" | "routeID" | "index"> = {
    name: "普通",
    shortName: "",
    color: "#000000",
    fontBold: false,
    lineBold: false,
    lineStyle: 0,
};

/** 列車の種別が見つからないとき（プレースホルダ列など）に使う種別。毎回同じ参照にして再描画を避ける */
export const FALLBACK_TRAIN_TYPE: TrainTypeDto = { id: 0, routeID: 0, index: 0, name: "", shortName: "", color: "#000000", fontBold: false, lineBold: false, lineStyle: 0 };

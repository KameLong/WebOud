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

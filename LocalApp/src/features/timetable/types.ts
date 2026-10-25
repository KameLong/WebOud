import type { Part } from "../../domain/showStyle.ts";

/** 時刻表グリッドのカーソル位置（r:駅の行 c:列車の列 part:着/番線/発） */
export type Cursor = { r: number; c: number; part: Part };

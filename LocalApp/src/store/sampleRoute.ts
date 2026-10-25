import { importRoutesFromJson } from "./localStore.ts";
import type { RouteRecord } from "./types.ts";

/** サンプルダイヤ（路線データのJSON。路線の「エクスポート」で書き出したものと同じ形式） */
const SAMPLE_URL = `${import.meta.env.BASE_URL}sample/sample.weboud.json`;

/** サンプルダイヤの路線名（画面の案内に使う） */
export const SAMPLE_ROUTE_NAME = "阪急宝塚本線";

/**
 * サンプルダイヤを読み込み、新しい路線として追加します。ファイルが大きい（約1.4MB）ので、ボタンを押したときに初めて読み込みます。
 * 同じ名前の路線がすでにあるときは、confirmOverwriteで確認します。
 *
 * @param confirmOverwrite 同じ名前の路線があるとき、上書きしてよいかを返す関数
 * @returns 読み込んだ路線。取りやめたときはnull
 */
export async function loadSampleRoute(confirmOverwrite: (names: string[]) => boolean): Promise<RouteRecord | null> {
    const res = await fetch(SAMPLE_URL);
    if (!res.ok) throw new Error(`サンプルダイヤを読み込めませんでした (${res.status})`);
    return importRoutesFromJson(await res.text(), confirmOverwrite)?.[0] ?? null;
}

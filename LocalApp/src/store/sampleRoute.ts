import { translate } from "./messages.ts";
import { importRoutesFromJson } from "./localStore.ts";
import type { RouteRecord } from "./types.ts";

/** サンプルダイヤ（路線データのJSON。路線の「エクスポート」で書き出したものと同じ形式） */
const SAMPLE_URL = `${import.meta.env.BASE_URL}sample/sample.weboud.json`;

/**
 * サンプルダイヤを読み込み、新しい路線として追加します。ファイルが大きい（約1.4MB）ので、ボタンを押したときに初めて読み込みます。
 * 同じ名前の路線がすでにあるときは、confirmOverwriteで確認します。
 *
 * @param confirmOverwrite 同じ名前の路線があるとき、上書きしてよいかを返す関数
 * @returns 読み込んだ路線。取りやめたときはnull
 */
export async function loadSampleRoute(confirmOverwrite: (names: string[]) => boolean): Promise<RouteRecord | null> {
    const res = await fetch(SAMPLE_URL);
    if (!res.ok) throw new Error(translate().t("sampleLoadFailed", { status: res.status }));
    return importRoutesFromJson(await res.text(), confirmOverwrite)?.[0] ?? null;
}

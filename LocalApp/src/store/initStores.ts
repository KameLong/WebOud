import { initRoutesStore } from "./localStore.ts";
import { initSettingsStore } from "./settings.ts";

/**
 * アプリのデータ（路線一覧・設定）をIndexedDBから読み込みます。描画より前に、1回だけ呼んでください
 * （呼ぶ前は空のデータとして扱われるため、先にこれを待ってから描画することで、
 * 一瞬データが空に見える状態を防げます）。
 */
export async function initStores(): Promise<void> {
    await Promise.all([initRoutesStore(), initSettingsStore()]);
}

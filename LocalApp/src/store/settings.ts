import { migrateStorageKey } from "../shared/lib/storageKey.ts";
import { DEFAULT_LANGUAGE, isLang, type Lang } from "../shared/i18n/languages.ts";
import { createDebouncedWriter, idbGet, idbSet } from "./idb.ts";

// IndexedDBのキー（store/idb.tsのkvストア内）
const IDB_KEY = "settings";
// 旧版(localStorage)のキー。IndexedDBに何も無いときだけ、初回起動時にここから引き継ぐ
const LOCALSTORAGE_KEY = "webdia.settings";
// サイト名の変更前のキー（このキーのデータは、初回に新しいキーへ引き継ぐ）
migrateStorageKey("weboud.localapp.settings.v1", LOCALSTORAGE_KEY);

/** 全体の文字サイズ(px)の既定値 */
export const DEFAULT_FONT_SIZE = 14;
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 32;

export type Settings = {
    /** 全体の文字サイズ(px)。時刻表グリッドなどのレイアウトもこの値を基準に拡大縮小する */
    fontSize: number;
    /** 表示言語。ブラウザの言語設定では切り替えず、設定画面で選んだものを使う */
    language: Lang;
};

function defaultSettings(): Settings {
    return { fontSize: DEFAULT_FONT_SIZE, language: DEFAULT_LANGUAGE };
}

/**
 * 文字サイズを有効範囲に丸めます。
 *
 * @param v 丸める前の値
 */
function clampFontSize(v: number): number {
    if (!Number.isFinite(v)) return DEFAULT_FONT_SIZE;
    return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, v));
}

function isValidSettings(v: unknown): v is Settings {
    return !!v && typeof v === "object" && typeof (v as Settings).fontSize === "number";
}

/**
 * 読み込んだ値を、有効範囲に丸めた設定にします（不正な形式ならnull）。
 *
 * @param v 読み込んだ値
 */
function normalizeLoaded(v: unknown): Settings | null {
    if (!isValidSettings(v)) return null;
    return { ...defaultSettings(), ...v, fontSize: clampFontSize(v.fontSize), language: isLang(v.language) ? v.language : DEFAULT_LANGUAGE };
}

/**
 * 旧版(localStorage)に残っているデータを読み込みます（無ければnull）。
 */
function loadFromLocalStorage(): Settings | null {
    try {
        const raw = localStorage.getItem(LOCALSTORAGE_KEY);
        if (!raw) return null;
        return normalizeLoaded(JSON.parse(raw) as unknown);
    } catch (e) {
        console.error("failed to load settings from localStorage", e);
        return null;
    }
}

let state: Settings = defaultSettings();
const listeners = new Set<() => void>();
let initialized = false;

function emit() {
    for (const l of listeners) l();
}

/**
 * 他のタブ/ウィンドウでの変更をこのタブへ反映する（IndexedDBへの書き込み完了後に通知が届く）。
 */
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("webdia-settings-sync") : null;

const writer = createDebouncedWriter(
    IDB_KEY,
    () => state,
    (e) => console.error("failed to save settings to IndexedDB", e),
    400,
    () => channel?.postMessage("updated")
);

channel?.addEventListener("message", () => {
    void idbGet<Settings>(IDB_KEY).then((loaded) => {
        const normalized = loaded ? normalizeLoaded(loaded) : null;
        if (normalized) {
            state = normalized;
            emit();
        }
    });
});

/**
 * IndexedDBから初期データを読み込みます（アプリ起動時に1回、描画の前に呼ぶ）。
 * IndexedDBに何も無く、旧版のlocalStorageにデータが残っていればそちらを引き継ぎ、
 * IndexedDBへの書き込みに成功した時点でlocalStorage側は消します（失敗時は残したままにする）。
 */
export async function initSettingsStore(): Promise<void> {
    if (initialized) return;
    initialized = true;

    try {
        const fromIdb = await idbGet<Settings>(IDB_KEY);
        const normalized = fromIdb ? normalizeLoaded(fromIdb) : null;
        if (normalized) {
            state = normalized;
            return;
        }
    } catch (e) {
        console.error("failed to load settings from IndexedDB", e);
    }

    const fromLocalStorage = loadFromLocalStorage();
    if (!fromLocalStorage) return;

    state = fromLocalStorage;
    try {
        await idbSet(IDB_KEY, state);
        localStorage.removeItem(LOCALSTORAGE_KEY);
    } catch (e) {
        console.error("failed to migrate settings to IndexedDB", e);
    }
}

function persist() {
    emit();
    writer.schedule();
}

if (typeof window !== "undefined") {
    const flush = () => writer.flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
    });
}

export function getFontSize(): number {
    return state.fontSize;
}

export function getLanguage(): Lang {
    return state.language;
}

/**
 * 表示言語を変更し、保存します。
 *
 * @param language 新しい表示言語
 */
export function setLanguage(language: Lang) {
    state = { ...state, language };
    persist();
}

/**
 * 全体の文字サイズ(px)を変更し、保存します。
 *
 * @param fontSize 新しい文字サイズ(px)
 */
export function setFontSize(fontSize: number) {
    state = { ...state, fontSize: clampFontSize(fontSize) };
    persist();
}

export function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

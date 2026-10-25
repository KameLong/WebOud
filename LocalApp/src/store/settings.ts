import { DEFAULT_LANGUAGE, isLang, type Lang } from "../shared/i18n/languages.ts";

const STORAGE_KEY = "weboud.localapp.settings.v1";

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

/**
 * 保存されていた値を、有効範囲に丸めた設定にします。
 *
 * @param saved 形式を確認済みの保存値
 */
function normalize(saved: Settings): Settings {
    return { ...defaultSettings(), ...saved, fontSize: clampFontSize(saved.fontSize), language: isLang(saved.language) ? saved.language : DEFAULT_LANGUAGE };
}

function isValidSettings(v: unknown): v is Settings {
    return !!v && typeof v === "object" && typeof (v as Settings).fontSize === "number";
}

function loadSettings(): Settings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultSettings();
        const parsed = JSON.parse(raw) as unknown;
        if (!isValidSettings(parsed)) return defaultSettings();
        return normalize(parsed);
    } catch (e) {
        console.error("failed to load settings", e);
        return defaultSettings();
    }
}

let state: Settings = loadSettings();
const listeners = new Set<() => void>();

function emit() {
    for (const l of listeners) l();
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("failed to save settings to localStorage", e);
    }
    emit();
}

/**
 * 他のタブ/ウィンドウでの変更をこのタブへ反映する。
 */
if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
        if (event.key !== STORAGE_KEY) return;
        if (event.newValue == null) {
            state = defaultSettings();
            emit();
            return;
        }
        try {
            const parsed = JSON.parse(event.newValue) as unknown;
            if (isValidSettings(parsed)) {
                state = normalize(parsed);
                emit();
            }
        } catch (e) {
            console.error("failed to sync settings from another tab/window", e);
        }
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

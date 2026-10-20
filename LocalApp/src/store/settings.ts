const STORAGE_KEY = "weboud.localapp.settings.v1";

/** 全体の文字サイズ(px)の既定値 */
export const DEFAULT_FONT_SIZE = 14;
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 32;

export type Settings = {
    /** 全体の文字サイズ(px)。時刻表グリッドなどのレイアウトもこの値を基準に拡大縮小する */
    fontSize: number;
};

function defaultSettings(): Settings {
    return { fontSize: DEFAULT_FONT_SIZE };
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

function loadSettings(): Settings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultSettings();
        const parsed = JSON.parse(raw) as unknown;
        if (!isValidSettings(parsed)) return defaultSettings();
        return { ...defaultSettings(), ...parsed, fontSize: clampFontSize(parsed.fontSize) };
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
                state = { ...defaultSettings(), ...parsed, fontSize: clampFontSize(parsed.fontSize) };
                emit();
            }
        } catch (e) {
            console.error("failed to sync settings from another tab/window", e);
        }
    });
}

export function getSettings(): Settings {
    return state;
}

export function getFontSize(): number {
    return state.fontSize;
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

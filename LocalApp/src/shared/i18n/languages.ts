/** アプリの表示言語 */
export type Lang = "ja" | "en" | "zh-TW";

/** 選べる言語（名前は、どの言語の画面でも、その言語自身の表記で表示する） */
export const LANGUAGES: { code: Lang; label: string }[] = [
    { code: "ja", label: "日本語" },
    { code: "en", label: "English" },
    { code: "zh-TW", label: "繁體中文（台灣）" },
];

/** 初期の表示言語。ブラウザの言語設定では切り替えず、設定画面で選んだ言語を使う */
export const DEFAULT_LANGUAGE: Lang = "ja";

/**
 * 値が、選べる言語のコードか。
 *
 * @param v 調べる値
 */
export function isLang(v: unknown): v is Lang {
    return LANGUAGES.some((l) => l.code === v);
}

/** 日付の表示に使う地域（Intlのロケール） */
const DATE_LOCALES: Record<Lang, string> = { ja: "ja-JP", en: "en-US", "zh-TW": "zh-TW" };

/**
 * 日付・時刻を、その言語の表記にします。
 *
 * @param lang 表示言語
 * @param ms UNIX時間(ミリ秒)
 */
export function formatDateTime(lang: Lang, ms: number): string {
    return new Date(ms).toLocaleString(DATE_LOCALES[lang]);
}

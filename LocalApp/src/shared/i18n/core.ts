import { useMemo, useSyncExternalStore } from "react";
import { getLanguage, subscribe } from "../../store/settings.ts";
import type { Lang } from "./languages.ts";

/** 文言に差し込む値（文言の中の {名前} が置き換わる） */
export type MessageParams = Record<string, string | number>;

/** 1つの文言。文字列か、箇条書きなどの文字列の並びか、2列の表（ショートカット一覧など）の行の並び */
type MessageValue = string | readonly string[] | readonly (readonly [string, string])[];

/** 言語ごとの文言（キーは、どの言語にも同じものを用意する） */
type MessageSet<K extends string> = Record<K, MessageValue>;

/** 3つの言語の文言をまとめたもの */
export type Messages<K extends string> = { [L in Lang]: MessageSet<K> };

/**
 * 画面の文言を、言語ごとに定義します。日本語・English・繁體中文のどれかにキーが足りないと、型エラーになります。
 *
 * @param messages 言語ごとの文言（キー → 文言）
 */
export function defineMessages<const K extends string>(messages: { ja: MessageSet<K>; en: MessageSet<K>; "zh-TW": MessageSet<K> }): Messages<K> {
    return messages;
}

/**
 * 文言の中の {名前} を、指定の値に置き換えます。
 *
 * @param text 文言
 * @param params 差し込む値
 */
function fill(text: string, params?: MessageParams): string {
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/** 文言を取り出す関数の組 */
export type Translator<K extends string> = {
    /** 表示言語 */
    lang: Lang;
    /** 文言（文字列）を取り出す。{名前} は params で置き換える */
    t: (key: K, params?: MessageParams) => string;
    /** 文言（箇条書きなどの文字列の並び）を取り出す */
    tl: (key: K, params?: MessageParams) => string[];
    /** 文言（2列の表の行の並び）を取り出す */
    table: (key: K) => [string, string][];
    /** この言語の文言をすべてつなげた文字列（PDFに埋め込むフォントを、使う文字だけに絞るために使う） */
    allText: () => string;
};

/**
 * 指定の言語で文言を取り出す関数の組を作ります。
 *
 * @param messages 文言
 * @param lang 表示言語
 */
export function translatorFor<K extends string>(messages: Messages<K>, lang: Lang): Translator<K> {
    const set = messages[lang];
    return {
        lang,
        t: (key, params) => {
            const v = set[key];
            return fill(typeof v === "string" ? v : (v as readonly string[]).join("\n"), params);
        },
        tl: (key, params) => {
            const v = set[key];
            return (typeof v === "string" ? [v] : ([...v] as string[])).map((x) => fill(x, params));
        },
        allText: () =>
            Object.values<MessageValue>(set)
                .flatMap((v) => (typeof v === "string" ? [v] : v.flatMap((x) => (typeof x === "string" ? [x] : [...x]))))
                .join(""),
        table: (key) => [...(set[key] as readonly (readonly [string, string])[])].map(([a, b]) => [a, b]),
    };
}

/**
 * ある画面（機能）の文言から、取り出し方を作ります。
 * useT は画面の中で使い、言語を切り替えると再描画されます。translate は画面の外（保存データの操作やPDFの作成など）で、今の表示言語で取り出すときに使います。
 *
 * @param messages defineMessagesで定義した文言
 */
export function createI18n<K extends string>(messages: Messages<K>) {
    return {
        /** 画面の中で使う。表示言語が変わると再描画される */
        useT: (): Translator<K> => {
            const lang = useSyncExternalStore(subscribe, getLanguage);
            return useMemo(() => translatorFor(messages, lang), [lang]);
        },
        /** 画面の外で使う。呼んだ時点の表示言語で取り出す */
        translate: (): Translator<K> => translatorFor(messages, getLanguage()),
    };
}

/** 表示言語を返す（切り替えると再描画される） */
export function useLanguage(): Lang {
    return useSyncExternalStore(subscribe, getLanguage);
}

// <html lang> を表示言語に合わせる（読み上げ・文字の字形の選択に使われる）
if (typeof document !== "undefined") {
    const apply = () => {
        document.documentElement.lang = getLanguage();
    };
    apply();
    subscribe(apply);
}

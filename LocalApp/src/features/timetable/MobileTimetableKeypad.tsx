import { useEffect, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Keypad, KeypadBlank, KeypadKey } from "../../shared/ui/Keypad.tsx";
import { useT } from "./messages.ts";

/** キーパッドの開閉の状態を次回以降も覚えておくためのlocalStorageキー */
const COLLAPSED_STORAGE_KEY = "rt-keypad-collapsed";

/** 保存済みの「隠している」状態を読み出す（localStorageが使えない環境では表示扱い） */
function loadCollapsed(): boolean {
    try {
        return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

type KeyInit = { key: string; code: string; altKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean };

/** フォーカスされている要素へ、物理キー入力相当のKeyboardEventを合成して送る(既存のonKeyDownロジックをそのまま再利用するため) */
function dispatchKey(target: HTMLElement, init: KeyInit) {
    target.dispatchEvent(
        new KeyboardEvent("keydown", {
            key: init.key,
            code: init.code,
            altKey: !!init.altKey,
            ctrlKey: !!init.ctrlKey,
            shiftKey: !!init.shiftKey,
            bubbles: true,
            cancelable: true,
        })
    );
}

/** ショートカットキーの種類（キーパッド上の文字キー） */
export type KeypadShortcut = "plus1" | "minus1" | "pass" | "noVia" | "erase";

/**
 * 時刻入力用キーパッドのキー配置（数字・±1分・通過・経由なし・消去・⌫・↵）。
 * 時刻表のグリッド用キーパッドと各入力ダイアログで、この1つを共通で使い、配置・大きさ・見た目を完全に同一にする。
 * 使わないショートカットは、handlersに渡さなければ空きマスになる。
 *
 * @param props onDigit:数字 / onBackspace:⌫ / onEnter:↵ / enterTitle:↵のツールチップ / shortcuts:文字キーごとの処理 / extra:2段目の右端に入れるキー / className,collapsed,zIndex:Keypadの設定
 */
export function TimetableKeypad(props: {
    onDigit: (d: string) => void;
    onBackspace: () => void;
    onEnter: () => void;
    enterTitle?: string;
    shortcuts?: Partial<Record<KeypadShortcut, () => void>>;
    extra?: ReactNode;
    className?: string;
    collapsed?: boolean;
    zIndex?: number;
}) {
    const { onDigit, onBackspace, onEnter, enterTitle, shortcuts = {}, extra, className, collapsed, zIndex } = props;
    const { t } = useT();
    const digit = (d: string) => <KeypadKey key={d} label={d} onPress={() => onDigit(d)} />;
    const shortcut = (kind: KeypadShortcut) => {
        const handler = shortcuts[kind];
        return handler ? <KeypadKey small label={t(kind)} onPress={handler} /> : <KeypadBlank />;
    };
    return (
        <Keypad className={className} collapsed={collapsed} zIndex={zIndex}>
            {["1", "2", "3"].map(digit)}
            {shortcut("plus1")}
            {shortcut("minus1")}
            {shortcut("erase")}

            {["4", "5", "6"].map(digit)}
            {shortcut("pass")}
            {shortcut("noVia")}
            {extra ?? <KeypadBlank />}

            {["7", "8", "9"].map(digit)}
            <KeypadBlank colSpan={3} />

            <KeypadKey label="⌫" title={t("backspaceTitle")} onPress={onBackspace} />
            {digit("0")}
            <KeypadKey label="↵" title={enterTitle ?? t("nextRowTitle")} onPress={onEnter} />
            <KeypadBlank colSpan={3} />
        </Keypad>
    );
}

/**
 * スマホ用の時刻表入力キーパッド。物理キーボードが無い端末でも、数字入力と
 * Alt/Ctrl併用のショートカットを操作できるようにする。画面下端に固定表示し、
 * PC幅(780px以上)では非表示になる。
 *
 * スマホでは連続入力モードを常時有効にし(RouteTimetablePage側で強制)、
 * 時刻編集ダイアログ(システムキーボードが必要になる)を開かずグリッド上で
 * 直接編集できるようにしている。ボタン操作は、フォーカス中の要素へ合成
 * KeyboardEventを送ることで実現しており、既存のキー操作ロジック
 * (keyEvent/useContinuousTimeInput)をそのまま再利用する。
 */
export function MobileTimetableKeypad(props: { gridRef: RefObject<HTMLElement | null> }) {
    const { gridRef } = props;
    const { t } = useT();
    const [collapsed, setCollapsed] = useState(loadCollapsed);

    // 隠している間はキーパッド分の高さ(--rt-keypad-h)を0にして、グリッドを下まで広げる(App.css側で参照)
    useEffect(() => {
        document.body.classList.toggle("rt-keypad-collapsed", collapsed);
        try {
            localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
        } catch {
            // 保存できなくても動作には影響しない
        }
        return () => document.body.classList.remove("rt-keypad-collapsed");
    }, [collapsed]);

    function focusedOrGrid(): HTMLElement | null {
        return (document.activeElement as HTMLElement | null) ?? gridRef.current;
    }

    function pressDigit(d: string) {
        const target = focusedOrGrid();
        if (target) dispatchKey(target, { key: d, code: `Digit${d}` });
    }

    function pressBackspace() {
        const target = focusedOrGrid();
        if (target) dispatchKey(target, { key: "Backspace", code: "Backspace" });
    }

    function pressEnter() {
        const target = focusedOrGrid();
        if (target) dispatchKey(target, { key: "Enter", code: "Enter" });
    }

    function pressShortcut(init: KeyInit) {
        const target = focusedOrGrid();
        if (target) dispatchKey(target, init);
    }

    return (
        <>
            <button
                type="button"
                className="rt-keypad-toggle"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setCollapsed((v) => !v)}
                aria-label={collapsed ? t("keypadShow") : t("keypadHide")}
                title={collapsed ? t("keypadShow") : t("keypadHide")}
            >
                ⌨ {collapsed ? "▲" : "▼"}
            </button>
            <TimetableKeypad
                className="rt-keypad"
                collapsed={collapsed}
                onDigit={pressDigit}
                onBackspace={pressBackspace}
                onEnter={pressEnter}
                shortcuts={{
                    plus1: () => pressShortcut({ key: "l", code: "KeyL", altKey: true }),
                    minus1: () => pressShortcut({ key: "j", code: "KeyJ", altKey: true }),
                    pass: () => pressShortcut({ key: "-", code: "Minus", altKey: true }),
                    noVia: () => pressShortcut({ key: "^", code: "Digit6", ctrlKey: true }),
                    erase: () => pressShortcut({ key: "Delete", code: "Delete", ctrlKey: true }),
                }}
            />
        </>
    );
}

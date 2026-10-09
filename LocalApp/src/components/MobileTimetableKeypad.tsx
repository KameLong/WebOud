import type { RefObject } from "react";

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

// ボタンタップでフォーカスが奪われない(グリッドのフォーカスを保つ)ようにする
function keepFocus(e: React.MouseEvent) {
    e.preventDefault();
}

const keyStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 600,
    padding: 0,
    minWidth: 0,
};

const shortcutStyle: React.CSSProperties = {
    ...keyStyle,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.2,
    textAlign: "center",
    whiteSpace: "normal",
};

/** 数字キー1つ分のボタン(モジュールスコープの安定した関数。インライン定義だと親の再レンダリングのたびに作り直されてしまうため) */
function DigitButton(props: { label: string; onPress: (label: string) => void }) {
    return (
        <button onMouseDown={keepFocus} onClick={() => props.onPress(props.label)} style={keyStyle}>
            {props.label}
        </button>
    );
}

/** ショートカット1つ分のボタン(モジュールスコープの安定した関数) */
function ShortcutButton(props: { label: string; active?: boolean; init: KeyInit; onPress: (init: KeyInit) => void }) {
    return (
        <button
            onMouseDown={keepFocus}
            onClick={() => props.onPress(props.init)}
            style={{ ...shortcutStyle, background: props.active ? "#0f5b8a" : undefined, color: props.active ? "#fff" : undefined }}
        >
            {props.label}
        </button>
    );
}

/**
 * スマホ用の時刻表入力キーパッド。物理キーボードが無い端末でも、数字入力と
 * Alt/Ctrl併用のショートカットを操作できるようにする。画面下端に固定表示し、
 * PC幅(780px以上)では非表示になる。
 *
 * ボタン操作は、フォーカス中の要素へ合成KeyboardEventを送ることで実現しており、
 * 時刻表グリッドの既存のキー操作ロジック(keyEvent/useContinuousTimeInput)を
 * そのまま再利用する。時刻編集ダイアログが開いている間は、ダイアログの
 * テキスト入力欄にフォーカスが移りOS標準のソフトキーボードが出るため、
 * 本キーパッドの役割はグリッド操作（連続入力モードを含む）に限られる。
 */
export function MobileTimetableKeypad(props: { gridRef: RefObject<HTMLElement | null>; continuousEnabled: boolean }) {
    const { gridRef, continuousEnabled } = props;

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
        <div className="rt-keypad">
            <DigitButton label="1" onPress={pressDigit} />
            <DigitButton label="2" onPress={pressDigit} />
            <DigitButton label="3" onPress={pressDigit} />
            <ShortcutButton label={"+1分"} init={{ key: "l", code: "KeyL", altKey: true }} onPress={pressShortcut} />
            <ShortcutButton label={"-1分"} init={{ key: "j", code: "KeyJ", altKey: true }} onPress={pressShortcut} />

            <DigitButton label="4" onPress={pressDigit} />
            <DigitButton label="5" onPress={pressDigit} />
            <DigitButton label="6" onPress={pressDigit} />
            <ShortcutButton label="連続入力" active={continuousEnabled} init={{ key: "t", code: "KeyT", altKey: true }} onPress={pressShortcut} />
            <ShortcutButton label="通過" init={{ key: "-", code: "Minus", altKey: true }} onPress={pressShortcut} />

            <DigitButton label="7" onPress={pressDigit} />
            <DigitButton label="8" onPress={pressDigit} />
            <DigitButton label="9" onPress={pressDigit} />
            <ShortcutButton label="経由なし" init={{ key: "^", code: "Digit6", ctrlKey: true }} onPress={pressShortcut} />
            <ShortcutButton label="消去" init={{ key: "Delete", code: "Delete", ctrlKey: true }} onPress={pressShortcut} />

            <button onMouseDown={keepFocus} onClick={pressBackspace} style={keyStyle} title="バックスペース">
                ⌫
            </button>
            <DigitButton label="0" onPress={pressDigit} />
            <button onMouseDown={keepFocus} onClick={pressEnter} style={keyStyle} title="Enter">
                ↵
            </button>
            <div />
            <div />
        </div>
    );
}

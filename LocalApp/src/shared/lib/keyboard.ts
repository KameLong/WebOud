export type KeyLike = {
    key: string;
    /** 物理キー位置(レイアウト非依存)。macOSではAlt(Option)押下時にkeyが特殊文字に化けるため、Alt併用のショートカット判定にはこちらを使う */
    code: string;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    preventDefault: () => void;
    nativeEvent: KeyboardEvent;
};

/**
 * 日本語などのIME変換中（またはその確定を行うキー操作）かを返します。
 * 変換確定のEnterを「決定」と取り違えないために、Enter/Escapeの処理の前に確認します。
 *
 * @param e Reactのキーボードイベント
 */
export function isImeComposing(e: { nativeEvent: KeyboardEvent; keyCode: number }) {
    // Safariは確定のEnterがisComposing=falseで届くため、IME処理中を表すkeyCode 229も見る
    return e.nativeEvent.isComposing || e.keyCode === 229;
}

//入力したキーが数値か？
/**
 * @param e キーイベント
 */
export function isDigitKey(e: KeyLike) {
    return e.key.length === 1 && e.key >= "0" && e.key <= "9";
}

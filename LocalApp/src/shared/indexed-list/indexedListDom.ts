/**
 * 文字入力中の要素（テキスト入力・セレクトなど）かを返す。一覧のショートカットはここでは奪わない。
 *
 * @param t キーイベントの発生元
 */
export function isTextEditing(t: HTMLElement | null): boolean {
    if (!t) return false;
    if (t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable) return true;
    if (t.tagName === "INPUT") return !["checkbox", "radio", "button", "submit", "range", "color"].includes((t as HTMLInputElement).type);
    return false;
}

/**
 * 指定行の最初のテキスト入力にフォーカスして編集を始める。
 *
 * @param list 一覧のルート要素
 * @param id 編集する行ID
 * @param selectText trueなら入力済みの文字を全選択する
 */
export function focusRowInput(list: HTMLElement | null, id: number | null, selectText: boolean) {
    if (id == null) return;
    const input = list?.querySelector(`[data-row-id="${id}"] input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])`) as HTMLInputElement | null;
    if (!input) return;
    input.focus();
    if (selectText) input.select();
}

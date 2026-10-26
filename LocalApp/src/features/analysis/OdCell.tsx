import React, { useState } from "react";
import { parseOdInput } from "../../domain/od.ts";

/**
 * 駅間の利用客数を入力するマス。入力した値は、読める数のときだけ、その場で保存する（空欄にすると値を消す）。
 * 読めない文字を入れている間は保存せず、入力欄を離れたときに、保存済みの値へ戻す。
 *
 * @param props from・to:発駅・着駅のID / row・col:表の中の位置（キー移動用） / value:保存済みの値 / label:読み上げ用の名前 / onCommit:値を保存する / onPaste:貼り付け / onKeyDown:キー操作
 */
export const OdCell = React.memo(function OdCell(props: {
    from: number;
    to: number;
    row: number;
    col: number;
    value: number | undefined;
    label: string;
    onCommit: (from: number, to: number, value: number | null) => void;
    onPaste: (row: number, col: number, text: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => void;
}) {
    const { from, to, row, col, value, label, onCommit, onPaste, onKeyDown } = props;
    // 編集中の文字。nullのときは保存済みの値を表示する
    const [draft, setDraft] = useState<string | null>(null);
    const invalid = draft !== null && parseOdInput(draft) === undefined;

    return (
        <input
            className={`od-cell${invalid ? " od-cell-invalid" : ""}`}
            data-od={`${row},${col}`}
            inputMode="decimal"
            aria-label={label}
            value={draft ?? (value === undefined ? "" : String(value))}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
                const text = e.currentTarget.value;
                setDraft(text);
                const parsed = parseOdInput(text);
                if (parsed !== undefined) onCommit(from, to, parsed);
            }}
            onBlur={() => setDraft(null)}
            onKeyDown={(e) => onKeyDown(e, row, col)}
            onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                // 1つの値だけなら、普通の貼り付け（入力欄の中に入る）に任せる
                if (!/[\t\n\r]/.test(text.trim())) return;
                e.preventDefault();
                onPaste(row, col, text);
            }}
        />
    );
});

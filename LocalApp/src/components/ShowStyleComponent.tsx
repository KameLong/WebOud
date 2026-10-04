import React from "react";

type Props = {
    title?: string;
    bits: number; // 1方向分（4bit。使用するのは下位3bit）
    disabled?: boolean;
    onChangeBits?: (nextBits: number) => void;
    labels?: [string, string, string];
};

// bit割り当て: 1=着, 2=番線, 4=発
const ARR = 1;
const TRACK = 2;
const DEP = 4;

/**
 * 指定ビットが立っているかを返します。
 *
 * @param bits ビット値
 * @param flag 調べるビット
 */
function has(bits: number, flag: number) {
    return (bits & flag) === flag;
}
/**
 * 指定ビットを立てる/下ろした値を返します。
 *
 * @param bits 元のビット値
 * @param flag 操作するビット
 * @param on trueで立てる、falseで下ろす
 */
function set(bits: number, flag: number, on: boolean) {
    return on ? bits | flag : bits & ~flag;
}

/**
 * 着/番線/発の表示有無をチェックボックスで切り替えます。
 *
 * @param bits 現在の1方向分のビット値（1:着 2:番線 4:発）
 * @param disabled trueなら操作不可
 * @param onChangeBits 変更後のビット値を受け取るコールバック
 */
export function ShowStyleComponent({ bits, disabled, onChangeBits }: Props) {
    return (
        <div style={{ display: "grid", gap: 4, padding: 6, borderRight: "1px solid #eee" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                <div style={chkCell}>
                    <input
                        type="checkbox"
                        disabled={disabled}
                        checked={has(bits, ARR)}
                        onChange={(e) => onChangeBits?.(set(bits, ARR, e.target.checked))}
                        style={chkInput}
                    />
                </div>

                <div style={chkCell}>
                    <input
                        type="checkbox"
                        disabled={disabled}
                        checked={has(bits, TRACK)}
                        onChange={(e) => onChangeBits?.(set(bits, TRACK, e.target.checked))}
                        style={chkInput}
                    />
                </div>

                <div style={chkCell}>
                    <input
                        type="checkbox"
                        disabled={disabled}
                        checked={has(bits, DEP)}
                        onChange={(e) => onChangeBits?.(set(bits, DEP, e.target.checked))}
                        style={chkInput}
                    />
                </div>
            </div>
        </div>
    );
}
const chkCell: React.CSSProperties = {
    width: 42,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
};

const chkInput: React.CSSProperties = {
    width: 18,
    height: 18,
    margin: 0,
};

import React from "react";
import { Checkbox } from "@mantine/core";

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
 * 方向名とチェックボックスのラベルは狭い画面(スマホ)でだけ表示され、PC幅では見出し行に任せます。
 *
 * @param title 方向名（下り/上り）。スマホ幅でのみ表示する
 * @param bits 現在の1方向分のビット値（1:着 2:番線 4:発）
 * @param disabled trueなら操作不可
 * @param onChangeBits 変更後のビット値を受け取るコールバック
 * @param labels 各チェックボックスのラベル（着, 番線, 発）。スマホ幅でのみ表示する
 */
export function ShowStyleComponent({ title, bits, disabled, onChangeBits, labels = ["着", "番線", "発"] }: Props) {
    const flags = [ARR, TRACK, DEP];
    return (
        <div className="show-style" style={{ display: "grid", gap: 4, padding: 6, borderRight: "1px solid #eee" }}>
            {title && <div className="show-style-title">{title}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                {flags.map((flag, i) => (
                    <label key={flag} className="show-style-cell" style={chkCell}>
                        <Checkbox
                            size="sm"
                            disabled={disabled}
                            checked={has(bits, flag)}
                            onChange={(e) => onChangeBits?.(set(bits, flag, e.currentTarget.checked))}
                            aria-label={labels[i]}
                        />
                        <span className="show-style-label">{labels[i]}</span>
                    </label>
                ))}
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

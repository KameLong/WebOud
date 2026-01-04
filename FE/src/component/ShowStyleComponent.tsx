import React from "react";

type Props = {
    title?: string;                 // "下り" / "上り" など（任意）
    bits: number;                   // 0..7（3bit）
    disabled?: boolean;
    onChangeBits?: (nextBits: number) => void;
    labels?: [string, string, string]; // ["着","発着番線","発"] を差し替えたい場合
};

// bit割り当て: 1=着, 2=番線, 4=発（例）
const ARR = 1;
const TRACK = 2;
const DEP = 4;

function has(bits: number, flag: number) {
    return (bits & flag) === flag;
}
function set(bits: number, flag: number, on: boolean) {
    return on ? (bits | flag) : (bits & ~flag);
}

export function ShowStyleComponent({
                                   bits,
                                   disabled,
                                   onChangeBits,
                               }: Props) {
    return (
        <div style={{ display: "grid", gap: 6,padding:8,        borderRight: "1px solid #eee"}}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
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
const chkCell: React.CSSProperties={
        width: 50,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
}

const chkInput: React.CSSProperties={
    width: 18,
        height: 18,
        margin: 0,
}

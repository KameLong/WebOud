import { useEffect, useRef, useState } from "react";
import type { StopTimeDto } from "../domain/dto.ts";
import { isValidTimeStr, timeInt2Str, timeStr2Int } from "../domain/utils.ts";
import type { Part } from "../domain/types.ts";

/**
 * 駅の着・発時刻と停車種別を編集するダイアログです。
 *
 * @param props state:開閉状態と最初の入力文字 / stationName,trainNo:見出し表示 / cursorPart:最初にフォーカスするパート / initial:編集前の時刻 / onCancel:閉じる / onSave:保存
 */
export function StopTimeEditDialog(props: {
    state: { open: boolean; initialInput: string };
    stationName: string;
    trainNo: string;
    cursorPart: Part;
    initial: StopTimeDto | undefined;
    onCancel: () => void;
    onSave: (v: StopTimeDto) => void;
}) {
    const { state, stationName, trainNo, initial, onCancel, onSave, cursorPart } = props;

    const [ariStr, setAriStr] = useState("");
    const [depStr, setDepStr] = useState("");
    const [stopType, setStopType] = useState<number>(0);
    const [warning, setWarning] = useState("");

    const depRef = useRef<HTMLInputElement | null>(null);
    const ariRef = useRef<HTMLInputElement | null>(null);
    useEffect(() => {
        if (!state.open) {
            setAriStr("");
            setDepStr("");
            setStopType(0);
            setWarning("");
            return;
        }
        requestAnimationFrame(() => {
            switch (cursorPart) {
                case "dep":
                    depRef.current?.focus();
                    if (state.initialInput.length > 0) {
                        setDepStr(state.initialInput);
                    }
                    break;
                case "arr":
                    ariRef.current?.focus();
                    if (state.initialInput.length > 0) {
                        setAriStr(state.initialInput);
                    }
                    break;
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.open]);
    useEffect(() => {
        if (!initial) return;
        if (initial.ariTime >= 0) {
            setAriStr(timeInt2Str(initial.ariTime, false));
        }
        if (initial.depTime >= 0) {
            setDepStr(timeInt2Str(initial.depTime, false));
        }
        setStopType(initial.stopType ?? 0);
    }, [initial]);

    if (!state.open) return null;

    function submit() {
        if (!initial) {
            return;
        }
        if (!isValidTimeStr(ariStr) || !isValidTimeStr(depStr)) {
            setWarning("時刻は hmm / hhmm / hh:mm 形式（時0〜23・分0〜59）で入力してください");
            return;
        }
        setWarning("");
        const resultStopTime: StopTimeDto = { ...initial };
        resultStopTime.ariTime = timeStr2Int(ariStr);
        resultStopTime.depTime = timeStr2Int(depStr);
        resultStopTime.stopType = stopType;

        if (resultStopTime.stopType === 0 || resultStopTime.stopType === 3) {
            if (resultStopTime.ariTime >= 0 || resultStopTime.depTime >= 0) {
                resultStopTime.stopType = 1;
            }
        }
        onSave(resultStopTime);
    }

    return (
        <div
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
            }}
        >
            <div
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                    width: 360,
                    background: "#fff",
                    borderRadius: 10,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                    padding: 14,
                }}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        e.preventDefault();
                        onCancel();
                    } else if (e.key === "Enter") {
                        e.preventDefault();
                        submit();
                    }
                }}
            >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>時刻編集</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
                    {stationName} / {trainNo}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "#444" }}>着</div>
                    <input
                        ref={ariRef}
                        value={ariStr}
                        onChange={(e) => {
                            setAriStr(e.target.value);
                            setWarning("");
                        }}
                        placeholder="hhmm または hh:mm"
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
                    />

                    <div style={{ fontSize: 12, color: "#444" }}>発</div>
                    <input
                        ref={depRef}
                        value={depStr}
                        onChange={(e) => {
                            setDepStr(e.target.value);
                            setWarning("");
                        }}
                        placeholder=""
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
                    />

                    <div style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>停車種別</div>

                    <div style={{ marginTop: 12 }}>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <label>
                                <input type="radio" name="stopType" value={0} checked={stopType === 0} onChange={() => setStopType(0)} />
                                運行なし
                            </label>

                            <label>
                                <input type="radio" name="stopType" value={1} checked={stopType === 1} onChange={() => setStopType(1)} />
                                停車
                            </label>

                            <label>
                                <input type="radio" name="stopType" value={2} checked={stopType === 2} onChange={() => setStopType(2)} />
                                通過
                            </label>

                            <label>
                                <input type="radio" name="stopType" value={3} checked={stopType === 3} onChange={() => setStopType(3)} />
                                経由なし
                            </label>
                        </div>
                    </div>
                </div>

                {warning && (
                    <div role="alert" style={{ color: "crimson", fontSize: 12, marginTop: 10 }}>
                        {warning}
                    </div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                    <button onClick={onCancel} style={{ padding: "8px 12px" }}>
                        キャンセル
                    </button>
                    <button onClick={submit} disabled={!initial} style={{ padding: "8px 12px" }}>
                        保存
                    </button>
                </div>
            </div>
        </div>
    );
}

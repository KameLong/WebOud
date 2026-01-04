import React, { useEffect, useMemo, useRef, useState } from "react";
import type {TripDto} from "../../server/DTO/TripDTO.ts";

export type TrainTypeOption = {
    id: number;
    name: string;
};


export function TrainPropertyDialog(props: {
    open: boolean;
    title?: string; // "列車のプロパティ"
    trainTypes: TrainTypeOption[];
    initial: TripDto|undefined;
    onCancel: () => void;
    onSave: (v: TripDto) => void;
}) {
    const { open, title, trainTypes, initial, onCancel, onSave } = props;

    const [no, setNo] = useState("");
    const [trainTypeID, setTrainTypeID] = useState<number>(0);
    const [name, setName] = useState("");
    const [remark, setRemark] = useState("");
    const [isEmpty, setIsEmpty] = useState(false);

    const noRef = useRef<HTMLInputElement | null>(null);

    // trainTypes が空の場合のフォールバック
    const fallbackTrainTypeID = useMemo(() => {
        return trainTypes.length ? trainTypes[0].id : 0;
    }, [trainTypes]);

    useEffect(() => {
        if (!open) return;
        if(!initial) return;
        setNo(initial.no ?? "");
        setTrainTypeID(initial.trainTypeID ?? fallbackTrainTypeID);
        setName(initial.name ?? "");
        // setRemark(initial.remark ?? "");
        // setIsEmpty(!!initial.isEmpty);

        requestAnimationFrame(() => noRef.current?.focus());
    }, [open, initial, fallbackTrainTypeID]);

    if (!open) return null;

    function submit() {
        if(!initial)return;
        onSave({...initial,
            no:no,
            trainTypeID:trainTypeID,
            name:name,
        })
        // onSave({
        //     no: no.trim(),
        //     trainTypeID,
        //     name: name.trim(),
        //     // remark: remark.trim(),
        //     // isEmpty,
        // });
    }

    return (
        <div
            onMouseDown={(e) => {
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
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        e.preventDefault();
                        onCancel();
                    } else if (e.key === "Enter") {
                        // テキストエリア改行は許したい場合は条件分岐してください
                        e.preventDefault();
                        submit();
                    }
                }}
                style={{
                    width: 420,
                    background: "#fff",
                    borderRadius: 10,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                    padding: 14,
                }}
            >
                <div style={{ fontWeight: 700, marginBottom: 10 }}>
                    {title ?? "列車のプロパティ"}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "#444" }}>列車番号</div>
                    <input
                        ref={noRef}
                        value={no}
                        onChange={(e) => setNo(e.target.value)}
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
                        placeholder="例: 123"
                    />

                    <div style={{ fontSize: 12, color: "#444" }}>列車種別</div>
                    <select
                        value={trainTypeID}
                        onChange={(e) => setTrainTypeID(Number(e.target.value))}
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
                    >
                        {trainTypes.length === 0 ? (
                            <option value={0}>(種別なし)</option>
                        ) : (
                            trainTypes.map((tt) => (
                                <option key={tt.id} value={tt.id}>
                                    {tt.name}
                                </option>
                            ))
                        )}
                    </select>

                    <div style={{ fontSize: 12, color: "#444" }}>列車名</div>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
                        placeholder="任意"
                    />

                    {/*<div style={{ fontSize: 12, color: "#444" }}>備考</div>*/}
                    {/*<input*/}
                    {/*    value={remark}*/}
                    {/*    onChange={(e) => setRemark(e.target.value)}*/}
                    {/*    style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}*/}
                    {/*    placeholder="任意"*/}
                    {/*/>*/}

                    {/*<div />*/}
                    {/*<label style={{ display: "flex", gap: 8, alignItems: "center", userSelect: "none" }}>*/}
                    {/*    <input type="checkbox" checked={isEmpty} onChange={(e) => setIsEmpty(e.target.checked)} />*/}
                    {/*    <span style={{ fontSize: 12, color: "#444" }}>空行</span>*/}
                    {/*</label>*/}
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                    <button onClick={onCancel} style={{ padding: "8px 12px" }}>
                        キャンセル
                    </button>
                    <button onClick={submit} style={{ padding: "8px 12px" }}>
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}

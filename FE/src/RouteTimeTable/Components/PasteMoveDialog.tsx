import React, { useEffect, useRef, useState } from "react";

export function PasteMoveDialog(props: {
    open: boolean;
    value: { minutes: number; seconds: number };
    onCancel: () => void;
    onSave: (v: { minutes: number; seconds: number }) => void;
}) {
    const { open, value, onCancel, onSave } = props;

    const [minStr, setMinStr] = useState("");
    const [secStr, setSecStr] = useState("");

    const minRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) return;
        setMinStr(String(value.minutes ?? 0));
        setSecStr(String(value.seconds ?? 0));
        requestAnimationFrame(() => minRef.current?.focus());
    }, [open, value.minutes, value.seconds]);

    if (!open) return null;

    function submit() {
        const m = Math.max(0, parseInt(minStr || "0", 10) || 0);
        const sRaw = parseInt(secStr || "0", 10) || 0;
        const s = Math.max(0, Math.min(59, sRaw)); // 秒は0..59に丸め（必要なら外してOK）
        onSave({ minutes: m, seconds: s });
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
                        e.preventDefault();
                        submit();
                    }
                }}
                style={{
                    width: 360,
                    background: "#fff",
                    borderRadius: 10,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                    padding: 14,
                }}
            >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>貼り付け移動量</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
                    Ctrl+V のたびに、この量が累積で加算されます
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "#444" }}>分</div>
                    <input
                        ref={minRef}
                        value={minStr}
                        onChange={(e) => setMinStr(e.target.value.replace(/[^\d]/g, ""))}
                        inputMode="numeric"
                        placeholder="例: 1"
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
                    />

                    <div style={{ fontSize: 12, color: "#444" }}>秒</div>
                    <input
                        value={secStr}
                        onChange={(e) => setSecStr(e.target.value.replace(/[^\d]/g, ""))}
                        inputMode="numeric"
                        placeholder="0〜59"
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
                    />
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                    <button onClick={onCancel} style={{ padding: "8px 12px" }}>
                        キャンセル
                    </button>
                    <button onClick={submit} style={{ padding: "8px 12px" }}>
                        保存
                    </button>
                </div>
            </div>
        </div>
    );
}

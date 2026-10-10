import { useRef, useState } from "react";
import { isImeComposing } from "../domain/utils.ts";

/**
 * 列車貼り付け時の時刻移動量（分・秒）を設定するダイアログです。
 * 負の値（時刻を戻す）も指定できます。マイナスは「分」の欄に付けます（例：-1分30秒 = 90秒戻す）。
 * 開くと「分」の欄の値が選択された状態になり、そのまま入力すると置き換わります。
 *
 * @param props open:表示中か / value:現在の移動量（秒。負の値なら戻す） / onCancel:閉じる / onSave:保存（移動量を秒で渡す。秒の欄は0〜59に丸める）
 */
export function PasteMoveDialog(props: { open: boolean; value: number; onCancel: () => void; onSave: (seconds: number) => void }) {
    if (!props.open) return null;
    // 開くたびに本体を新しく作り直すので、入力欄の初期値は最初の描画から入っている
    return <PasteMoveDialogBody value={props.value} onCancel={props.onCancel} onSave={props.onSave} />;
}

/**
 * ダイアログの本体。「分」の欄は、表示された瞬間にフォーカスして全選択する
 * （値が入った後に選択するため、描画のタイミングに左右されない）。
 *
 * @param props value:現在の移動量（秒） / onCancel:閉じる / onSave:保存
 */
function PasteMoveDialogBody(props: { value: number; onCancel: () => void; onSave: (seconds: number) => void }) {
    const { value, onCancel, onSave } = props;

    const [minStr, setMinStr] = useState(() => `${value < 0 ? "-" : ""}${Math.floor(Math.abs(value) / 60)}`);
    const [secStr, setSecStr] = useState(() => String(Math.abs(value) % 60));

    const minRef = useRef<HTMLInputElement | null>(null);

    /** 分の欄の符号を反転する（「-」を直接打てない端末向け） */
    function toggleSign() {
        setMinStr((s) => (s.startsWith("-") ? s.slice(1) : `-${s}`));
    }

    function submit() {
        const negative = minStr.trim().startsWith("-");
        const m = Math.abs(parseInt(minStr.replace("-", "") || "0", 10) || 0);
        const s = Math.max(0, Math.min(59, parseInt(secStr || "0", 10) || 0));
        const total = m * 60 + s;
        onSave(negative ? -total : total);
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
                    // 日本語の変換確定のEnter/Escapeでダイアログを閉じたり決定したりしない
                    if (isImeComposing(e)) return;
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
                <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>Ctrl+V のたびに、この量が累積で加算されます（0なら移動せず、そのまま貼り付けます。マイナスなら時刻を戻します）。コピー・切り取りのたびに0へ戻ります</div>

                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "#444" }}>分</div>
                    <div style={{ display: "flex", gap: 6 }}>
                        <input
                            ref={minRef}
                            autoFocus
                            onFocus={(e) => e.currentTarget.select()}
                            value={minStr}
                            onChange={(e) => setMinStr(e.target.value.replace(/[^\d-]/g, "").replace(/(?!^)-/g, ""))}
                            inputMode="text"
                            placeholder="例: 1（戻すときは -1）"
                            style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, flex: 1, minWidth: 0 }}
                        />
                        <button type="button" onClick={toggleSign} title="プラス/マイナスを切り替え" style={{ padding: "4px 10px" }}>
                            ±
                        </button>
                    </div>

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

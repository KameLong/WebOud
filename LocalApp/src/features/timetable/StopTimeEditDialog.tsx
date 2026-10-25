import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "../../shared/hooks/useIsMobile.ts";
import { isImeComposing } from "../../shared/lib/keyboard.ts";
import type { StopTimeDto } from "../../domain/dto.ts";
import { isValidTimeStr, timeInt2Str, timeStr2Int } from "../../domain/time.ts";
import type { Part } from "../../domain/showStyle.ts";
import { useT } from "./messages.ts";
import { useCommonT } from "../../shared/i18n/common.ts";

/** キーパッドのボタンのスタイル */
const padKeyStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600, padding: 0, minWidth: 0 };

/**
 * スマホ用の時刻入力キーパッド。システムのキーボードを出さずに、数字入力・1文字削除・消去・着/発の切り替え・決定を行う。
 * 画面下端に固定表示する。ボタンを押してもフォーカスが入力欄から外れないようにしている。
 *
 * @param props onDigit:数字 / onBackspace:1文字削除 / onClear:入力中の欄を空にする / onSwitch:着と発を切り替える / onOk:決定 / okDisabled:決定を押せないか
 */
function TimePad(props: { onDigit: (d: string) => void; onBackspace: () => void; onClear: () => void; onSwitch: () => void; onOk: () => void; okDisabled: boolean }) {
    const { t } = useT();
    const keepFocus = (e: React.MouseEvent) => e.preventDefault();
    const digit = (d: string) => (
        <button key={d} onMouseDown={keepFocus} onClick={() => props.onDigit(d)} style={padKeyStyle}>
            {d}
        </button>
    );
    return (
        <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gridTemplateRows: "repeat(4, 52px)",
                gap: 4,
                padding: "6px 6px calc(6px + env(safe-area-inset-bottom, 0px))",
                background: "#f0f0f0",
                borderTop: "1px solid #ccc",
                boxSizing: "border-box",
                zIndex: 10000,
            }}
        >
            {["1", "2", "3"].map(digit)}
            <button onMouseDown={keepFocus} onClick={props.onBackspace} style={padKeyStyle} title={t("padBackspaceTitle")}>
                ⌫
            </button>
            {["4", "5", "6"].map(digit)}
            <button onMouseDown={keepFocus} onClick={props.onClear} style={{ ...padKeyStyle, fontSize: 14 }}>
                {t("padClear")}
            </button>
            {["7", "8", "9"].map(digit)}
            <button onMouseDown={keepFocus} onClick={props.onSwitch} style={{ ...padKeyStyle, fontSize: 13 }} title={t("padSwitchTitle")}>
                {t("padSwitch")}
            </button>
            {digit("0")}
            <button onMouseDown={keepFocus} onClick={props.onOk} disabled={props.okDisabled} style={{ ...padKeyStyle, gridColumn: "span 3", fontSize: 16 }}>
                {t("padOk")}
            </button>
        </div>
    );
}

/**
 * 駅の着・発時刻と停車種別を編集するダイアログです。
 * スマホでは、システムのキーボードを出さず、画面下部の専用キーパッド（TimePad）で入力します。
 * 欄をタップした直後の最初の数字は、入っていた値を置き換えます。
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
    const { t } = useT();
    const c = useCommonT().t;

    const [ariStr, setAriStr] = useState("");
    const [depStr, setDepStr] = useState("");
    const [stopType, setStopType] = useState<number>(0);
    const [warning, setWarning] = useState("");
    const isMobile = useIsMobile();
    // スマホのキーパッドで入力する欄と、「次の数字で値を置き換えるか」
    const [activeField, setActiveField] = useState<"ari" | "dep">("dep");
    const [replaceNext, setReplaceNext] = useState(false);

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
        setActiveField(cursorPart === "arr" ? "ari" : "dep");
        // 開いたとき既存の値があれば、最初の数字で置き換える（数字キーで開いた場合は、その数字を入れ済みなので追記）
        setReplaceNext(state.initialInput.length === 0);
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
            // 欄へのフォーカスで「置き換えモード」になるので、数字キーで開いた場合は追記モードに戻す
            setReplaceNext(state.initialInput.length === 0);
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

    /**
     * キーパッドの数字を、入力中の欄へ入れる
     *
     * @param d 数字（"0"〜"9"）
     */
    function padDigit(d: string) {
        const set = activeField === "ari" ? setAriStr : setDepStr;
        set((cur) => (replaceNext ? d : cur.length >= 4 ? cur : cur + d));
        setReplaceNext(false);
        setWarning("");
    }

    /** キーパッドで入力中の欄の末尾を1文字消す */
    function padBackspace() {
        (activeField === "ari" ? setAriStr : setDepStr)((cur) => cur.slice(0, -1));
        setReplaceNext(false);
        setWarning("");
    }

    /** キーパッドで入力中の欄を空にする */
    function padClear() {
        (activeField === "ari" ? setAriStr : setDepStr)("");
        setReplaceNext(false);
        setWarning("");
    }

    /** 着と発の入力欄を切り替える（切り替えた欄は、最初の数字で値を置き換える） */
    function padSwitch() {
        const next = activeField === "ari" ? "dep" : "ari";
        setActiveField(next);
        setReplaceNext(true);
        (next === "ari" ? ariRef : depRef).current?.focus();
    }

    function submit() {
        if (!initial) {
            return;
        }
        if (!isValidTimeStr(ariStr) || !isValidTimeStr(depStr)) {
            setWarning(t("editWarning"));
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
                // スマホでは、画面下部のキーパッドに隠れないよう、ダイアログを上寄せにする
                alignItems: isMobile ? "flex-start" : "center",
                justifyContent: "center",
                paddingTop: isMobile ? 12 : 0,
                zIndex: 9999,
            }}
        >
            <div
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                    width: isMobile ? "calc(100% - 24px)" : 360,
                    maxWidth: 360,
                    background: "#fff",
                    borderRadius: 10,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                    padding: 14,
                }}
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
            >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{t("editTitle")}</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
                    {stationName} / {trainNo}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "#444" }}>{c("arr")}</div>
                    <input
                        ref={ariRef}
                        // スマホではシステムのキーボードを出さず、下部のキーパッドで入力する
                        readOnly={isMobile}
                        inputMode={isMobile ? "none" : undefined}
                        onFocus={() => {
                            setActiveField("ari");
                            setReplaceNext(true);
                        }}
                        value={ariStr}
                        onChange={(e) => {
                            setAriStr(e.target.value);
                            setWarning("");
                        }}
                        placeholder={t("timePlaceholder")}
                        style={{ padding: "8px 10px", border: isMobile && activeField === "ari" ? "2px solid #0f5b8a" : "1px solid #ddd", borderRadius: 8 }}
                    />

                    <div style={{ fontSize: 12, color: "#444" }}>{c("dep")}</div>
                    <input
                        ref={depRef}
                        readOnly={isMobile}
                        inputMode={isMobile ? "none" : undefined}
                        onFocus={() => {
                            setActiveField("dep");
                            setReplaceNext(true);
                        }}
                        value={depStr}
                        onChange={(e) => {
                            setDepStr(e.target.value);
                            setWarning("");
                        }}
                        placeholder=""
                        style={{ padding: "8px 10px", border: isMobile && activeField === "dep" ? "2px solid #0f5b8a" : "1px solid #ddd", borderRadius: 8 }}
                    />

                    <div style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>{t("stopKind")}</div>

                    <div style={{ marginTop: 12 }}>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <label>
                                <input type="radio" name="stopType" value={0} checked={stopType === 0} onChange={() => setStopType(0)} />
                                {t("stopNone")}
                            </label>

                            <label>
                                <input type="radio" name="stopType" value={1} checked={stopType === 1} onChange={() => setStopType(1)} />
                                {t("stopStop")}
                            </label>

                            <label>
                                <input type="radio" name="stopType" value={2} checked={stopType === 2} onChange={() => setStopType(2)} />
                                {t("stopPass")}
                            </label>

                            <label>
                                <input type="radio" name="stopType" value={3} checked={stopType === 3} onChange={() => setStopType(3)} />
                                {t("stopNoVia")}
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
                        {c("cancel")}
                    </button>
                    <button onClick={submit} disabled={!initial} style={{ padding: "8px 12px" }}>
                        {c("save")}
                    </button>
                </div>
            </div>
            {isMobile && <TimePad onDigit={padDigit} onBackspace={padBackspace} onClear={padClear} onSwitch={padSwitch} onOk={submit} okDisabled={!initial} />}
        </div>
    );
}

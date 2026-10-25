import { useEffect, useRef, useState } from "react";
import { isImeComposing } from "../../shared/lib/keyboard.ts";
import type { TripDto } from "../../domain/dto.ts";
import { useT } from "./messages.ts";
import { useCommonT } from "../../shared/i18n/common.ts";

export type TrainTypeOption = {
    id: number;
    name: string;
};

type Props = {
    open: boolean;
    title?: string;
    trainTypes: TrainTypeOption[];
    initial: TripDto | undefined;
    onCancel: () => void;
    onSave: (v: TripDto) => void;
};

/**
 * 列車番号・種別・列車名を編集するダイアログです。開くたびに、編集対象の列車の値から入力欄を作り直します。
 *
 * @param props open:表示中か / title:見出し(省略可) / trainTypes:選択肢の種別 / initial:編集対象 / onCancel:閉じる / onSave:保存
 */
export function TrainPropertyDialog(props: Props) {
    if (!props.open || !props.initial) return null;
    return <TrainPropertyBody key={props.initial.id} {...props} initial={props.initial} />;
}

/**
 * ダイアログの本体（入力欄の状態を持つ）。
 *
 * @param props TrainPropertyDialogと同じ（initialは必須）
 */
function TrainPropertyBody({ title, trainTypes, initial, onCancel, onSave }: Props & { initial: TripDto }) {
    const { t } = useT();
    const c = useCommonT().t;
    const [no, setNo] = useState(initial.no ?? "");
    const [trainTypeID, setTrainTypeID] = useState<number>(initial.trainTypeID ?? trainTypes[0]?.id ?? 0);
    const [name, setName] = useState(initial.name ?? "");

    const noRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        requestAnimationFrame(() => noRef.current?.focus());
    }, []);

    function submit() {
        onSave({ ...initial, no, trainTypeID, name });
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
                    width: 420,
                    background: "#fff",
                    borderRadius: 10,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                    padding: 14,
                }}
            >
                <div style={{ fontWeight: 700, marginBottom: 10 }}>{title ?? t("propTitle")}</div>

                <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "#444" }}>{c("trainNo")}</div>
                    <input
                        ref={noRef}
                        value={no}
                        onChange={(e) => setNo(e.target.value)}
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
                        placeholder={t("propNoPlaceholder")}
                    />

                    <div style={{ fontSize: 12, color: "#444" }}>{c("trainType")}</div>
                    <select
                        value={trainTypeID}
                        onChange={(e) => setTrainTypeID(Number(e.target.value))}
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
                    >
                        {trainTypes.length === 0 ? (
                            <option value={0}>{t("propNoTypes")}</option>
                        ) : (
                            trainTypes.map((tt) => (
                                <option key={tt.id} value={tt.id}>
                                    {tt.name}
                                </option>
                            ))
                        )}
                    </select>

                    <div style={{ fontSize: 12, color: "#444" }}>{c("trainName")}</div>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
                        placeholder={t("propNamePlaceholder")}
                    />
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                    <button onClick={onCancel} style={{ padding: "8px 12px" }}>
                        {c("cancel")}
                    </button>
                    <button onClick={submit} style={{ padding: "8px 12px" }}>
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}

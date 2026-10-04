import React, { useRef, useState, useSyncExternalStore } from "react";
import { IndexedListComponent, type RowRenderProps } from "../components/IndexedListComponent.tsx";
import type { TrainTypeDto } from "../domain/dto.ts";
import * as timetableApi from "../store/timetableApi.ts";
import { getRoute, subscribe } from "../store/localStore.ts";

const EMPTY_TYPES: TrainTypeDto[] = [];

/** 使用中の種別を削除するときの選択結果 */
type DeleteChoice = { kind: "cancel" } | { kind: "deleteTrips" } | { kind: "reassign"; toId: number };

/**
 * 削除しようとしている種別を使っている列車があるときに、対処方法を選ばせるダイアログです。
 *
 * @param props tripCount:該当列車数 / candidates:付け替え先にできる種別（削除対象を除く） / onChoose:選択結果を返す
 */
function DeleteTrainTypeDialog(props: { tripCount: number; candidates: TrainTypeDto[]; onChoose: (c: DeleteChoice) => void }) {
    const { tripCount, candidates, onChoose } = props;
    const [mode, setMode] = useState<"deleteType" | "deleteTrips" | "reassign">("deleteTrips");
    const [toId, setToId] = useState<number>(candidates[0]?.id ?? 0);

    // 種別だけを削除する場合は該当列車が残ってしまうため、選択肢は「列車も削除」「別種別に変更」の2つ
    const canReassign = candidates.length > 0;

    function submit() {
        if (mode === "reassign" && canReassign) onChoose({ kind: "reassign", toId });
        else onChoose({ kind: "deleteTrips" });
    }

    return (
        <div
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onChoose({ kind: "cancel" });
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
                        onChoose({ kind: "cancel" });
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
                <div style={{ fontWeight: 700, marginBottom: 8 }}>使用中の種別を削除します</div>
                <div style={{ fontSize: 13, color: "crimson", marginBottom: 10 }}>この種別を使っている列車が {tripCount} 本あります。どう処理しますか？</div>

                <label style={{ display: "block", marginBottom: 8 }}>
                    <input type="radio" name="delType" checked={mode === "deleteTrips"} onChange={() => setMode("deleteTrips")} />
                    種別を削除し、該当列車もすべて削除する
                </label>
                <label
                    style={{
                        display: "block",
                        marginBottom: 8,
                        opacity: canReassign ? 1 : 0.5,
                    }}
                >
                    <input type="radio" name="delType" disabled={!canReassign} checked={mode === "reassign"} onChange={() => setMode("reassign")} />
                    種別を削除し、該当列車を別の種別に変更する
                </label>
                {mode === "reassign" && canReassign && (
                    <select value={toId} onChange={(e) => setToId(Number(e.target.value))} style={{ marginLeft: 22, marginBottom: 8 }}>
                        {candidates.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                )}
                {!canReassign && <div style={{ fontSize: 12, color: "#666", marginLeft: 22 }}>変更先の種別がありません</div>}

                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                        marginTop: 14,
                    }}
                >
                    <button onClick={() => onChoose({ kind: "cancel" })} style={{ padding: "8px 12px" }}>
                        キャンセル
                    </button>
                    <button onClick={submit} style={{ padding: "8px 12px" }}>
                        削除する
                    </button>
                </div>
            </div>
        </div>
    );
}

const COL = {
    name: 140,
    short: 70,
    color: 50,
    chk: 40,
    style: 100,
};

const styles: Record<string, React.CSSProperties> = {
    row: {
        display: "flex",
        alignItems: "stretch",
        borderTop: "1px solid #eee",
        borderLeft: "1px solid #ddd",
        borderRight: "1px solid #ddd",
        borderBottom: "1px solid #eee",
    },
    headRow: {
        borderTop: "none",
        background: "#fafafa",
        fontWeight: 600,
    },
    cell: {
        padding: 8,
        boxSizing: "border-box",
        borderRight: "1px solid #eee",
        display: "flex",
        alignItems: "center",
    },
    nameCell: { width: COL.name, minWidth: COL.name, maxWidth: COL.name },
    shortCell: { width: COL.short, minWidth: COL.short, maxWidth: COL.short },
    colorCell: {
        width: COL.color,
        minWidth: COL.color,
        maxWidth: COL.color,
        justifyContent: "center",
    },
    chkCell: {
        width: COL.chk,
        minWidth: COL.chk,
        maxWidth: COL.chk,
        justifyContent: "center",
    },
    styleCell: { width: COL.style, minWidth: COL.style, maxWidth: COL.style },
};

/**
 * 種別名を入力してEnterで種別を追加する最下行です。
 *
 * @param routeId 路線ID
 * @param itemCount 現在の種別数（末尾に追加するときの挿入位置）
 */
function AppendTrainTypeRow({ routeId, itemCount }: { routeId: number; itemCount: number }) {
    const [newName, setNewName] = useState("");
    const inputRef = useRef<HTMLInputElement | null>(null);

    /**
     * 名前から列車種別を末尾に作成します。
     *
     * @param nameRaw 入力された種別名（前後の空白は除去、空なら何もしない）
     */
    function createByName(nameRaw: string) {
        const name = nameRaw.trim();
        if (!name) return;

        timetableApi.insertTrainTypes(routeId, itemCount, [
            { name, routeID: routeId, index: itemCount, shortName: "", color: "#000000", fontBold: false, lineBold: false, lineStyle: 0 },
        ]);

        setNewName("");
        requestAnimationFrame(() => inputRef.current?.focus());
    }

    return (
        <div style={{ ...styles.row, background: "#f0fff4" }}>
            <div style={{ ...styles.cell, ...styles.nameCell }}>
                <input
                    ref={inputRef}
                    value={newName}
                    placeholder="種別名を入力して Enter"
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            createByName(newName);
                        }
                    }}
                    style={{ padding: 10, fontSize: 16, width: "calc(100% - 20px)" }}
                />
            </div>

            <div style={{ ...styles.cell, ...styles.shortCell, color: "#666" }}>-</div>
            <div style={{ ...styles.cell, ...styles.colorCell, color: "#666" }}>-</div>
            <div style={{ ...styles.cell, ...styles.chkCell, color: "#666" }}>-</div>
            <div style={{ ...styles.cell, ...styles.chkCell, color: "#666" }}>-</div>
            <div style={{ ...styles.cell, ...styles.styleCell, color: "#666" }}>-</div>
        </div>
    );
}

function TrainTypeHeaderComponent() {
    return (
        <div style={{ display: "flex", border: "1px solid #ddd" }}>
            <div style={{ ...styles.row, ...styles.headRow }}>
                <div style={{ ...styles.cell, ...styles.nameCell }}>種別名</div>
                <div style={{ ...styles.cell, ...styles.shortCell }}>略称</div>
                <div style={{ ...styles.cell, ...styles.colorCell }}>色</div>
                <div style={{ ...styles.cell, ...styles.chkCell }}>太字</div>
                <div style={{ ...styles.cell, ...styles.chkCell }}>線太</div>
                <div style={{ ...styles.cell, ...styles.styleCell }}>線種</div>
            </div>
        </div>
    );
}

/**
 * 列車種別一覧の1行を描画します。
 *
 * @param item 表示する種別
 * @param isSelected 選択中か
 * @param onMouseDown 行のmousedownハンドラ（選択処理）
 * @param update 行の値を更新する関数（未保存変更として記録される）
 */
function TrainTypeRowComponent({ item, isSelected, onMouseDown, update }: RowRenderProps<TrainTypeDto>) {
    return (
        <div
            onMouseDown={onMouseDown}
            style={{
                ...styles.row,
                background: isSelected ? "#e6f2ff" : undefined,
            }}
        >
            <div style={{ ...styles.cell, ...styles.nameCell }}>
                <input value={item.name} onChange={(e) => update((x) => ({ ...x, name: e.target.value }))} style={{ width: "100%" }} />
            </div>

            <div style={{ ...styles.cell, ...styles.shortCell }}>
                <input value={item.shortName} onChange={(e) => update((x) => ({ ...x, shortName: e.target.value }))} style={{ width: "100%" }} />
            </div>

            <div style={{ ...styles.cell, ...styles.colorCell }}>
                <input type="color" value={item.color || "#000000"} onChange={(e) => update((x) => ({ ...x, color: e.target.value }))} />
            </div>

            <div style={{ ...styles.cell, ...styles.chkCell }}>
                <input type="checkbox" checked={item.fontBold} onChange={(e) => update((x) => ({ ...x, fontBold: e.target.checked }))} />
            </div>

            <div style={{ ...styles.cell, ...styles.chkCell }}>
                <input type="checkbox" checked={item.lineBold} onChange={(e) => update((x) => ({ ...x, lineBold: e.target.checked }))} />
            </div>

            <div style={{ ...styles.cell, ...styles.styleCell }}>
                <select value={item.lineStyle ?? 0} onChange={(e) => update((x) => ({ ...x, lineStyle: Number(e.target.value) }))} style={{ width: "100%" }}>
                    <option value={0}>実線</option>
                    <option value={1}>破線</option>
                    <option value={2}>点線</option>
                </select>
            </div>
        </div>
    );
}
/**
 * 列車種別の一覧編集UIです。
 *
 * @param routeId 編集する路線ID
 */
export default function TrainTypeListPage({ routeId }: { routeId: number }) {
    const items = useSyncExternalStore(subscribe, () => getRoute(routeId)?.trainTypes ?? EMPTY_TYPES);

    const [deleteAsk, setDeleteAsk] = useState<{
        tripCount: number;
        candidates: TrainTypeDto[];
        resolve: (c: DeleteChoice) => void;
    } | null>(null);

    /**
     * 種別の削除前確認。該当列車があれば対処方法（列車も削除/別種別へ変更）を選ばせ、選ばれた処理を実行します。
     *
     * @param ids 削除しようとしている種別ID
     */
    async function confirmDelete(ids: number[]): Promise<boolean> {
        const idSet = new Set(ids);
        const route = getRoute(routeId);
        const tripCount = (route?.trips ?? []).filter((t) => idSet.has(t.trainTypeID)).length;
        if (tripCount === 0) return confirm(`${ids.length}件削除しますか？`);

        const candidates = items.filter((t) => !idSet.has(t.id));
        const choice = await new Promise<DeleteChoice>((resolve) => setDeleteAsk({ tripCount, candidates, resolve }));
        setDeleteAsk(null);

        if (choice.kind === "cancel") return false;
        if (choice.kind === "reassign") {
            timetableApi.reassignTrainType(routeId, ids, choice.toId);
        } else {
            const tripIds = (route?.trips ?? []).filter((t) => idSet.has(t.trainTypeID)).map((t) => t.id);
            timetableApi.deleteTrips(routeId, tripIds);
        }
        return true;
    }

    return (
        <>
            <IndexedListComponent<TrainTypeDto>
                routeId={routeId}
                items={items}
                onUpdate={(item) => timetableApi.updateTrainType(routeId, item)}
                onInsert={(position, dtos) => timetableApi.insertTrainTypes(routeId, position, dtos)}
                onRemove={(ids) => timetableApi.deleteTrainTypes(routeId, ids)}
                confirmDelete={confirmDelete}
                createEmpty={(routeId, index) => ({
                    id: 0,
                    name: "",
                    routeID: routeId,
                    index,
                    shortName: "",
                    color: "#000000",
                    fontBold: false,
                    lineBold: false,
                    lineStyle: 0,
                })}
                toClip={(t) => t}
                fromClip={(c: TrainTypeDto, routeId, index) => ({
                    id: 0,
                    name: c.name ?? "",
                    routeID: routeId,
                    index,
                    shortName: c.shortName ?? "",
                    color: c.color ?? "#000000",
                    fontBold: c.fontBold,
                    lineBold: c.lineBold,
                    lineStyle: Number(c.lineStyle ?? 0),
                })}
                HeaderComponent={TrainTypeHeaderComponent}
                RowComponent={TrainTypeRowComponent}
                AppendRowComponent={<AppendTrainTypeRow routeId={routeId} itemCount={items.length} />}
            />
            {deleteAsk && <DeleteTrainTypeDialog tripCount={deleteAsk.tripCount} candidates={deleteAsk.candidates} onChoose={deleteAsk.resolve} />}
        </>
    );
}

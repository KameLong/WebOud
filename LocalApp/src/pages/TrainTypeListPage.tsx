import { ActionIcon, Button, Checkbox, ColorPicker, ColorSwatch, Group, Modal, NativeSelect, Popover, Radio, Stack, Text, TextInput } from "@mantine/core";
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
    const [mode, setMode] = useState<"deleteTrips" | "reassign">("deleteTrips");
    const [toId, setToId] = useState<number>(candidates[0]?.id ?? 0);

    // 該当列車が残らないよう、選択肢は「列車も削除」「別種別に変更」の2つ
    const canReassign = candidates.length > 0;

    function submit() {
        if (mode === "reassign" && canReassign) onChoose({ kind: "reassign", toId });
        else onChoose({ kind: "deleteTrips" });
    }

    return (
        <Modal opened onClose={() => onChoose({ kind: "cancel" })} title="使用中の種別を削除します" centered size="sm" styles={{ title: { fontWeight: 700 } }}>
            <Stack gap="sm">
                <Text size="sm" c="red">
                    この種別を使っている列車が {tripCount} 本あります。どう処理しますか？
                </Text>
                <Radio.Group value={mode} onChange={(v) => setMode(v as "deleteTrips" | "reassign")}>
                    <Stack gap="xs">
                        <Radio value="deleteTrips" label="種別を削除し、該当列車もすべて削除する" />
                        <Radio value="reassign" disabled={!canReassign} label="種別を削除し、該当列車を別の種別に変更する" />
                    </Stack>
                </Radio.Group>
                {mode === "reassign" && canReassign && (
                    <NativeSelect
                        value={String(toId)}
                        onChange={(e) => setToId(Number(e.currentTarget.value))}
                        data={candidates.map((t) => ({ value: String(t.id), label: t.name }))}
                        aria-label="変更先の種別"
                    />
                )}
                {!canReassign && (
                    <Text size="xs" c="dimmed">
                        変更先の種別がありません
                    </Text>
                )}
                <Group justify="flex-end" gap="xs">
                    <Button variant="default" onClick={() => onChoose({ kind: "cancel" })}>
                        キャンセル
                    </Button>
                    <Button color="red" onClick={submit}>
                        削除する
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

/**
 * 色の選択。丸い見本をクリックするとカラーピッカーが開き、選択を終えたとき(マウスを離したとき)に確定する。
 *
 * @param props color:現在の色(#RRGGBB) / onCommit:確定した色を受け取るコールバック
 */
function ColorCell(props: { color: string; onCommit: (color: string) => void }) {
    const color = props.color || "#000000";
    return (
        <Popover withArrow shadow="md" position="bottom" withinPortal>
            <Popover.Target>
                <ColorSwatch component="button" type="button" color={color} size={22} style={{ cursor: "pointer" }} aria-label="色を選択" />
            </Popover.Target>
            <Popover.Dropdown p="xs">
                <ColorPicker
                    key={color}
                    format="hex"
                    size="sm"
                    defaultValue={color}
                    onChangeEnd={props.onCommit}
                    swatches={["#000000", "#1a5fb4", "#26a269", "#c01c28", "#e66100", "#813d9c", "#5e5c64"]}
                    swatchesPerRow={7}
                />
            </Popover.Dropdown>
        </Popover>
    );
}

const COL = {
    name: 140,
    short: 70,
    color: 50,
    chk: 56,
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
        <div className="tt-row" style={{ ...styles.row, background: "#f0fff4" }}>
            <div className="tt-name" style={{ ...styles.cell, ...styles.nameCell }}>
                <TextInput
                    ref={inputRef}
                    style={{ width: "100%" }}
                    value={newName}
                    placeholder="種別名を入力して Enter"
                    aria-label="種別名"
                    onChange={(e) => setNewName(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            createByName(newName);
                        }
                    }}
                />
            </div>

            <div className="tt-fields tt-append-fields">
                <div style={{ ...styles.cell, ...styles.shortCell, color: "#666" }}>-</div>
                <div style={{ ...styles.cell, ...styles.colorCell, color: "#666" }}>-</div>
                <div style={{ ...styles.cell, ...styles.chkCell, color: "#666" }}>-</div>
                <div style={{ ...styles.cell, ...styles.chkCell, color: "#666" }}>-</div>
                <div style={{ ...styles.cell, ...styles.styleCell, color: "#666" }}>-</div>
            </div>
        </div>
    );
}

function TrainTypeHeaderComponent() {
    return (
        <div className="tt-header" style={{ display: "flex", border: "1px solid #ddd" }}>
            <div style={{ ...styles.row, ...styles.headRow }}>
                <div className="tt-name" style={{ ...styles.cell, ...styles.nameCell }}>
                    種別名
                </div>
                <div className="tt-fields">
                    <div style={{ ...styles.cell, ...styles.shortCell }}>略称</div>
                    <div style={{ ...styles.cell, ...styles.colorCell }}>色</div>
                    <div style={{ ...styles.cell, ...styles.chkCell }}>太字</div>
                    <div style={{ ...styles.cell, ...styles.chkCell }}>線太</div>
                    <div style={{ ...styles.cell, ...styles.styleCell }}>線種</div>
                </div>
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
function TrainTypeRowComponent({ item, isSelected, onMouseDown, update, remove }: RowRenderProps<TrainTypeDto>) {
    return (
        <div
            className="tt-row"
            onMouseDown={onMouseDown}
            style={{
                ...styles.row,
                background: isSelected ? "#e6f2ff" : undefined,
            }}
        >
            <div className="tt-name" style={{ ...styles.cell, ...styles.nameCell }}>
                <div className="tt-name-inner">
                    <TextInput
                        size="xs"
                        style={{ flex: 1, minWidth: 0 }}
                        value={item.name}
                        aria-label="種別名"
                        onChange={(e) => update((x) => ({ ...x, name: e.currentTarget.value }))}
                    />
                    {/* スマホ幅のみ：種別名の右側に削除ボタン（PC幅ではキーボードのDeleteで削除） */}
                    <ActionIcon
                        className="tt-delete"
                        variant="subtle"
                        color="red"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={remove}
                        aria-label={`${item.name}を削除`}
                        title="この種別を削除"
                    >
                        ✕
                    </ActionIcon>
                </div>
            </div>

            <div className="tt-fields">
                <div className="tt-field tt-field-short" style={{ ...styles.cell, ...styles.shortCell }}>
                    <span className="tt-label">略称</span>
                    <TextInput size="xs" value={item.shortName} aria-label="略称" onChange={(e) => update((x) => ({ ...x, shortName: e.currentTarget.value }))} />
                </div>

                <div className="tt-field tt-field-color" style={{ ...styles.cell, ...styles.colorCell }}>
                    <span className="tt-label">色</span>
                    <ColorCell color={item.color} onCommit={(color) => update((x) => ({ ...x, color }))} />
                </div>

                <label className="tt-field" style={{ ...styles.cell, ...styles.chkCell }}>
                    <span className="tt-label">太字</span>
                    <Checkbox size="md" checked={item.fontBold} aria-label="太字" onChange={(e) => update((x) => ({ ...x, fontBold: e.currentTarget.checked }))} />
                </label>

                <label className="tt-field" style={{ ...styles.cell, ...styles.chkCell }}>
                    <span className="tt-label">線太</span>
                    <Checkbox size="md" checked={item.lineBold} aria-label="線太" onChange={(e) => update((x) => ({ ...x, lineBold: e.currentTarget.checked }))} />
                </label>

                <div className="tt-field" style={{ ...styles.cell, ...styles.styleCell }}>
                    <span className="tt-label">線種</span>
                    <NativeSelect
                        size="xs"
                        value={String(item.lineStyle ?? 0)}
                        aria-label="線種"
                        onChange={(e) => update((x) => ({ ...x, lineStyle: Number(e.currentTarget.value) }))}
                        data={[
                            { value: "0", label: "実線" },
                            { value: "1", label: "破線" },
                            { value: "2", label: "点線" },
                        ]}
                    />
                </div>
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
        <div className="train-type-list">
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
        </div>
    );
}

import { ActionIcon, Button, Checkbox, ColorPicker, ColorSwatch, Group, Modal, NativeSelect, Popover, Radio, Stack, Text, TextInput } from "@mantine/core";
import React, { useRef, useState, useSyncExternalStore } from "react";
import { defaultTrainType } from "../../domain/defaults.ts";
import { useCommonT } from "../../shared/i18n/common.ts";
import { translate, useT } from "./messages.ts";
import { isImeComposing } from "../../shared/lib/keyboard.ts";
import { TrashIcon } from "../../shared/ui/TrashIcon.tsx";
import { IndexedList, RowSelectHandle, type RowRenderProps } from "../../shared/indexed-list/IndexedList.tsx";
import type { TrainTypeDto } from "../../domain/dto.ts";
import * as timetableApi from "../../store/timetableApi.ts";
import { getRoute, subscribe } from "../../store/localStore.ts";

const EMPTY_TYPES: TrainTypeDto[] = [];

/** 付け替え先の候補として表示する「標準の種別を新しく作成」を表す仮のID */
const NEW_DEFAULT_ID = -1;

/** 使用中の種別を削除するときの選択結果 */
type DeleteChoice = { kind: "cancel" } | { kind: "deleteTrips" } | { kind: "reassign"; toId: number };

/**
 * 削除しようとしている種別を使っている列車があるときに、対処方法を選ばせるダイアログです。
 *
 * @param props tripCount:該当列車数 / candidates:付け替え先にできる種別（削除対象を除く） / onChoose:選択結果を返す
 */
function DeleteTrainTypeDialog(props: { tripCount: number; candidates: TrainTypeDto[]; onChoose: (c: DeleteChoice) => void }) {
    const { tripCount, candidates, onChoose } = props;
    const { t } = useT();
    const c = useCommonT().t;
    const [mode, setMode] = useState<"deleteTrips" | "reassign">("deleteTrips");
    const [toId, setToId] = useState<number>(candidates[0]?.id ?? 0);

    // 該当列車が残らないよう、選択肢は「列車も削除」「別種別に変更」の2つ
    const canReassign = candidates.length > 0;

    function submit() {
        if (mode === "reassign" && canReassign) onChoose({ kind: "reassign", toId });
        else onChoose({ kind: "deleteTrips" });
    }

    return (
        <Modal opened onClose={() => onChoose({ kind: "cancel" })} title={t("ttDeleteTitle")} centered size="sm" styles={{ title: { fontWeight: 700 } }}>
            <Stack gap="sm">
                <Text size="sm" c="red">
                    {t("ttDeleteUsed", { n: tripCount })}
                </Text>
                <Radio.Group value={mode} onChange={(v) => setMode(v as "deleteTrips" | "reassign")}>
                    <Stack gap="xs">
                        <Radio value="deleteTrips" label={t("ttDeleteWithTrips")} />
                        <Radio value="reassign" disabled={!canReassign} label={t("ttDeleteReassign")} />
                    </Stack>
                </Radio.Group>
                {mode === "reassign" && canReassign && (
                    <NativeSelect
                        value={String(toId)}
                        onChange={(e) => setToId(Number(e.currentTarget.value))}
                        data={candidates.map((t) => ({ value: String(t.id), label: t.name }))}
                        aria-label={t("ttReassignTo")}
                    />
                )}
                {!canReassign && (
                    <Text size="xs" c="dimmed">
                        {t("ttNoReassignTarget")}
                    </Text>
                )}
                <Group justify="flex-end" gap="xs">
                    <Button variant="default" onClick={() => onChoose({ kind: "cancel" })}>
                        {c("cancel")}
                    </Button>
                    <Button color="red" onClick={submit}>
                        {t("ttDoDelete")}
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
    const { t } = useT();
    const color = props.color || "#000000";
    return (
        <Popover withArrow shadow="md" position="bottom" withinPortal>
            <Popover.Target>
                <ColorSwatch component="button" type="button" color={color} size={22} style={{ cursor: "pointer" }} aria-label={t("ttPickColor")} />
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
    name: 216,
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
    const { t } = useT();
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
                    placeholder={t("ttNewNamePlaceholder")}
                    aria-label={t("ttName")}
                    onChange={(e) => setNewName(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !isImeComposing(e)) {
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
    const { t } = useT();
    return (
        <div className="tt-header" style={{ display: "flex", border: "1px solid #ddd" }}>
            <div style={{ ...styles.row, ...styles.headRow }}>
                <div className="tt-name" style={{ ...styles.cell, ...styles.nameCell }}>
                    {t("ttName")}
                </div>
                <div className="tt-fields">
                    <div style={{ ...styles.cell, ...styles.shortCell }}>{t("ttShort")}</div>
                    <div style={{ ...styles.cell, ...styles.colorCell }}>{t("ttColor")}</div>
                    <div style={{ ...styles.cell, ...styles.chkCell }}>{t("ttBold")}</div>
                    <div style={{ ...styles.cell, ...styles.chkCell }}>{t("ttLineBold")}</div>
                    <div style={{ ...styles.cell, ...styles.styleCell }}>{t("ttLineStyle")}</div>
                </div>
            </div>
        </div>
    );
}

/**
 * 種別名の入力欄と、削除ボタン（ゴミ箱アイコン）。行の選択状態が変わっても再描画されないよう分離している。
 *
 * @param props item:種別 / update:種別の値を更新する関数 / remove:この種別を削除する関数
 */
const TrainTypeNameField = React.memo(function TrainTypeNameField({ item, update, remove }: Pick<RowRenderProps<TrainTypeDto>, "item" | "update" | "remove">) {
    const { t } = useT();
    return (
        <>
            <TextInput size="xs" style={{ flex: 1, minWidth: 0 }} value={item.name} aria-label={t("ttName")} onChange={(e) => update((x) => ({ ...x, name: e.currentTarget.value }))} />
            {/* 種別名の右側に削除ボタン（キーボードのDeleteや操作バーからも削除できる） */}
            <ActionIcon
                className="tt-delete"
                variant="subtle"
                color="red"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={remove}
                aria-label={t("ttDeleteOne", { name: item.name })}
                title={t("ttDeleteOneTitle")}
            >
                <TrashIcon size={16} />
            </ActionIcon>
        </>
    );
});

/**
 * 略称・色・太字・線太・線種の入力群。行の選択状態が変わっても再描画されないよう分離している（Mantineの部品が多く重いため）。
 *
 * @param props item:種別 / update:種別の値を更新する関数
 */
const TrainTypeFields = React.memo(function TrainTypeFields({ item, update }: Pick<RowRenderProps<TrainTypeDto>, "item" | "update">) {
    const { t } = useT();
    return (
        <div className="tt-fields">
            <div className="tt-field tt-field-short" style={{ ...styles.cell, ...styles.shortCell }}>
                <span className="tt-label">{t("ttShort")}</span>
                <TextInput size="xs" value={item.shortName} aria-label={t("ttShort")} onChange={(e) => update((x) => ({ ...x, shortName: e.currentTarget.value }))} />
            </div>

            <div className="tt-field tt-field-color" style={{ ...styles.cell, ...styles.colorCell }}>
                <span className="tt-label">{t("ttColor")}</span>
                <ColorCell color={item.color} onCommit={(color) => update((x) => ({ ...x, color }))} />
            </div>

            <label className="tt-field" style={{ ...styles.cell, ...styles.chkCell }}>
                <span className="tt-label">{t("ttBold")}</span>
                <Checkbox size="md" checked={item.fontBold} aria-label={t("ttBold")} onChange={(e) => update((x) => ({ ...x, fontBold: e.currentTarget.checked }))} />
            </label>

            <label className="tt-field" style={{ ...styles.cell, ...styles.chkCell }}>
                <span className="tt-label">{t("ttLineBold")}</span>
                <Checkbox size="md" checked={item.lineBold} aria-label={t("ttLineBold")} onChange={(e) => update((x) => ({ ...x, lineBold: e.currentTarget.checked }))} />
            </label>

            <div className="tt-field" style={{ ...styles.cell, ...styles.styleCell }}>
                <span className="tt-label">{t("ttLineStyle")}</span>
                <NativeSelect
                    size="xs"
                    value={String(item.lineStyle ?? 0)}
                    aria-label={t("ttLineStyle")}
                    onChange={(e) => update((x) => ({ ...x, lineStyle: Number(e.currentTarget.value) }))}
                    data={[
                        { value: "0", label: t("ttSolid") },
                        { value: "1", label: t("ttDashed") },
                        { value: "2", label: t("ttDotted") },
                    ]}
                />
            </div>
        </div>
    );
});

/**
 * 列車種別一覧の1行を描画します。
 *
 * @param item 表示する種別
 * @param isSelected 選択中か
 * @param onMouseDown 行のmousedownハンドラ（選択処理）
 * @param update 行の値を更新する関数（未保存変更として記録される）
 */
const TrainTypeRowComponent = React.memo(function TrainTypeRowComponent({ item, isSelected, onMouseDown, onSelectClick, update, remove }: RowRenderProps<TrainTypeDto>) {
    return (
        <div
            className="tt-row"
            data-row-id={item.id}
            onMouseDown={onMouseDown}
            style={{
                ...styles.row,
                background: isSelected ? "#e6f2ff" : undefined,
            }}
        >
            <div className="tt-name" style={{ ...styles.cell, ...styles.nameCell }}>
                <div className="tt-name-inner">
                    <RowSelectHandle checked={isSelected} onClick={onSelectClick} />
                    <TrainTypeNameField item={item} update={update} remove={remove} />
                </div>
            </div>

            <TrainTypeFields item={item} update={update} />
        </div>
    );
});
/**
 * 列車種別の一覧編集UIです。
 *
 * @param routeId 編集する路線ID
 */
export default function TrainTypeListEditor({ routeId }: { routeId: number }) {
    const { t } = useT();
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
        if (tripCount === 0) return confirm(translate().t("ttConfirmDelete", { n: ids.length }));

        // 付け替え先。すべての種別を削除する場合は、残る種別が無いので、標準の種別(普通)を新しく作ってそこへ付け替える
        const remaining = items.filter((t) => !idSet.has(t.id));
        const candidates: TrainTypeDto[] =
            remaining.length > 0
                ? remaining
                : [{ ...defaultTrainType(), id: NEW_DEFAULT_ID, routeID: routeId, index: 0, name: t("ttNewDefault", { name: defaultTrainType().name }) }];
        const choice = await new Promise<DeleteChoice>((resolve) => setDeleteAsk({ tripCount, candidates, resolve }));
        setDeleteAsk(null);

        if (choice.kind === "cancel") return false;
        if (choice.kind === "reassign") {
            let toId = choice.toId;
            if (toId === NEW_DEFAULT_ID) {
                // 先に標準の種別を作っておく（削除後に自動で作られるものとは別に、付け替え先として必要なため）
                toId = timetableApi.insertTrainTypes(routeId, items.length, [{ ...defaultTrainType(), routeID: routeId, index: items.length }])[0].id;
            }
            timetableApi.reassignTrainType(routeId, ids, toId);
        } else {
            const tripIds = (route?.trips ?? []).filter((t) => idSet.has(t.trainTypeID)).map((t) => t.id);
            timetableApi.deleteTrips(routeId, tripIds);
        }
        return true;
    }

    return (
        <div className="train-type-list">
            <IndexedList<TrainTypeDto>
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

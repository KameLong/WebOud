import { ActionIcon, TextInput } from "@mantine/core";
import React, { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { TrashIcon } from "../components/TrashIcon.tsx";
import { ShowStyleComponent } from "../components/ShowStyleComponent.tsx";
import { IndexedListComponent, RowSelectHandle, type RowRenderProps } from "../components/IndexedListComponent.tsx";
import type { StationDto } from "../domain/dto.ts";
import * as timetableApi from "../store/timetableApi.ts";
import { getRoute, subscribe } from "../store/localStore.ts";
import { getDirectStyle, makeShowStyle, setDirectStyle, SHOW_DEP } from "../domain/utils.ts";

const EMPTY_STATIONS: StationDto[] = [];

/** 新規駅の初期表示：下り・上りとも「発」のみ */
const DEFAULT_SHOW_STYLE = makeShowStyle(SHOW_DEP, SHOW_DEP);

// ShowStyleComponent(駅一覧の着/番線/発チェックボックス群)の実寸に合わせた値。
// 変更する場合はShowStyleComponent.tsx側のchkCell/padding/gapも揃えること。
const COL = {
    name: 240,
    block: 42 * 3 + 4 * 2 + 6 * 2,
    chk: 42,
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
    },
    nameCell: {
        width: COL.name,
        minWidth: COL.name,
        maxWidth: COL.name,
        borderRight: "1px solid #eee",
    },
    blockCell: {
        width: COL.block,
        minWidth: COL.block,
        maxWidth: COL.block,
        borderRight: "1px solid #eee",
    },
    blockTitle: {
        marginBottom: 6,
        fontSize: 14,
    },
    checkGridHead: {
        display: "grid",
        gridTemplateColumns: `${COL.chk}px ${COL.chk}px ${COL.chk}px`,
        gap: 6,
        fontSize: 12,
        color: "#666",
    },
};

/**
 * 駅名を入力してEnterで駅を追加する最下行です。
 *
 * @param routeId 路線ID
 * @param stationCount 現在の駅数（末尾に追加するときの挿入位置）
 */
function AppendComponent({ routeId, stationCount }: { routeId: number; stationCount: number }) {
    const [newName, setNewName] = useState("");
    const newInputRef = useRef<HTMLInputElement | null>(null);

    /**
     * 名前から駅を作成し、一覧へ反映します。
     *
     * @param nameRaw 入力された駅名（前後の空白は除去、空なら何もしない）
     */
    function createStationByName(nameRaw: string) {
        const name = nameRaw.trim();
        if (!name) return;

        timetableApi.insertStations(routeId, stationCount, [{ name, routeID: routeId, index: stationCount, showStyle: DEFAULT_SHOW_STYLE }]);

        setNewName("");
        requestAnimationFrame(() => newInputRef.current?.focus());
    }

    return (
        <div className="station-row station-append-row" style={{ ...styles.row, background: "#f0fff4" }}>
            <div className="station-name" style={{ ...styles.cell, ...styles.nameCell }}>
                <TextInput
                    ref={newInputRef}
                    value={newName}
                    placeholder="駅名を入力して Enter"
                    aria-label="駅名"
                    onChange={(e) => setNewName(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            createStationByName(newName);
                        }
                    }}
                />
            </div>

            <div className="station-blocks station-append-blocks">
                <ShowStyleComponent bits={4} disabled={true} />
                <ShowStyleComponent bits={4} disabled={true} />
            </div>
        </div>
    );
}

function StationHeaderComponent() {
    return (
        <div className="station-header" style={{ display: "flex", border: "1px solid #ddd" }}>
            <div className="station-row" style={{ ...styles.row, ...styles.headRow }}>
                <div className="station-name" style={{ ...styles.cell, ...styles.nameCell }}>
                    駅名
                </div>
                <div className="station-blocks">
                    <div style={{ ...styles.cell, ...styles.blockCell }}>
                        <div style={styles.blockTitle}>下り</div>
                        <div className="station-check-head" style={styles.checkGridHead}>
                            <span>着</span>
                            <span>番線</span>
                            <span>発</span>
                        </div>
                    </div>
                    <div style={{ ...styles.cell, ...styles.blockCell }}>
                        <div style={styles.blockTitle}>上り</div>
                        <div className="station-check-head" style={styles.checkGridHead}>
                            <span>着</span>
                            <span>番線</span>
                            <span>発</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * 駅一覧の1行を描画します。
 *
 * @param item 表示する駅
 * @param isSelected 選択中か
 * @param onMouseDown 行のmousedownハンドラ（選択処理）
 * @param update 行の値を更新する関数（未保存変更として記録される）
 */
/**
 * 駅と駅の間の「駅を挿入」ボタン。行の選択状態が変わっても再描画されないよう分離している。
 *
 * @param props name:駅名（ボタンのラベル用） / insertBefore:この駅の手前に挿入する処理
 */
const InsertStrip = React.memo(function InsertStrip({ name, insertBefore }: { name: string; insertBefore: () => void }) {
    return (
        <div className="station-insert">
            <ActionIcon variant="light" size="sm" radius="xl" onClick={insertBefore} aria-label={`${name}の手前に駅を挿入`} title="ここに駅を挿入">
                ＋
            </ActionIcon>
        </div>
    );
});

/**
 * 駅名の入力欄と、削除ボタン（ゴミ箱アイコン）。行の選択状態が変わっても再描画されないよう分離している。
 *
 * @param props item:駅 / update:駅の値を更新する関数 / remove:この駅を削除する関数
 */
const StationNameField = React.memo(function StationNameField({ item, update, remove }: Pick<RowRenderProps<StationDto>, "item" | "update" | "remove">) {
    const nav = useNavigate();
    return (
        <>
            <div style={{ flex: 1, minWidth: 0 }}>
                <TextInput size="xs" value={item.name} placeholder="駅名" aria-label="駅名" onChange={(e) => update((x) => ({ ...x, name: e.currentTarget.value }))} />
            </div>
            <ActionIcon
                variant="subtle"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => nav(`/route/${item.routeID}/station/${item.id}`)}
                aria-label={`${item.name}の時刻表を見る`}
                title="この駅の時刻表を見る"
            >
                🕒
            </ActionIcon>
            {/* 駅名の右側に削除ボタン（キーボードのDeleteや操作バーからも削除できる） */}
            <ActionIcon
                className="station-delete"
                variant="subtle"
                color="red"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={remove}
                aria-label={`${item.name}を削除`}
                title="この駅を削除"
            >
                <TrashIcon size={16} />
            </ActionIcon>
        </>
    );
});

/**
 * 下り・上りの着/番線/発のチェックボックス群。行の選択状態が変わっても再描画されないよう分離している（Mantineの部品が多く重いため）。
 *
 * @param props showStyle:駅の表示スタイル(下り・上り) / update:駅の値を更新する関数
 */
const StationBlocks = React.memo(function StationBlocks({ showStyle, update }: { showStyle: number; update: RowRenderProps<StationDto>["update"] }) {
    const changeDown = useCallback((bits: number) => update((x) => ({ ...x, showStyle: setDirectStyle(x.showStyle, 0, bits) })), [update]);
    const changeUp = useCallback((bits: number) => update((x) => ({ ...x, showStyle: setDirectStyle(x.showStyle, 1, bits) })), [update]);
    return (
        <div className="station-blocks">
            <ShowStyleComponent title="下り" bits={getDirectStyle(showStyle, 0)} onChangeBits={changeDown} />
            <ShowStyleComponent title="上り" bits={getDirectStyle(showStyle, 1)} onChangeBits={changeUp} />
        </div>
    );
});

const StationRowComponent = React.memo(function StationRowComponent({ item, isSelected, onMouseDown, onSelectClick, update, remove, insertBefore }: RowRenderProps<StationDto>) {
    return (
        <>
            {item.index > 0 && <InsertStrip name={item.name} insertBefore={insertBefore} />}
            <div
                className="station-row"
                data-row-id={item.id}
                onMouseDown={onMouseDown}
                style={{
                    ...styles.row,
                    background: isSelected ? "#e6f2ff" : undefined,
                }}
            >
                <div className="station-name" style={{ ...styles.cell, ...styles.nameCell }}>
                    <div className="station-name-inner">
                        <RowSelectHandle checked={isSelected} onClick={onSelectClick} />
                        <StationNameField item={item} update={update} remove={remove} />
                    </div>
                </div>

                <StationBlocks showStyle={item.showStyle} update={update} />
            </div>
        </>
    );
});

/**
 * 駅の一覧編集UIです。
 *
 * @param routeId 編集する路線ID
 */
export default function StationListPage({ routeId }: { routeId: number }) {
    const stations = useSyncExternalStore(subscribe, () => getRoute(routeId)?.stations ?? EMPTY_STATIONS);

    return (
        <div className="station-list">
            <IndexedListComponent<StationDto>
                routeId={routeId}
                items={stations}
                onUpdate={(item) => timetableApi.updateStation(routeId, item)}
                onInsert={(position, dtos) => timetableApi.insertStations(routeId, position, dtos)}
                onRemove={(ids) => timetableApi.deleteStations(routeId, ids)}
                createEmpty={(routeId, index) => ({ id: 0, name: "", routeID: routeId, index, showStyle: DEFAULT_SHOW_STYLE })}
                toClip={(s) => s}
                fromClip={(c, routeId, index) => ({ id: 0, name: c.name, routeID: routeId, index, showStyle: c.showStyle })}
                HeaderComponent={StationHeaderComponent}
                RowComponent={StationRowComponent}
                AppendRowComponent={<AppendComponent routeId={routeId} stationCount={stations.length} />}
            />
        </div>
    );
}

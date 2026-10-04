import React, { useRef, useState } from "react";
import { ShowStyleComponent } from "../components/ShowStyleComponent.tsx";
import { IndexedListComponent, type RowRenderProps } from "../components/IndexedListComponent.tsx";
import type { StationDto } from "../domain/dto.ts";
import * as timetableApi from "../store/timetableApi.ts";
import { getRoute } from "../store/localStore.ts";

// ShowStyleComponent(駅一覧の着/番線/発チェックボックス群)の実寸に合わせた値。
// 変更する場合はShowStyleComponent.tsx側のchkCell/padding/gapも揃えること。
const COL = {
    name: 200,
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
 * @param stations 現在の駅一覧（次のindex算出に使う）
 * @param setStations 駅一覧のstate更新関数
 */
function AppendComponent({ routeId, stations, setStations }: { routeId: number; stations: StationDto[]; setStations: React.Dispatch<React.SetStateAction<StationDto[]>> }) {
    const [newName, setNewName] = useState("");
    const newInputRef = useRef<HTMLInputElement | null>(null);

    function nextIndexForNewStation() {
        let max = -1;
        for (const s of stations) {
            if (s.routeID === routeId && s.index > max) max = s.index;
        }
        return max + 1;
    }
    /**
     * 名前から駅を作成し、一覧へ反映します。
     *
     * @param nameRaw 入力された駅名（前後の空白は除去、空なら何もしない）
     */
    function createStationByName(nameRaw: string) {
        const name = nameRaw.trim();
        if (!name) return;

        const created = timetableApi.addStation(routeId, {
            name,
            routeID: routeId,
            index: nextIndexForNewStation(),
            showStyle: 0x00040004, // 下り発・上り発
        });

        setStations((prev) => [...prev, created].sort((a, b) => a.index - b.index));

        setNewName("");
        requestAnimationFrame(() => newInputRef.current?.focus());
    }

    return (
        <div style={{ ...styles.row, background: "#f0fff4" }}>
            <div style={{ ...styles.cell, ...styles.nameCell }}>
                <input
                    ref={newInputRef}
                    value={newName}
                    placeholder="駅名を入力して Enter"
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            createStationByName(newName);
                        }
                    }}
                    style={{ padding: 10, fontSize: 16, width: "calc(100% - 20px)" }}
                />
            </div>

            <ShowStyleComponent bits={4} disabled={true} />
            <ShowStyleComponent bits={4} disabled={true} />
        </div>
    );
}

function StationHeaderComponent() {
    return (
        <div style={{ display: "flex", border: "1px solid #ddd" }}>
            <div style={{ ...styles.row, ...styles.headRow }}>
                <div style={{ ...styles.cell, ...styles.nameCell }}>駅名</div>
                <div style={{ ...styles.cell, ...styles.blockCell }}>
                    <div style={styles.blockTitle}>下り</div>
                    <div style={styles.checkGridHead}>
                        <span>着</span>
                        <span>番線</span>
                        <span>発</span>
                    </div>
                </div>
                <div style={{ ...styles.cell, ...styles.blockCell }}>
                    <div style={styles.blockTitle}>上り</div>
                    <div style={styles.checkGridHead}>
                        <span>着</span>
                        <span>番線</span>
                        <span>発</span>
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
 * @param updateLocal 行の値を更新する関数（未保存変更として記録される）
 */
function StationRowComponent({ item, isSelected, onMouseDown, updateLocal }: RowRenderProps<StationDto>) {
    return (
        <div
            onMouseDown={onMouseDown}
            style={{
                ...styles.row,
                background: isSelected ? "#e6f2ff" : undefined,
            }}
        >
            <div style={{ ...styles.cell, ...styles.nameCell }}>
                <div>{item.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>#{item.index}</div>
            </div>

            <ShowStyleComponent bits={item.showStyle & 0b111} onChangeBits={(bits) => updateLocal((x) => ({ ...x, showStyle: (x.showStyle & ~0b111) | (bits & 0b111) }))} />
            <ShowStyleComponent
                bits={(item.showStyle >> 3) & 0b111}
                onChangeBits={(bits) => updateLocal((x) => ({ ...x, showStyle: (x.showStyle & ~(0b111 << 3)) | ((bits & 0b111) << 3) }))}
            />
        </div>
    );
}

/**
 * 駅の一覧編集UIです。
 *
 * @param routeId 編集する路線ID
 */
export default function StationListPage({ routeId }: { routeId: number }) {
    const [stations, setStations] = useState<StationDto[]>([]);
    const [dirty, setDirty] = useState<Record<number, StationDto>>({});

    function load() {
        const route = getRoute(routeId);
        setStations([...(route?.stations ?? [])].sort((a, b) => a.index - b.index));
        setDirty({});
    }

    /**
     * 駅の変更を保存します。
     *
     * @param item 更新後の駅
     */
    function updateRemote(item: StationDto) {
        timetableApi.updateStation(routeId, item);
    }

    /**
     * 駅を作成します。
     *
     * @param dto idを除いた駅データ
     */
    function createRemote(dto: Omit<StationDto, "id">) {
        return timetableApi.addStation(routeId, dto);
    }

    /**
     * 駅を削除します。
     *
     * @param id 駅ID
     */
    function deleteRemote(id: number) {
        timetableApi.deleteStation(routeId, id);
    }

    function saveAll() {
        const items = Object.values(dirty);
        for (const s of items) updateRemote(s);
        setDirty({});
    }

    return (
        <IndexedListComponent<StationDto>
            routeId={routeId}
            items={stations}
            setItems={setStations}
            load={load}
            updateRemote={updateRemote}
            createRemote={createRemote}
            deleteRemote={deleteRemote}
            setDirty={setDirty}
            saveAll={saveAll}
            createEmpty={(routeId, index) => ({ id: 0, name: "", routeID: routeId, index, showStyle: 0x00040004 })}
            toClip={(s) => s}
            fromClip={(c, routeId, index) => ({ id: 0, name: c.name, routeID: routeId, index, showStyle: c.showStyle })}
            HeaderComponent={StationHeaderComponent}
            RowComponent={StationRowComponent}
            AppendRowComponent={<AppendComponent stations={stations} setStations={setStations} routeId={routeId} />}
        />
    );
}

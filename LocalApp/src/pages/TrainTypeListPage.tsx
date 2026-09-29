import React, { useRef, useState } from "react";
import { IndexedListComponent, type RowRenderProps } from "../components/IndexedListComponent.tsx";
import type { TrainTypeDto } from "../domain/dto.ts";
import * as timetableApi from "../store/timetableApi.ts";
import { getRoute } from "../store/localStore.ts";

const COL = {
    name: 220,
    short: 120,
    color: 90,
    chk: 70,
    style: 110,
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
    colorCell: { width: COL.color, minWidth: COL.color, maxWidth: COL.color, justifyContent: "center" },
    chkCell: { width: COL.chk, minWidth: COL.chk, maxWidth: COL.chk, justifyContent: "center" },
    styleCell: { width: COL.style, minWidth: COL.style, maxWidth: COL.style },
};

function AppendTrainTypeRow({ routeId, items, setItems }: { routeId: number; items: TrainTypeDto[]; setItems: React.Dispatch<React.SetStateAction<TrainTypeDto[]>> }) {
    const [newName, setNewName] = useState("");
    const inputRef = useRef<HTMLInputElement | null>(null);

    function nextIndex() {
        let max = -1;
        for (const t of items) {
            if (t.routeID === routeId && t.index > max) max = t.index;
        }
        return max + 1;
    }

    function createByName(nameRaw: string) {
        const name = nameRaw.trim();
        if (!name) return;

        const created = timetableApi.addTrainType(routeId, {
            name,
            routeID: routeId,
            index: nextIndex(),
            shortName: "",
            color: "#000000",
            fontBold: false,
            lineBold: false,
            lineStyle: 0,
        });
        setItems((prev) => [...prev, created].sort((a, b) => a.index - b.index));

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

function TrainTypeRowComponent({ item, isSelected, onMouseDown, updateLocal }: RowRenderProps<TrainTypeDto>) {
    return (
        <div
            onMouseDown={onMouseDown}
            style={{
                ...styles.row,
                background: isSelected ? "#e6f2ff" : undefined,
            }}
        >
            <div style={{ ...styles.cell, ...styles.nameCell }}>
                <input value={item.name} onChange={(e) => updateLocal((x) => ({ ...x, name: e.target.value }))} style={{ width: "100%" }} />
            </div>

            <div style={{ ...styles.cell, ...styles.shortCell }}>
                <input value={item.shortName} onChange={(e) => updateLocal((x) => ({ ...x, shortName: e.target.value }))} style={{ width: "100%" }} />
            </div>

            <div style={{ ...styles.cell, ...styles.colorCell }}>
                <input type="color" value={item.color || "#000000"} onChange={(e) => updateLocal((x) => ({ ...x, color: e.target.value }))} />
            </div>

            <div style={{ ...styles.cell, ...styles.chkCell }}>
                <input type="checkbox" checked={item.fontBold} onChange={(e) => updateLocal((x) => ({ ...x, fontBold: e.target.checked }))} />
            </div>

            <div style={{ ...styles.cell, ...styles.chkCell }}>
                <input type="checkbox" checked={item.lineBold} onChange={(e) => updateLocal((x) => ({ ...x, lineBold: e.target.checked }))} />
            </div>

            <div style={{ ...styles.cell, ...styles.styleCell }}>
                <select value={item.lineStyle ?? 0} onChange={(e) => updateLocal((x) => ({ ...x, lineStyle: Number(e.target.value) }))} style={{ width: "100%" }}>
                    <option value={0}>実線</option>
                    <option value={1}>破線</option>
                    <option value={2}>点線</option>
                </select>
            </div>
        </div>
    );
}
export default function TrainTypeListPage({ routeId }: { routeId: number }) {
    const [items, setItems] = useState<TrainTypeDto[]>([]);
    const [dirty, setDirty] = useState<Record<number, TrainTypeDto>>({});

    function load() {
        const route = getRoute(routeId);
        setItems([...(route?.trainTypes ?? [])].sort((a, b) => a.index - b.index));
        setDirty({});
    }

    function updateRemote(item: TrainTypeDto) {
        timetableApi.updateTrainType(routeId, item);
    }

    function createRemote(dto: Omit<TrainTypeDto, "id">) {
        return timetableApi.addTrainType(routeId, dto);
    }

    function deleteRemote(id: number) {
        timetableApi.deleteTrainType(routeId, id);
    }

    function saveAll() {
        const list = Object.values(dirty);
        for (const x of list) updateRemote(x);
        setDirty({});
    }

    return (
        <IndexedListComponent<TrainTypeDto>
            routeId={routeId}
            items={items}
            setItems={setItems}
            load={load}
            updateRemote={updateRemote}
            createRemote={createRemote}
            deleteRemote={deleteRemote}
            setDirty={setDirty}
            saveAll={saveAll}
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
            HeaderComponent={() => (
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
            )}
            RowComponent={TrainTypeRowComponent}
            AppendRowComponent={<AppendTrainTypeRow routeId={routeId} items={items} setItems={setItems} />}
        />
    );
}

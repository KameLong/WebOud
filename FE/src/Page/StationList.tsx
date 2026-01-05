import React, { useRef, useState } from "react";
import { SERVER_URL } from "../server/ServerSetting";
import { ShowStyleComponent } from "../component/ShowStyleComponent";
import {IndexedListComponent} from "../component/IndexedListComponent.tsx";
import type {StationDto} from "../server/DTO/StationDTO.ts";

const COL = {
    name: 240,          // 駅名
    block: 50*3+8*2+6*2, //chk*3+padding(8px)*2+gap(6px)*2
    chk: 50,            // 着 / 発着番線 / 発
};
const styles: Record<string, React.CSSProperties> = {
    row: {
        display: "flex",
        alignItems: "stretch",
        borderTop: "1px solid #eee",
        borderLeft:"1px solid #ddd",
        borderRight:"1px solid #ddd",
        borderBottom:"1px solid #eee",
    },
    headRow: {
        borderTop: "none",
        background: "#fafafa",
        fontWeight: 600,
    },
    // 共通セル
    cell: {
        padding: 8,
        boxSizing: "border-box",
    },

    // 駅名列（固定）
    nameCell: {
        width: COL.name,
        minWidth: COL.name,
        maxWidth: COL.name,
        borderRight: "1px solid #eee",
    },

    // 下り / 上りブロック（固定）
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
    // チェック3列（固定）
    checkGridHead: {
        display: "grid",
        gridTemplateColumns: `${COL.chk}px ${COL.chk}px ${COL.chk}px`,
        gap: 6,
        fontSize: 12,
        color: "#666",
    },
};


function AppendComponent({routeId,stations,setStations}:{routeId:number,stations:StationDto[],setStations: React.Dispatch<React.SetStateAction<StationDto[]>>}){
    const [newName, setNewName] = useState("");
    const [createError, setCreateError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const newInputRef = useRef<HTMLInputElement | null>(null);

    function nextIndexForNewStation() {
        let max = -1;
        for (const s of stations) {
            if (s.routeID === routeId && s.index > max) max = s.index;
        }
        return max + 1;
    }
    async function createStationByName(nameRaw: string) {
        const name = nameRaw.trim();
        if (!name) return;
        if (isCreating) return;

        setIsCreating(true);
        setCreateError(null);
        try {
            const payload:StationDto = {
                id:0,
                name:name,
                routeID: routeId,
                index: nextIndexForNewStation(),
                showStyle: 1,
            };
            console.log(routeId);
            const res = await fetch(`${SERVER_URL}/stations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(text || `HTTP ${res.status}`);
            }

            const created = (await res.json()) as StationDto;

            setStations((prev) => [...prev, created].sort(
                (a, b) => a.index - b.index));

            setNewName("");
            requestAnimationFrame(() => newInputRef.current?.focus());
        } catch (e:any) {
            setCreateError(e?.message ?? "追加に失敗しました");
            requestAnimationFrame(() => newInputRef.current?.focus());
        } finally {
            setIsCreating(false);
        }
    }

    return (<div style={{...styles.row,
        background: "#f0fff4" }}>
        <div style={{ width: 240, padding: 8,boxSizing: "border-box",borderRight:"1px solid #ddd" }}>
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
            {createError && (
                <div style={{ color: "crimson", marginTop: 6, whiteSpace: "pre-wrap" }}>
                    {createError}
                </div>
            )}
        </div>

        <ShowStyleComponent bits={4} disabled={true} />
        <ShowStyleComponent bits={4} disabled={true} />
    </div>)
}

export default function StationListPage({ routeId }: { routeId: number }) {
    const [stations, setStations] = useState<StationDto[]>([]);
    const [dirty, setDirty] = useState<Record<number, StationDto>>({});

    async function load() {
        const res = await fetch(`${SERVER_URL}/stations?routeId=${routeId}`);
        const data = (await res.json()) as StationDto[];
        setStations(data.sort((a,b)=>a.index-b.index));
        setDirty({});
    }

    async function updateRemote(item: StationDto) {
        await fetch(`${SERVER_URL}/stations/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
        }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); });
    }

    async function createRemote(dto: Omit<StationDto,"id">) {
        const res = await fetch(`${SERVER_URL}/stations`, {
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body: JSON.stringify(dto),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as StationDto;
    }

    async function deleteRemote(id: number) {
        const res = await fetch(`${SERVER_URL}/stations/${id}`, { method:"DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }

    async function saveAll() {
        const items = Object.values(dirty);
        for (const s of items) await updateRemote(s);
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
            createEmpty={(routeId, index) => {
                console.log(routeId);
                return { id: 0 , name:"", routeID: routeId, index, showStyle: 0x00040004 }
            }}
            toClip={(s) => s
            }
            fromClip={(c, routeId, index) => (
                { id: 0, name: c.name, routeID: routeId, index, showStyle: c.showStyle })
            }
            HeaderComponent={() => (
                <div style={{ display:"flex", border:"1px solid #ddd" }}>
                    <div style={{ ...styles.row, ...styles.headRow }}>
                        <div style={{ ...styles.cell,  width: 240, padding: 8,boxSizing: "border-box",borderRight:"1px solid #ddd"}}>駅名</div>
                        <div style={{ ...styles.cell, ...styles.blockCell }}>
                            <div style={styles.blockTitle}>下り</div>
                            <div style={styles.checkGridHead}>
                                <span>着</span><span>番線</span><span>発</span>
                            </div>
                        </div>
                        <div style={{ ...styles.cell, ...styles.blockCell }}>
                            <div style={styles.blockTitle}>上り</div>
                            <div style={styles.checkGridHead}>
                                <span>着</span><span>番線</span><span>発</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            RowComponent={({ item, isSelected, onMouseDown, updateLocal }) => (
                <div
                    key={item.index}
                    onMouseDown={onMouseDown}
                    style={{...styles.row,
                        background: isSelected ? "#e6f2ff" : undefined,
                    }}
                >
                    <div style={{ width: 240, padding: 8,boxSizing: "border-box",borderRight:"1px solid #ddd" }}>
                        <div>{item.name}</div>
                        <div style={{ fontSize: 12, color:"#666" }}>#{item.index} / id:{item.id}</div>
                    </div>

                    <ShowStyleComponent
                        bits={item.showStyle & 0b111}
                        onChangeBits={(bits) => updateLocal(x => ({ ...x, showStyle: (x.showStyle & ~(0b111)) | (bits & 0b111) }))}
                    />
                    <ShowStyleComponent
                        bits={(item.showStyle >> 3) & 0b111}
                        onChangeBits={(bits) => updateLocal(x => ({ ...x, showStyle: (x.showStyle & ~(0b111<<3)) | ((bits & 0b111)<<3) }))}
                    />
                </div>
            )}
            AppendRowComponent={
                <AppendComponent stations={stations} setStations={setStations} routeId={routeId}/>
            }
        />
    );
}



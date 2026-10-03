import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { decodeShowStyleDown, FONT_SIZE, getOrCreateStopTime, isDigitKey, LINE_HEIGHT, STATION_NAME_WIDTH } from "../domain/utils.ts";
import { useSelectionNavigation } from "../hooks/useSelectionNavigation.ts";
import { useAutoScrollCursor } from "../hooks/useAutoScrollCursor.ts";
import { StationSidebar } from "../components/StationSidebar.tsx";
import { TrainColumn } from "../components/TrainColumn.tsx";
import { StopTimeEditDialog } from "../components/StopTimeEditDialog.tsx";
import type { StationDto, StopTimeDto, TrainTypeDto } from "../domain/dto.ts";
import { useStopTimeEditor, useTimetableData } from "../hooks/useTimetableData.ts";
import { useTripClipboard } from "../hooks/useTripClipboard.ts";
import { PasteMoveDialog } from "../components/PasteMoveDialog.tsx";
import { TrainPropertyDialog } from "../components/TrainPropertyDialog.tsx";
import { putTrip, reorderTrips, shiftStopTime } from "../store/timetableApi.ts";
import type { Cursor, KeyLike } from "../domain/types.ts";
import { AsyncQueue } from "../Util.ts";
import { useContinuousTimeInput } from "../hooks/useContinuousTimeInput.ts";

const keyEventQueue = new AsyncQueue<unknown>();

export default function RouteTimetablePage() {
    const params = useParams<{ routeId: string; direct: string }>();
    const routeId = Number(params.routeId ?? 0);
    const direct = Number(params.direct ?? 0);
    const nav_ = useNavigate();

    const HEADER_ROW_H = LINE_HEIGHT;
    const HEADER_H = HEADER_ROW_H * 7 + 2;

    const z = { header: 3, left: 4, corner: 5 };

    const scrollRef = useRef<HTMLDivElement | null>(null);

    const { stations, trips, loading, error, traintypes } = useTimetableData(routeId, direct);
    const { saveStopTime, insertEmptyTripAt, deleteTrips } = useStopTimeEditor({
        routeId,
        direct,
    });

    const nav = useSelectionNavigation({
        stationsLen: stations.length,
        trainsLen: trips.length,
        stations,
    });
    const cont = useContinuousTimeInput({
        stations,
        trips,
        nav,
        changeStopTime: saveStopTime,
    });

    const [pasteMoveOpen, setPasteMoveOpen] = useState(false);
    useAutoScrollCursor(scrollRef, nav.cursor);

    const focusGrid = useCallback(() => {
        scrollRef.current?.focus();
    }, []);

    const [editState, setEditState] = useState({ open: false, initialInput: "" });
    const [editTarget, setEditTarget] = useState<{ stationName: string; trainNo: string }>({
        stationName: "",
        trainNo: "",
    });
    const [editInitial, setEditInitial] = useState<StopTimeDto>();
    const tripClipboard = useTripClipboard({
        routeId,
        direct,
        trips,
        getSelectedCols: () => (nav.isMultiColSelected ? Array.from(nav.selectedCols) : [nav.cursor.c]),
        getCursorCol: () => nav.cursor.c,
        onAfterMutate: (c) => nav.setCursor?.((cur: Cursor) => ({ ...cur, c })),
    });

    const [tripPropOpen, setTripPropOpen] = useState(false);
    const [tripPropTargetId, setTripPropTargetId] = useState<number | null>(null);

    const trainTypeById = useMemo(() => {
        const m = new Map<number, TrainTypeDto>();
        traintypes.forEach((tt) => m.set(tt.id, tt));
        return m;
    }, [traintypes]);

    if (loading) return <div style={{ padding: 12 }}>loading...</div>;
    if (error) return <div style={{ padding: 12, color: "crimson" }}>{error}</div>;
    if (stations.length === 0)
        return (
            <div style={{ padding: 12 }}>
                駅が登録されていません。
                <button onClick={() => nav_(`/route/${routeId}`)} style={{ marginLeft: 8 }}>
                    路線編集へ戻る
                </button>
            </div>
        );

    const openTripProperty = (tripId: number) => {
        setTripPropTargetId(tripId);
        setTripPropOpen(true);
    };
    const targetTrip = tripPropTargetId == null ? undefined : trips.find((t) => t.id === tripPropTargetId);

    const openEdit = (initialChar?: string) => {
        const cursor = nav.cursor;
        const r = cursor.r;
        const c = cursor.c;

        const st = stations[r];
        const tr = trips[c];
        if (!st || !tr) return;

        setEditTarget({
            stationName: st.name,
            trainNo: tr.no,
        });

        // tr.id===-1（未作成の列車）でも、既存トリップの未入力駅でも、
        // 同じ方法でデフォルトのStopTimeDtoを用意する
        setEditInitial(getOrCreateStopTime(tr, st.id));
        setEditState({
            open: true,
            initialInput: initialChar ?? "",
        });
    };

    /** 指定駅の時刻順（発車優先、なければ到着）に列車を並び替える。時刻未設定の列車は末尾へ。 */
    const sortByStation = (station: StationDto) => {
        const DIAGRAM_START = 3 * 3600; // 3:00 を日の始まりとして扱う(ダイヤグラムと同じ基準)
        const normalize = (time: number) => (time < DIAGRAM_START ? time + 24 * 3600 : time);
        const sortKey = (t: (typeof trips)[number]) => {
            const st = t.stopTimesByStationId[station.id];
            if (!st) return Number.MAX_SAFE_INTEGER;
            const raw = st.depTime >= 0 ? st.depTime : st.ariTime;
            if (raw < 0) return Number.MAX_SAFE_INTEGER;
            return normalize(raw);
        };

        const real = trips.filter((t) => t.id !== -1);
        const sorted = [...real].sort((a, b) => sortKey(a) - sortKey(b));

        // trips state への反映は useTimetableData 側の store 購読(reload)に任せる
        reorderTrips(
            routeId,
            direct,
            sorted.map((t) => t.id)
        );
    };

    const changeStopType = (stopType: number) => {
        if (!(stopType === 2 || stopType === 3)) {
            return;
        }
        const cursor = nav.cursor;
        const r = cursor.r;
        const c = cursor.c;
        const station = stations[r];
        const trip = trips[c];
        const newStopTime = { ...getOrCreateStopTime(trip, station.id) };

        newStopTime.depTime = -1;
        newStopTime.ariTime = -1;
        newStopTime.stop = 0;
        newStopTime.stopType = stopType;
        saveStopTime(newStopTime);
        nav.moveVertical(1);
    };

    const keyEvent = async (e: KeyLike) => {
        if (e.altKey && e.key === "l") {
            const cursor = nav.cursor;
            e.preventDefault();
            shiftStopTime(routeId, trips[cursor.c].id, stations[cursor.r].id, cursor.part, 60);
            return;
        }
        if (e.altKey && e.key === "j") {
            const cursor = nav.cursor;
            e.preventDefault();
            shiftStopTime(routeId, trips[cursor.c].id, stations[cursor.r].id, cursor.part, -60);
            return;
        }

        if (await cont.onKeyDown(e)) return;

        // Shift+Enter：貼り付け移動量設定
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            setPasteMoveOpen(true);
            return;
        }

        // 編集開始
        if (e.key === "Enter") {
            e.preventDefault();
            openEdit();
            return;
        }
        // 数値入力
        if (isDigitKey(e)) {
            e.preventDefault();
            openEdit(e.key);
            return;
        }
        if (e.key === "^" && e.ctrlKey) {
            changeStopType(3);
            e.preventDefault();
            return;
        }
        if (e.key === "-") {
            if (e.ctrlKey) {
                changeStopType(2);
                e.preventDefault();
                return;
            }
        }

        // 駅時刻削除
        if (e.ctrlKey && e.key === "Delete") {
            const cursor = nav.cursor;
            const r = cursor.r;
            const c = cursor.c;
            const part = cursor.part;

            const station = stations[r];
            const trip = trips[c];
            const newStopTime = { ...getOrCreateStopTime(trip, station.id) };

            const showStyle = decodeShowStyleDown(station.showStyle);
            if (!showStyle.showDep) {
                newStopTime.depTime = -1;
            }
            if (!showStyle.showArr) {
                newStopTime.ariTime = -1;
            }
            if (!showStyle.showTrack) {
                newStopTime.stop = 0;
            }

            switch (part) {
                case "dep":
                    newStopTime.depTime = -1;
                    break;
                case "arr":
                    newStopTime.ariTime = -1;
                    break;
                case "track":
                    newStopTime.stop = 0;
                    break;
            }
            if (newStopTime.depTime < 0 && newStopTime.ariTime < 0 && newStopTime.stop == 0) {
                newStopTime.stopType = 0;
            }
            saveStopTime(newStopTime);
            nav.moveVertical(1);
            e.preventDefault();
            return;
        }
        // Delete：Trip削除
        if (e.key === "Delete" && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();

            const cols = nav.isMultiColSelected ? Array.from(nav.selectedCols.values()) : [nav.cursor.c];

            const tripIds = cols.map((c) => trips[c]?.id).filter((id): id is number => typeof id === "number");

            const hasDeletable = tripIds.some((id) => id !== -1);
            if (!hasDeletable) return;

            deleteTrips(tripIds);

            const newLen = Math.max(1, trips.length - tripIds.length);
            nav.setCursor?.((cur: Cursor) => ({ ...cur, c: Math.min(cur.c, newLen - 1) }));
            return;
        }

        // Ctrl+Insert：空列車挿入（現在列の手前）
        if (e.ctrlKey && e.key === "Insert") {
            e.preventDefault();
            insertEmptyTripAt(nav.cursor.c);
            return;
        }
        tripClipboard.onKeyDown(e);

        nav.onKeyDown(e);
        await new Promise((res) => setTimeout(res, 0));
    };

    return (
        <div style={{ height: "100%", padding: "10px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <button onClick={() => nav_(`/route/${routeId}`)}>← 路線編集へ</button>
                <div style={{ display: "flex", gap: 4 }}>
                    <button
                        onClick={() => nav_(`/route/${routeId}/timetable/0`)}
                        style={{ fontWeight: direct === 0 ? 700 : 400 }}
                    >
                        下り
                    </button>
                    <button
                        onClick={() => nav_(`/route/${routeId}/timetable/1`)}
                        style={{ fontWeight: direct === 1 ? 700 : 400 }}
                    >
                        上り
                    </button>
                </div>
                <button onClick={() => nav_(`/route/${routeId}/diagram`)}>ダイヤグラム</button>
                <span style={{ fontSize: 12, color: "#888" }}>※ 左側の駅名をクリックすると、その駅の時刻順に列車を並び替えます</span>
            </div>
            <div
                ref={scrollRef}
                tabIndex={0}
                onKeyDown={(e) => {
                    const ev: KeyLike = {
                        key: e.key,
                        altKey: e.altKey,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                        shiftKey: e.shiftKey,
                        preventDefault: () => e.preventDefault(),
                        nativeEvent: e.nativeEvent,
                    };

                    keyEventQueue.push(() => keyEvent(ev));
                }}
                style={{
                    height: "calc(100% - 46px)",
                    outline: "none",
                    overflow: "auto",
                    background: "#fff",
                    scrollPaddingTop: HEADER_H,
                    scrollPaddingLeft: STATION_NAME_WIDTH + LINE_HEIGHT,
                    fontSize: FONT_SIZE,
                }}
            >
                <div style={{ display: "flex", width: "fit-content", flexWrap: "nowrap", paddingRight: "100px" }}>
                    <StationSidebar stations={stations} HEADER_H={HEADER_H} zLeft={z.left} zCorner={z.corner} onStationClick={sortByStation} />

                    <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start" }} onMouseDown={(e) => nav.onMouseDownDelegated(e, focusGrid)}>
                        {trips.map((t, c) => {
                            const isSelected = nav.selectedCols.has(c);
                            const invert = isSelected && nav.isMultiColSelected;

                            return (
                                <TrainColumn
                                    cont={cont.state}
                                    key={t.id}
                                    trip={t}
                                    c={c}
                                    stations={stations}
                                    cursor={nav.cursor}
                                    isSelected={isSelected}
                                    invert={invert}
                                    HEADER_H={HEADER_H}
                                    zHeader={z.header}
                                    onOpenTripProperty={openTripProperty}
                                    trainType={
                                        trainTypeById.get(t.trainTypeID) ?? {
                                            color: "#000",
                                            shortName: "",
                                            routeID: 0,
                                            name: "",
                                            fontBold: false,
                                            lineStyle: 0,
                                            index: 0,
                                            lineBold: false,
                                            id: 0,
                                        }
                                    }
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
            <StopTimeEditDialog
                state={editState}
                stationName={editTarget.stationName}
                trainNo={editTarget.trainNo}
                initial={editInitial}
                cursorPart={nav.cursor.part}
                onCancel={() => {
                    setEditState({
                        open: false,
                        initialInput: "",
                    });
                    scrollRef.current?.focus();
                }}
                onSave={(stopTime) => {
                    saveStopTime(stopTime);
                    nav.moveVertical(1);
                    setEditState({ open: false, initialInput: "" });
                    scrollRef.current?.focus();
                }}
            />
            <PasteMoveDialog
                open={pasteMoveOpen}
                value={tripClipboard.pasteMove}
                onCancel={() => {
                    setPasteMoveOpen(false);
                    scrollRef.current?.focus();
                }}
                onSave={(v) => {
                    tripClipboard.setPasteMove(v);
                    setPasteMoveOpen(false);
                    scrollRef.current?.focus();
                }}
            />
            <TrainPropertyDialog
                open={tripPropOpen && !!targetTrip}
                trainTypes={traintypes.map((tt) => ({ id: tt.id, name: tt.name }))}
                initial={targetTrip}
                onCancel={() => {
                    setTripPropOpen(false);
                    setTripPropTargetId(null);
                    scrollRef.current?.focus();
                }}
                onSave={(trip) => {
                    // trips state への反映は useTimetableData 側の store 購読(reload)に任せる
                    putTrip(routeId, trip);

                    setTripPropOpen(false);
                    setTripPropTargetId(null);
                    scrollRef.current?.focus();
                }}
            />
        </div>
    );
}

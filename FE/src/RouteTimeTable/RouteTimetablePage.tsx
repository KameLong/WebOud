import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    decodeShowStyleDown,
    FONT_SIZE,
    isDigitKey,
    LINE_HEIGHT,
    STATION_NAME_WIDTH
} from "./domain/utils.ts";
import {useSelectionNavigation} from "./Hooks/useSelectionNavigation.ts";
import {useAutoScrollCursor} from "./Hooks/useAutoScrollCursor.ts";
import {StationSidebar} from "./Components/StationSidebar.tsx";
import {TrainColumn} from "./Components/TrainColumn.tsx";
import {StopTimeEditDialog} from "./Components/StopTimeEditDialog.tsx";
import type {StopTimeDto} from "../server/DTO/StopTimeDTO.ts";
import {useStopTimeEditor, useTimetableData} from "./Hooks/useTimetableData.ts";
import {useTripClipboard} from "./Hooks/useTripClopboard.ts";
import {PasteMoveDialog} from "./Components/PasteMoveDialog.tsx";
import {TrainPropertyDialog} from "./Components/TrainPropertyDialog.tsx";
import {putTrip} from "../server/API/TripsAPI.ts";
import type {Cursor, KeyLike} from "./domain/types.ts";
import {AsyncQueue} from "../Util.ts";
import { useContinuousTimeInput } from "./Hooks/useContinuousTimeInput";
import type {TrainTypeDto} from "../server/DTO/TrainTypeDTO.ts";




const keyEventQueue=new AsyncQueue<unknown>();

/** ======================
 * main
 * ====================== */
export default function RouteTimetablePage() {
    // const { trains, getStopTime } = useDiagramDataMock();

    // サイズ
    const HEADER_ROW_H = LINE_HEIGHT;
    const HEADER_H = HEADER_ROW_H * 7+2;

    const z = { header: 3, left: 4, corner: 5 };


    const scrollRef = useRef<HTMLDivElement | null>(null);

    const routeId = 1;
    const { stations, trips, setTrips, loading, error ,traintypes} = useTimetableData(routeId);
    const { saveStopTime, changeStopTime, saving ,insertEmptyTripAt,deleteTrips} = useStopTimeEditor({
        routeId,
        setTrips,
    });


    const nav = useSelectionNavigation({
        stationsLen: stations.length,
        trainsLen: trips.length,
        stations
    });
    const cont = useContinuousTimeInput({
        stations,
        trips,
        nav,
        changeStopTime,
    });

    const [pasteMoveOpen, setPasteMoveOpen] = useState(false);
    useAutoScrollCursor(scrollRef, nav.cursor);

    // focus は「クリックでグリッド触った時」だけ
    const focusGrid = useCallback(() => {
        scrollRef.current?.focus();
    }, []);

    const [editState, setEditState] = useState({open:false,initialInput:""});
    const [editTarget, setEditTarget] = useState<{
        stationName: string;
        trainNo: string;
    }>({
        stationName: "",
        trainNo: "",
    });
    const [editInitial, setEditInitial] = useState<StopTimeDto>();
    const tripClipboard = useTripClipboard({
        routeId,
        trips,
        setTrips,
        getSelectedCols: () =>
            nav.isMultiColSelected ? Array.from(nav.selectedCols) : [nav.cursor.c],
        getCursorCol: () => nav.cursor.c,
        onAfterMutate: (c) => nav.setCursor?.((cur: Cursor) => ({ ...cur, c })),
    });

    useEffect(() => {
        // console.log(trips);
    }, [trips]);
    const [tripPropOpen, setTripPropOpen] = useState(false);
    const [tripPropTargetId, setTripPropTargetId] = useState<number | null>(null);

    const trainTypeById = useMemo(() => {
        const m = new Map<number, TrainTypeDto>();
        traintypes.forEach(tt => m.set(tt.id, tt));
        return m;
    }, [traintypes]);



    if (loading) return <div style={{ padding: 12 }}>loading...</div>;
    if (error) return <div style={{ padding: 12, color: "crimson" }}>{error}</div>;
    if (stations.length === 0) return <div style={{ padding: 12 }}>stations empty</div>;

    const openTripProperty = (tripId: number) => {
        setTripPropTargetId(tripId);
        setTripPropOpen(true);
    };
    const targetTrip = tripPropTargetId == null
        ? undefined
        : trips.find(t => t.id === tripPropTargetId);


    const openEdit = (initialChar?: string) => {
        const cursor=nav.cursor;
        const r = cursor.r;
        const c = cursor.c;

        const st = stations[r];         // StationDto[] を想定
        const tr = trips[c];
        if (!st || !tr) return;


        setEditTarget({
            stationName: st.name,
            trainNo: tr.no,
        });
        console.log(tr.id)
        if(tr.id===-1){
            const newStopTime:StopTimeDto={
                depTime:-1,
                ariTime:-1,
                stop:0,
                stopType:0,
                id:0,
                tripID:-1,
                stationID:st.id
            };
            setEditInitial(newStopTime);
            setEditState({
                open: true,
                initialInput: initialChar ?? "",
            });
            return;
        }
        console.log(c);

        setEditInitial(trips[c].stopTimesByStationId[st.id]);
        setEditState({
            open: true,
            initialInput: initialChar ?? "",
        });
    };



    const changeStopType=async(stopType:number)=>{
        if(!(stopType===2||stopType===3)){
            return;
        }
        const cursor = nav.cursor;
        const r = cursor.r;
        const c = cursor.c;
        const station = stations[r];         // StationDto[] を想定
        const trip = trips[c];
        const newStopTime = {...trip.stopTimesByStationId[station.id]};

        console.log(newStopTime);
        newStopTime.depTime = -1;
        newStopTime.ariTime = -1;
        newStopTime.stop = 0;
        newStopTime.stopType = stopType;
        await changeStopTime(newStopTime);
        nav.moveVertical(1);
    }

    const keyEvent =async(e:KeyLike) => {
        if(await cont.onKeyDown(e))return;

        // ★ Shift+Enter：貼り付け移動量設定
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            setPasteMoveOpen(true);
            return;
        }

        //編集開始
        if (e.key === "Enter") {
            e.preventDefault();
            openEdit();
            return;
        }
        //数値入力
        if (isDigitKey(e)) {
            e.preventDefault();
            openEdit(e.key);
            return;
        }
        if(e.key==='^'&&e.ctrlKey) {
            //経由なしに変更する
            await changeStopType(3);

            e.preventDefault();
            return;
        }
        if(e.key === "-") {
            if(e.ctrlKey) {
                //通過に変更する
                await changeStopType(2);
                e.preventDefault();
                return;
            }
        }

        //駅時刻削除
        if(e.ctrlKey&&e.key==="Delete") {
            console.log("Delete");
            const cursor = nav.cursor;
            const r = cursor.r;
            const c = cursor.c;
            const part = cursor.part;

            const station = stations[r];         // StationDto[] を想定
            const trip = trips[c];
            const newStopTime = {...trip.stopTimesByStationId[station.id]};

            console.log(newStopTime);
            const showStyle=decodeShowStyleDown(station.showStyle);
            if(!showStyle.showDep) {
                newStopTime.depTime = -1;
            }
            if(!showStyle.showArr) {
                newStopTime.ariTime = -1;
            }
            if(!showStyle.showTrack) {
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
            if(newStopTime.depTime<0&&newStopTime.ariTime<0&&newStopTime.stop==0) {
                newStopTime.stopType=0;
            }
            await changeStopTime(newStopTime);
            nav.moveVertical(1);
        }
        // Delete：Trip削除
        if (e.key === "Delete" && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();

            // 削除対象：複数選択があればそれ、なければカーソル列
            const cols = nav.isMultiColSelected
                ? Array.from(nav.selectedCols.values())
                : [nav.cursor.c];

            // tripIdに変換（placeholderはあとで弾く）
            const tripIds = cols
                .map(c => trips[c]?.id)
                .filter((id): id is number => typeof id === "number");

            // placeholder(-1)しかない場合は何もしない
            const hasDeletable = tripIds.some(id => id !== -1);
            if (!hasDeletable) return;

            await deleteTrips(tripIds);

            // カーソルを安全な位置へクランプ（削除で列数が減るので）
            // nav側に clamp があればそれを使う。無ければ簡易に：
            const newLen = Math.max(1, trips.length - tripIds.length);
            nav.setCursor?.((cur: Cursor) => ({ ...cur, c: Math.min(cur.c, newLen - 1) }));
            return;
        }

        // Ctrl+Insert：空列車挿入（現在列の手前）
        if (e.ctrlKey && e.key === "Insert") {
            e.preventDefault();
            await insertEmptyTripAt(nav.cursor.c);
            return;
        }
        tripClipboard.onKeyDown(e);
        // ここで e.defaultPrevented なら他処理しない



        nav.onKeyDown(e);
        await new Promise(res => setTimeout(res, 0))
    };




    return (
        <div style={{ height:'100%',padding:'10px'}}>
            <div
                ref={scrollRef}
                tabIndex={0}
                onKeyDown={(e) => {
                    const ev = {
                        key: e.key,
                        altKey: e.altKey,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                        shiftKey: e.shiftKey,
                        // もし必要なら code / repeat なども
                        preventDefault: () => e.preventDefault(),
                        nativeEvent:e.nativeEvent,

                    };

                    keyEventQueue.push(() => keyEvent(ev));
                }}
                // onKeyDown={(e)=> {
                //     keyEventQueue.push(()=>keyEvent(e));
                // }}

                style={{
                    height:'calc(100%)',
                    outline: "none",
                    overflow: "auto",
                    background: "#fff",
                    scrollPaddingTop: HEADER_H,
                    scrollPaddingLeft: STATION_NAME_WIDTH+LINE_HEIGHT,
                    fontSize:FONT_SIZE,
                }}
            >
                <div style={{ display: "flex", width: "fit-content", flexWrap: "nowrap",paddingRight:'100px' }}>
                    <StationSidebar
                        stations={stations}
                        HEADER_H={HEADER_H}
                        zLeft={z.left}
                        zCorner={z.corner}
                    />

                    {/* 右：列車列（ここでイベント委譲） */}
                    <div
                        style={{ flexShrink: 0, display: "flex", alignItems: "flex-start" }}
                        onMouseDown={(e) => nav.onMouseDownDelegated(e, focusGrid)}
                    >
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
                                    trainType={trainTypeById.get(t.trainTypeID) ??{
                                        color:'#000',
                                        shortName:"",
                                        routeID:0,
                                        name:"",
                                        fontBold:false,
                                        lineStyle:0,
                                        index:0,
                                        lineBold:false,
                                        id:0
                                    }}
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
                        initialInput: ""
                    })
                    scrollRef.current?.focus();
                }}
                onSave={async (stopTime) => {
                    await saveStopTime(stopTime);  // ←ここだけに
                    nav.moveVertical(1);
                    setEditState({ open:false, initialInput:"" });
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

                    // ここはお好み：
                    // 変更したら累積をリセットしたいなら、hookに reset を生やす（下に案）
                    scrollRef.current?.focus();
                }}
            />
            <TrainPropertyDialog
                open={tripPropOpen && !!targetTrip}
                trainTypes={/* data.trainTypes など */ traintypes.map(tt => ({ id: tt.id, name: tt.name }))}
                initial={targetTrip}
                onCancel={() => {
                    setTripPropOpen(false);
                    setTripPropTargetId(null);
                    scrollRef.current?.focus();
                }}
                onSave={async(trip) => {
                    // DBに保存するならここで PUT /trips/{id} も実行（今回はUI更新だけでも可）
                    console.log(trip);
                    await putTrip(trip);
                    setTrips(prev => prev.map(t => {
                        if (t.id !== trip.id) return t;
                        return {
                            ...t,
                            no: trip.no,
                            trainTypeID: trip.trainTypeID,
                            name: trip.name,
                            // remark / isEmpty をTripDTOに入れるならここも反映
                        };
                    }));

                    setTripPropOpen(false);
                    setTripPropTargetId(null);
                    scrollRef.current?.focus();
                }}
            />

        </div>
    );
}

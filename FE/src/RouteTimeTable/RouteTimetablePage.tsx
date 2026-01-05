import {useCallback, useEffect, useRef, useState} from "react";
import {
    createPlaceholderTrip,
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
import { SERVER_URL } from "../server/ServerSetting";
import {StopTimeEditDialog} from "./Components/StopTimeEditDialog.tsx";
import type {TimeTableDto} from "../server/DTO/RouteDTO.ts";
import type {TripWithStopTimesDto} from "../server/DTO/TripDTO.ts";
import type {StopTimeDto} from "../server/DTO/StopTimeDTO.ts";
import {useStopTimeEditor, useTimetableData} from "./Hooks/useTimetableData.ts";
import {useTripClipboard} from "./Hooks/useTripClopboard.ts";
import {PasteMoveDialog} from "./Components/PasteMoveDialog.tsx";
import {TrainPropertyDialog} from "./Components/TrainPropertyDialog.tsx";
import {putTrip} from "../server/API/TripsAPI.ts";

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
        onAfterMutate: (c) => nav.setCursor?.((cur: any) => ({ ...cur, c })),
    });
    const [continuousInput, setContinuousInput] = useState(false);

    function toggleContinuousInput() {
        setContinuousInput(v => !v);
    }




    useEffect(() => {
        console.log(trips);
    }, [trips]);
    const [tripPropOpen, setTripPropOpen] = useState(false);
    const [tripPropTargetId, setTripPropTargetId] = useState<number | null>(null);


    const contRef = useRef<{
        buf: string;         // 例: "123" / "0930"
        lastHour: number | null; // 上2桁（時）の補完用（推定）
    }>({ buf: "", lastHour: null });


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

        const s = decodeShowStyleDown(st.showStyle);

        const key = `${st.id}:${tr.id}`;
        // const cur = stopTimeMap.get(key);

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
        // setEditOpen(true);
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




    return (
        <div style={{ height:'100%',padding:'10px'}}>
            <div
                ref={scrollRef}
                tabIndex={0}
                onKeyDown={async(e: React.KeyboardEvent)=>{
                    console.log(e.key);
                    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.key === "t" || e.key === "T")) {
                        e.preventDefault();
                        toggleContinuousInput();
                        return;
                    }
                    // if (continuousInput && isDigitKey(e)) {
                    //     e.preventDefault();
                    //
                    //     const digit = e.key; // "0".."9"
                    //     const st = stations[nav.cursor.r];
                    //     const tr = trips[nav.cursor.c];
                    //     if (!st || !tr) return;
                    //
                    //     // placeholder列や temp列の扱いは、今まで通り stopTime保存フローへ寄せるのが安全
                    //     // ここでは「state上の stopTimesByStationId を更新する」までやって、保存は既存の onSave/Editor に任せる案もOK
                    //     // まずはローカル反映だけの例を書く（DB反映は changeStopTime を呼ぶ）
                    //
                    //     const ref = contRef.current;
                    //     ref.buf += digit;
                    //     if (ref.buf.length > 4) {
                    //         // 4桁超えたら最後4桁だけ残す（連続打鍵時の事故防止）
                    //         ref.buf = ref.buf.slice(-4);
                    //     }
                    //
                    //     // 3桁 or 4桁で確定（推定仕様）
                    //     if (ref.buf.length === 3 || ref.buf.length === 4) {
                    //         const s = ref.buf;
                    //         ref.buf = "";
                    //
                    //         // parse hmm / hhmm
                    //         let hh: number, mm: number;
                    //         if (s.length === 3) {
                    //             hh = Number(s[0]);
                    //             mm = Number(s.slice(1));
                    //         } else {
                    //             hh = Number(s.slice(0, 2));
                    //             mm = Number(s.slice(2));
                    //         }
                    //
                    //         // 範囲チェック（00:00～23:59）
                    //         if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
                    //             // 不正なら無視（必要ならエラー表示）
                    //             return;
                    //         }
                    //
                    //         // 秒単位で扱っている前提
                    //         const seconds = hh * 3600 + mm * 60;
                    //         ref.lastHour = hh;
                    //
                    //         const part = nav.cursor.part;
                    //         const current = tr.stopTimesByStationId?.[st.id] ?? {
                    //             id: 0,
                    //             tripID: tr.id,
                    //             stationID: st.id,
                    //             ariTime: -1,
                    //             depTime: -1,
                    //             stop: 0,
                    //             stopType: 0,
                    //         };
                    //
                    //         const nextStopTime = { ...current };
                    //
                    //         if (part === "arr") nextStopTime.ariTime = seconds;
                    //         if (part === "dep") nextStopTime.depTime = seconds;
                    //
                    //         // stopType の自動補正（あなたの既存ロジックに合わせる）
                    //         if (nextStopTime.stopType === 0 || nextStopTime.stopType === 3) {
                    //             if (nextStopTime.ariTime >= 0 || nextStopTime.depTime >= 0) nextStopTime.stopType = 1;
                    //         }
                    //
                    //         // 反映（DB保存はここで呼んでもいいし、あとでまとめても良い）
                    //         await changeStopTime(nextStopTime); // 既存の関数がある前提
                    //
                    //         // 次へ
                    //         nav.moveVertical(1);
                    //     }
                    //
                    //     return;
                    // }
                    if (continuousInput && e.key === "Escape") {
                        e.preventDefault();
                        contRef.current.buf = "";
                        setContinuousInput(false);
                        return;
                    }

                    if (continuousInput && e.key === "Backspace") {
                        e.preventDefault();
                        contRef.current.buf = contRef.current.buf.slice(0, -1);
                        return;
                    }

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
                        changeStopType(3);

                        e.preventDefault();
                        return;
                    }
                    if(e.key === "-") {
                        if(e.ctrlKey) {
                            //通過に変更する
                            changeStopType(2);
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
                        nav.setCursor?.((cur: any) => ({ ...cur, c: Math.min(cur.c, newLen - 1) }));
                        return;
                    }

                    // Ctrl+Insert：空列車挿入（現在列の手前）
                    if (e.ctrlKey && e.key === "Insert") {
                        e.preventDefault();
                        insertEmptyTripAt(nav.cursor.c);
                        return;
                    }
                    tripClipboard.onKeyDown(e);
                    // ここで e.defaultPrevented なら他処理しない
                    if (e.defaultPrevented) return;



                    nav.onKeyDown(e);
                }}
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
                        HEADER_ROW_H={HEADER_ROW_H}
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
                                    trainType={traintypes.find(tt=>tt.id===t.trainTypeID)??{
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

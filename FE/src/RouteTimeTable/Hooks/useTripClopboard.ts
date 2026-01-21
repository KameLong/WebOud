import {useCallback, useRef, useState} from "react";
import type { TripWithStopTimesDto } from "../../server/DTO/TripDTO";
import type { StopTimeDto } from "../../server/DTO/StopTimeDTO";
import { ensureTailPlaceholder} from "../domain/utils";
import {addTripBlock} from "../../server/API/TripsAPI.ts";
import type {KeyLike} from "../domain/types.ts";

type ClipboardPayload = {
    trips: TripWithStopTimesDto[];
};

function cloneStopTimesMap(src: Record<string, StopTimeDto>) {
    const out: Record<string, StopTimeDto> = {};
    for (const [k, v] of Object.entries(src ?? {})) out[k] = { ...v };
    return out;
}

function cloneTrip(src: TripWithStopTimesDto): TripWithStopTimesDto {
    return {
        ...src,
        stopTimesByStationId: cloneStopTimesMap(src.stopTimesByStationId ?? {}),
    };
}

function isEditableTripId(id: number) {
    // placeholder(-1)は対象外
    return id !== -1;
}

function addOffsetToStopTime(st: StopTimeDto, offsetSeconds: number): StopTimeDto {
    const next = { ...st };
    if (next.ariTime >= 0) next.ariTime += offsetSeconds;
    if (next.depTime >= 0) next.depTime += offsetSeconds;
    // stop(番線)などはそのまま
    return next;
}

export function useTripClipboard(params: {

    routeId: number;
    trips: TripWithStopTimesDto[];
    setTrips: React.Dispatch<React.SetStateAction<TripWithStopTimesDto[]>>;

    // 対象列
    getSelectedCols: () => number[];
    getCursorCol: () => number;

    // 挿入位置（省略なら cursor）
    getPasteIndex?: () => number;

    // 操作後カーソル（任意）
    onAfterMutate?: (nextCursorCol: number) => void;

}) {
    const {
        routeId,
        trips,
        setTrips,
        getSelectedCols,
        getCursorCol,
        getPasteIndex,
        onAfterMutate,
    } = params;

    const clipRef = useRef<ClipboardPayload | null>(null);
    const [pasteMove, setPasteMove] = useState({ minutes: 1, seconds: 0 });

    // ★追加：累積オフセット（秒）
    const offsetRef = useRef<number>(0);

    const deltaSeconds = Math.max(
        0,
        (pasteMove.minutes | 0) * 60 + (pasteMove.seconds | 0)
    );

    const copy = useCallback(() => {
        const cols = getSelectedCols();
        const picked = cols
            .map((c) => trips[c])
            .filter((t): t is TripWithStopTimesDto => !!t && isEditableTripId(t.id));

        if (picked.length === 0) return false;

        clipRef.current = { trips: picked.map(cloneTrip) };
        offsetRef.current = 0; // ★Copyしたら累積リセット
        return true;
    }, [getSelectedCols, trips]);

    const cut = useCallback(() => {
        const cols = getSelectedCols();
        const colSet = new Set(cols);

        const picked = cols
            .map((c) => trips[c])
            .filter((t): t is TripWithStopTimesDto => !!t && isEditableTripId(t.id));

        if (picked.length === 0) return false;

        clipRef.current = { trips: picked.map(cloneTrip) };
        offsetRef.current = 0; // ★Cutでも累積リセット

        setTrips((prev) => {
            const next = prev.filter((t, idx) => !(colSet.has(idx) && isEditableTripId(t.id)));
            return ensureTailPlaceholder(next, routeId);
        });

        const cursor = getCursorCol();
        onAfterMutate?.(Math.max(0, Math.min(cursor, trips.length - picked.length - 1)));
        return true;
    }, [getSelectedCols, trips, setTrips, routeId, getCursorCol, onAfterMutate]);

    const paste = useCallback(async() => {
        //クリップボードから取得
        const payload = clipRef.current;
        if (!payload || payload.trips.length === 0) return false;

        //貼り付け移動量取得
        if (deltaSeconds > 0) offsetRef.current += deltaSeconds;
        const offsetSeconds = offsetRef.current;


        //貼り付け位置取得
        const pastedCount = payload.trips.length;
        const cursorCol = getCursorCol();
        const insertPosRaw = getPasteIndex ? getPasteIndex() : cursorCol;
        // prev.length - 1 は末尾placeholderの位置。そこには入れず、その手前まで。
        const insertPosForCursor = Math.max(0, Math.min(insertPosRaw, trips.length - 1));

        //新しいtripを作成
        const newTrips = payload.trips.map((t) => {
            const stMap: Record<string, StopTimeDto> = {};
            for (const [k, v] of Object.entries(t.stopTimesByStationId ?? {})) {
                const shifted = addOffsetToStopTime(v, offsetSeconds);
                stMap[k] = { ...shifted, tripID: 0 };
            }
            return {
                ...t,
                tripID:0,
                routeID: routeId,
                stopTimesByStationId: stMap,
            };
        });
        //サーバーに追加
        const result=await addTripBlock(newTrips);
        if (Array.isArray(result)) {
            const createdTrips = result as TripWithStopTimesDto[];

            setTrips((prev) => {
                const insertPos = Math.max(0, Math.min(insertPosForCursor, prev.length - 1)); // 末尾placeholderの前まで
                const next = [...prev];
                next.splice(insertPos, 0, ...createdTrips);
                return ensureTailPlaceholder(next, routeId);
            });

            // 5) ペースト後カーソル：貼り付けブロックの右
            onAfterMutate?.(insertPosForCursor + pastedCount);
            return true;
        }
        throw new Error("server error");
    }, [deltaSeconds, getCursorCol, getPasteIndex, routeId, setTrips, onAfterMutate,trips.length]);






    const onKeyDown = useCallback(
        (e: KeyLike) => {
            // IME中は無視
            if (e.nativeEvent?.isComposing) return;

            const key = e.key.toLowerCase();
            if (!(e.ctrlKey || e.metaKey) || e.altKey) return;

            if (key === "c") {
                e.preventDefault();
                copy();
            } else if (key === "x") {
                e.preventDefault();
                cut();
            } else if (key === "v") {
                e.preventDefault();
                paste();
            }
        },
        [copy, cut, paste]
    );

    return {
        onKeyDown,
        copy,
        cut,
        paste,

        pasteMove,
        setPasteMove,

        // 追加：今の累積（表示したいなら使える）
        getPasteOffsetSeconds: () => offsetRef.current,
    };
}
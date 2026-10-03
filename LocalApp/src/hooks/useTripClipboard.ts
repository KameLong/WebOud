import { useCallback, useRef, useState } from "react";
import type { StopTimeDto, TripWithStopTimesDto } from "../domain/dto.ts";
import { addTripBlock, deleteTrips as deleteTripsFromStore } from "../store/timetableApi.ts";
import type { KeyLike } from "../domain/types.ts";

type ClipboardPayload = {
    trips: TripWithStopTimesDto[];
};

function cloneStopTimesMap(src: Record<number, StopTimeDto>) {
    const out: Record<number, StopTimeDto> = {};
    for (const [k, v] of Object.entries(src ?? {})) out[Number(k)] = { ...v };
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
    return next;
}

export function useTripClipboard(params: {
    routeId: number;
    direct: number;
    trips: TripWithStopTimesDto[];

    getSelectedCols: () => number[];
    getCursorCol: () => number;
    getPasteIndex?: () => number;
    onAfterMutate?: (nextCursorCol: number) => void;
}) {
    const { routeId, direct, trips, getSelectedCols, getCursorCol, getPasteIndex, onAfterMutate } = params;

    const clipRef = useRef<ClipboardPayload | null>(null);
    const [pasteMove, setPasteMove] = useState({ minutes: 1, seconds: 0 });

    const offsetRef = useRef<number>(0);

    const deltaSeconds = Math.max(0, (pasteMove.minutes | 0) * 60 + (pasteMove.seconds | 0));

    const copy = useCallback(() => {
        const cols = getSelectedCols();
        const picked = cols.map((c) => trips[c]).filter((t): t is TripWithStopTimesDto => !!t && isEditableTripId(t.id));

        if (picked.length === 0) return false;

        clipRef.current = { trips: picked.map(cloneTrip) };
        offsetRef.current = 0;
        return true;
    }, [getSelectedCols, trips]);

    const cut = useCallback(() => {
        const cols = getSelectedCols();

        const picked = cols.map((c) => trips[c]).filter((t): t is TripWithStopTimesDto => !!t && isEditableTripId(t.id));

        if (picked.length === 0) return false;

        clipRef.current = { trips: picked.map(cloneTrip) };
        offsetRef.current = 0;

        // trips state への反映は useTimetableData 側の store 購読(reload)に任せる
        const ids = picked.map((t) => t.id);
        deleteTripsFromStore(routeId, ids);

        const cursor = getCursorCol();
        onAfterMutate?.(Math.max(0, Math.min(cursor, trips.length - picked.length - 1)));
        return true;
    }, [getSelectedCols, trips, routeId, getCursorCol, onAfterMutate]);

    const paste = useCallback(async () => {
        const payload = clipRef.current;
        if (!payload || payload.trips.length === 0) return false;

        if (deltaSeconds > 0) offsetRef.current += deltaSeconds;
        const offsetSeconds = offsetRef.current;

        const pastedCount = payload.trips.length;
        const cursorCol = getCursorCol();
        const insertPosRaw = getPasteIndex ? getPasteIndex() : cursorCol;
        const insertPosForCursor = Math.max(0, Math.min(insertPosRaw, trips.length - 1));

        const newTrips = payload.trips.map((t) => {
            const stMap: Record<number, StopTimeDto> = {};
            for (const [k, v] of Object.entries(t.stopTimesByStationId ?? {})) {
                const shifted = addOffsetToStopTime(v, offsetSeconds);
                stMap[Number(k)] = { ...shifted, tripID: 0 };
            }
            return {
                ...t,
                routeID: routeId,
                direct,
                stopTimesByStationId: stMap,
            };
        });

        const result = addTripBlock(routeId, newTrips);
        if (Array.isArray(result)) {
            // trips state への反映は useTimetableData 側の store 購読(reload)に任せる
            onAfterMutate?.(insertPosForCursor + pastedCount);
            return true;
        }
        throw new Error("paste failed");
    }, [deltaSeconds, getCursorCol, getPasteIndex, routeId, direct, onAfterMutate, trips.length]);

    const onKeyDown = useCallback(
        (e: KeyLike) => {
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
                void paste();
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

        getPasteOffsetSeconds: () => offsetRef.current,
    };
}

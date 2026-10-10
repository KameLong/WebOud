import { useCallback, useRef, useState } from "react";
import type { StopTimeDto, TripWithStopTimesDto } from "../domain/dto.ts";
import { addTripBlock, deleteTrips as deleteTripsFromStore } from "../store/timetableApi.ts";
import type { KeyLike } from "../domain/types.ts";

type ClipboardPayload = {
    trips: TripWithStopTimesDto[];
};

/**
 * 停車時刻マップを複製します。
 *
 * @param src 複製元（駅ID→停車時刻）
 */
function cloneStopTimesMap(src: Record<number, StopTimeDto>) {
    const out: Record<number, StopTimeDto> = {};
    for (const [k, v] of Object.entries(src ?? {})) out[Number(k)] = { ...v };
    return out;
}

/**
 * 列車を時刻ごと複製します。
 *
 * @param src 複製元の列車
 */
function cloneTrip(src: TripWithStopTimesDto): TripWithStopTimesDto {
    return {
        ...src,
        stopTimesByStationId: cloneStopTimesMap(src.stopTimesByStationId ?? {}),
    };
}

/**
 * コピー・削除の対象にできる列車IDかを返します。
 *
 * @param id 列車ID
 */
function isEditableTripId(id: number) {
    // placeholder(-1)は対象外
    return id !== -1;
}

/**
 * 着・発の時刻をずらした複製を返します（未設定の-1はそのまま）。
 *
 * @param st 元の停車時刻
 * @param offsetSeconds ずらす秒数
 */
function addOffsetToStopTime(st: StopTimeDto, offsetSeconds: number): StopTimeDto {
    const next = { ...st };
    // 戻す量が大きくても、時刻が0:00より前（負の値＝未設定の意味になる）にならないようにする
    if (next.ariTime >= 0) next.ariTime = Math.max(0, next.ariTime + offsetSeconds);
    if (next.depTime >= 0) next.depTime = Math.max(0, next.depTime + offsetSeconds);
    return next;
}

/**
 * 列車（列）のコピー/切り取り/貼り付けを提供します。
 *
 * @param params routeId:路線ID / direct:方向 / trips:表示中の列車 / getSelectedCols:選択中の列番号 / getCursorCol:カーソル列 / getPasteIndex:貼り付け位置（省略時はカーソル列） / onAfterMutate:変更後にカーソル列を更新する通知
 */
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
    /** 貼り付けのたびに加算する時刻移動量（秒。負の値なら戻す） */
    const [pasteMove, setPasteMove] = useState(0);

    const offsetRef = useRef<number>(0);

    const deltaSeconds = pasteMove | 0;

    const copy = useCallback(() => {
        const cols = getSelectedCols();
        const picked = cols.map((c) => trips[c]).filter((t): t is TripWithStopTimesDto => !!t && isEditableTripId(t.id));

        if (picked.length === 0) return false;

        clipRef.current = { trips: picked.map(cloneTrip) };
        offsetRef.current = 0;
        // コピーした瞬間に、貼り付け移動量を0(そのまま貼り付け)に戻す
        setPasteMove(0);
        return true;
    }, [getSelectedCols, trips]);

    const cut = useCallback(() => {
        const cols = getSelectedCols();

        const picked = cols.map((c) => trips[c]).filter((t): t is TripWithStopTimesDto => !!t && isEditableTripId(t.id));

        if (picked.length === 0) return false;

        clipRef.current = { trips: picked.map(cloneTrip) };
        offsetRef.current = 0;
        // 切り取った瞬間にも、貼り付け移動量を0(そのまま貼り付け)に戻す
        setPasteMove(0);

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

        if (deltaSeconds !== 0) offsetRef.current += deltaSeconds;
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

        // カーソル列の直前に挿入する（カーソルが末尾の空列にあるときは末尾に追加）
        const result = addTripBlock(routeId, newTrips, insertPosForCursor);
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

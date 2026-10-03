import { useCallback, useEffect, useMemo, useState } from "react";
import type { StopTimeDto, TripWithStopTimesDto, StationDto, TrainTypeDto } from "../domain/dto.ts";
import { ensureTailPlaceholder } from "../domain/utils.ts";
import { getErrorMessage } from "../Util.ts";
import * as timetableApi from "../store/timetableApi.ts";
import { subscribe } from "../store/localStore.ts";

export function useTimetableData(routeId: number, direct: number) {
    const [stations, setStations] = useState<StationDto[]>([]);
    const [trips, setTrips] = useState<TripWithStopTimesDto[]>([]);
    const [traintypes, setTraintypes] = useState<TrainTypeDto[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(() => {
        setLoading(true);
        setError(null);
        try {
            const data = timetableApi.getTimetable(routeId);

            const sortedStations = [...data.stations].sort((a, b) => a.index - b.index);
            const directTrips = data.trips.filter((t) => t.direct === direct);
            const normalizedTrips = ensureTailPlaceholder(directTrips, routeId, direct);

            setStations(sortedStations);
            setTrips(normalizedTrips);
            setTraintypes(data.trainTypes);
        } catch (e: unknown) {
            setError(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [routeId, direct]);

    useEffect(() => {
        reload();
        // 他のタブ/ウィンドウでの編集や、同じタブ内の他ページ（駅・種別編集など）での
        // 変更も即座に反映する
        const unsubscribe = subscribe(reload);
        return () => {
            unsubscribe();
        };
    }, [reload]);

    const tripById = useMemo(() => {
        const m = new Map<number, TripWithStopTimesDto>();
        for (const t of trips) m.set(t.id, t);
        return m;
    }, [trips]);

    return {
        stations,
        trips,
        setStations,
        setTrips,
        traintypes,
        loading,
        error,
        reload,
        tripById,
    };
}

/**
 * StopTime保存フロー：
 * - tripID !== -1: そのtripの時刻を更新
 * - tripID === -1: 新規Tripを作成してから時刻を保存し、末尾placeholderを追加
 */
export function useStopTimeEditor(params: { routeId: number; direct: number }) {
    const { routeId, direct } = params;

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // trips の反映は useTimetableData 側の store 購読(reload)に任せる。
    // ここで setTrips を直接呼ぶと、reload による更新と二重に適用されて
    // 列車が重複してしまうため呼ばない。
    const changeStopTime = useCallback(
        (stopTime: StopTimeDto) => {
            timetableApi.setStopTime(routeId, stopTime);
        },
        [routeId]
    );

    const promotePlaceholderAndSave = useCallback(
        (stopTime: StopTimeDto) => {
            const trip = timetableApi.createTrip(routeId, direct);
            const nextStopTime: StopTimeDto = { ...stopTime, tripID: trip.id };
            timetableApi.setStopTime(routeId, nextStopTime);
        },
        [routeId, direct]
    );

    const saveStopTime = useCallback(
        (stopTime: StopTimeDto) => {
            setSaving(true);
            setError(null);
            try {
                if (stopTime.tripID === -1) {
                    promotePlaceholderAndSave(stopTime);
                } else {
                    changeStopTime(stopTime);
                }
            } catch (e: unknown) {
                setError(getErrorMessage(e));
                throw e;
            } finally {
                setSaving(false);
            }
        },
        [changeStopTime, promotePlaceholderAndSave]
    );

    const deleteTrips = useCallback(
        (tripIds: number[]) => {
            const ids = tripIds.filter((id) => id > 0);
            timetableApi.deleteTrips(routeId, ids);
        },
        [routeId]
    );

    const insertEmptyTripAt = useCallback(
        (index: number) => {
            timetableApi.insertTripAt(routeId, index, direct);
        },
        [routeId, direct]
    );

    return {
        saveStopTime,
        changeStopTime,
        saving,
        error,
        deleteTrips,
        insertEmptyTripAt,
    };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import type { StopTimeDto, TripWithStopTimesDto, StationDto, TrainTypeDto } from "../domain/dto.ts";
import { ensureTailPlaceholder } from "../domain/utils.ts";
import { getErrorMessage } from "../Util.ts";
import * as timetableApi from "../store/timetableApi.ts";
import { subscribe } from "../store/localStore.ts";

/**
 * 路線の時刻表データを読み込み、ストア更新に追従して再読込します。
 *
 * @param routeId 路線ID
 * @param direct 0:下り 1:上り（上りは駅順を逆にし、末尾にプレースホルダ列車を付ける）
 */
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
            // 上り(direct===1)は実際の走行方向に合わせて駅の並びを逆転させる
            if (direct === 1) sortedStations.reverse();
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
 *
 * @param params routeId:路線ID / direct:0:下り 1:上り
 */
export function useStopTimeEditor(params: { routeId: number; direct: number }) {
    const { routeId, direct } = params;

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // trips の反映は useTimetableData 側の store 購読(reload)に任せる。
    // ここで setTrips を直接呼ぶと、reload による更新と二重に適用されて
    // 列車が重複してしまうため呼ばない。
    const changeStopTime = useCallback(
        /**
         * @param stopTime 保存する時刻
         */
        (stopTime: StopTimeDto) => {
            timetableApi.setStopTime(routeId, stopTime);
        },
        [routeId]
    );

    /**
     * プレースホルダ列(id=-1)への入力を、新規列車の作成＋時刻保存に変換します。
     *
     * @param stopTime 保存する時刻（tripIDは新規列車のIDに置き換える）
     */
    const promotePlaceholderAndSave = useCallback(
        (stopTime: StopTimeDto) => {
            const trip = timetableApi.createTrip(routeId, direct);
            const nextStopTime: StopTimeDto = { ...stopTime, tripID: trip.id };
            timetableApi.setStopTime(routeId, nextStopTime);
        },
        [routeId, direct]
    );

    /**
     * 時刻を保存します（プレースホルダなら新規列車を作成）。
     *
     * @param stopTime 保存する時刻
     */
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

    /**
     * 列車を削除します（プレースホルダは除外）。
     *
     * @param tripIds 削除対象の列車ID
     */
    const deleteTrips = useCallback(
        (tripIds: number[]) => {
            const ids = tripIds.filter((id) => id > 0);
            timetableApi.deleteTrips(routeId, ids);
        },
        [routeId]
    );

    /**
     * 空の列車を指定位置に挿入します。
     *
     * @param index 同方向の列車内での挿入位置
     */
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

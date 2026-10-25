import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { StopTimeDto, TimeTableDto, TripWithStopTimesDto, StationDto, TrainTypeDto } from "../domain/dto.ts";
import { ensureTailPlaceholder } from "../domain/trips.ts";
import { getErrorMessage } from "../shared/lib/errors.ts";
import * as timetableApi from "./timetableApi.ts";
import { getRoute, subscribe } from "./localStore.ts";

const EMPTY_TIMETABLE: TimeTableDto = { stations: [], trainTypes: [], trips: [] };

/**
 * 路線の駅・列車種別・列車（保存されているままの順）を返します。ストアの更新（他のタブ・同じタブの他ページでの編集を含む）に追従します。
 * 路線が無いときは、空の時刻表を返します。
 *
 * @param routeId 路線ID
 */
export function useTimetable(routeId: number) {
    const route = useSyncExternalStore(subscribe, () => getRoute(routeId));
    return route ?? EMPTY_TIMETABLE;
}

/**
 * 路線の時刻表データを、1方向分の表示用に整えて返します。ストアの更新に追従します。
 *
 * @param routeId 路線ID
 * @param direct 0:下り 1:上り（上りは駅順を逆にし、末尾にプレースホルダ列車を付ける）
 */
export function useTimetableData(routeId: number, direct: number) {
    const data = useTimetable(routeId);

    const stations: StationDto[] = useMemo(() => {
        const sorted = [...data.stations].sort((a, b) => a.index - b.index);
        // 上り(direct===1)は実際の走行方向に合わせて駅の並びを逆転させる
        return direct === 1 ? sorted.reverse() : sorted;
    }, [data.stations, direct]);
    const trips: TripWithStopTimesDto[] = useMemo(() => ensureTailPlaceholder(data.trips.filter((t) => t.direct === direct), routeId, direct), [data.trips, routeId, direct]);
    const traintypes: TrainTypeDto[] = data.trainTypes;

    return { stations, trips, traintypes };
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

    // trips の反映は、useTimetableData が購読しているストアの更新に任せる（ここでは state を持たない）。
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

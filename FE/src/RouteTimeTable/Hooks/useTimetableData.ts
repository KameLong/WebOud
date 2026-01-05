import {useCallback, useEffect, useMemo, useState} from "react";
import { SERVER_URL } from "../../server/ServerSetting";
import type { StopTimeDto } from "../../server/DTO/StopTimeDTO";
import type { TripWithStopTimesDto } from "../../server/DTO/TripDTO";
import {createPlaceholderTrip, ensureTailPlaceholder} from "../domain/utils";
import type {StationDto} from "../../server/DTO/StationDTO.ts";
import type {TimeTableDto} from "../../server/DTO/RouteDTO.ts";
import type {TrainTypeDto} from "../../server/DTO/TrainTypeDTO.ts";


export function useTimetableData(routeId: number) {
    const [stations, setStations] = useState<StationDto[]>([]);
    const [trips, setTrips] = useState<TripWithStopTimesDto[]>([]);
    const [traintypes, setTraintypes] = useState<TrainTypeDto[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${SERVER_URL}/routes/${routeId}/timetable`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data: TimeTableDto = await res.json();

            // stations: index順
            const sortedStations = [...data.stations].sort((a, b) => a.index - b.index);

            // trips: 末尾 placeholder を必ず付ける
            const normalizedTrips = ensureTailPlaceholder(data.trips, routeId);

            setStations(sortedStations);
            setTrips(normalizedTrips);
            setTraintypes(data.trainTypes);
        } catch (e: any) {
            setError(e?.message ?? "読み込みに失敗しました");
        } finally {
            setLoading(false);
        }
    }, [routeId]);

    useEffect(() => {
        reload();
    }, [reload]);

    // 便利：tripId→trip（必要なら）
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
 * StopTime保存フロー（既存更新 / placeholder昇格）
 * - tripID !== -1: stopTime を PUT して trips の該当列を更新
 * - tripID === -1: Trip を POST で作成 → stopTime を適切な id で PUT → trips に挿入 + placeholder追加
 */
export function useStopTimeEditor(params: {
    routeId: number;
    setTrips: React.Dispatch<React.SetStateAction<TripWithStopTimesDto[]>>;
}) {
    const { routeId, setTrips } = params;

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * 既存 stopTime の更新（PUT）
     * ※あなたの現在のAPI仕様：/api/stopTimes/{id} PUT
     */
    const changeStopTime = useCallback(
        async (stopTime: StopTimeDto) => {
            const res = await fetch(`${SERVER_URL}/stopTimes/${stopTime.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(stopTime),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`failed to change StopTime: HTTP ${res.status} ${text}`);
            }

            // trips state へ反映
            setTrips((prev) =>
                prev.map((t) => {
                    if (t.id !== stopTime.tripID) return t;
                    return {
                        ...t,
                        stopTimesByStationId: {
                            ...t.stopTimesByStationId,
                            [stopTime.stationID]: stopTime, // stationID は number でもOK（JSは文字列化する）
                        },
                    };
                })
            );
        },
        [setTrips]
    );

    /**
     * placeholder列（tripID=-1）の保存:
     * 1) Trip 作成（POST /api/trips）  ※body が routeId 数値のみ、という現仕様に合わせる
     * 2) stopTime.tripID / stopTime.id を確定させる
     * 3) stopTime PUT
     * 4) trips の末尾 placeholder を作成した trip に置換し、新しい placeholder を末尾追加
     */
    const promotePlaceholderAndSave = useCallback(
        async (stopTime: StopTimeDto) => {
            // 1) Trip作成
            const res = await fetch(`${SERVER_URL}/trips`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(routeId), // ← 現行仕様に合わせる（DTO化するならここを変更）
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`failed to create trip: HTTP ${res.status} ${text}`);
            }

            const trip: TripWithStopTimesDto = await res.json();

            // 2) stopTime の tripID を確定
            const newTripId = trip.id;
            stopTime.tripID = newTripId;

            // 3) サーバが返した trip には station ごとの StopTime が用意されている想定
            //    その中から当該 station の stopTime id を拾う（あなたの現実装を踏襲）
            const createdCell = trip.stopTimesByStationId?.[stopTime.stationID];
            if (!createdCell) {
                throw new Error(
                    `created trip does not include stopTime for stationID=${stopTime.stationID}`
                );
            }
            stopTime.id = createdCell.id;

            // 4) stopTime 更新（PUT）
            const res2 = await fetch(`${SERVER_URL}/stopTimes/${stopTime.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(stopTime),
            });

            if (!res2.ok) {
                const text = await res2.text().catch(() => "");
                throw new Error(`failed to change StopTime: HTTP ${res2.status} ${text}`);
            }

            // 5) state反映：trip の該当 station を更新して、末尾placeholderをこのtripに置換 + 新placeholder追加
            trip.stopTimesByStationId = {
                ...trip.stopTimesByStationId,
                [stopTime.stationID]: stopTime,
            };

            setTrips((prev) => {
                // prev の中で placeholder（id < 0）を作ったtripに置換
                // （あなたの元コードは t.id>=0 のものだけ残し、負数を trip に差し替えている）
                const next = prev.map((t) => (t.id >= 0 ? t : trip));

                // 念のため「末尾に必ず1個だけ」なら ensureTailPlaceholder を呼ぶほうが安全だが、
                // 元コードを踏襲して push する
                next.push(createPlaceholderTrip(routeId));
                return next;
            });
        },
        [routeId, setTrips]
    );

    /**
     * 保存入口（UIが呼ぶ）
     */
    const saveStopTime = useCallback(
        async (stopTime: StopTimeDto) => {
            setSaving(true);
            setError(null);
            try {
                if (stopTime.tripID === -1) {
                    await promotePlaceholderAndSave(stopTime);
                } else {
                    await changeStopTime(stopTime);
                }
            } catch (e: any) {
                setError(e?.message ?? String(e));
                throw e; // ページ側でも catch できるように
            } finally {
                setSaving(false);
            }
        },
        [changeStopTime, promotePlaceholderAndSave]
    );
    /** Trip削除（単体/複数どちらでも使えるようにID配列で） */
    const deleteTrips = useCallback(async (tripIds: number[]) => {
        // placeholder(-1)は対象外
        const ids = tripIds.filter(id => id > 0);

        // 1) サーバ削除（必要なら並列で）
        await Promise.all(
            ids.map(async (id) => {
                const res = await fetch(`${SERVER_URL}/trips/${id}`, { method: "DELETE" });
                if (!res.ok) {
                    const text = await res.text().catch(() => "");
                    throw new Error(`failed to delete trip ${id}: HTTP ${res.status} ${text}`);
                }
            })
        );

        // 2) ローカルから削除して placeholder を整える
        setTrips(prev => {
            const next = prev.filter(t => !tripIds.includes(t.id)); // UI上の削除対象（tempも含めて消せる）
            return ensureTailPlaceholder(next, routeId);
        });
    }, [routeId, setTrips]);
    /** 空列車を挿入（DB保存不要の tempTrip） */
    const insertEmptyTripAt = useCallback(async(index: number) => {
        // 1) Trip作成
        const res = await fetch(`${SERVER_URL}/trips`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(routeId), // ← 現行仕様に合わせる（DTO化するならここを変更）
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`failed to create trip: HTTP ${res.status} ${text}`);
        }
        const newTrip:TripWithStopTimesDto = await res.json();

        setTrips(prev => {
            const next = [...prev];
            next.splice(index, 0, newTrip);
            return ensureTailPlaceholder(next, routeId);
        });
    }, [routeId, setTrips]);

    return {
        saveStopTime, // これだけ呼べば良い
        changeStopTime, // Ctrl+Delete など「既存更新だけ」にも使える
        saving,
        error,
        deleteTrips,
        insertEmptyTripAt
    };
}
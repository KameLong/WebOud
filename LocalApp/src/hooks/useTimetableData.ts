import { useCallback, useEffect, useMemo, useState } from "react";
import type { StopTimeDto, TripWithStopTimesDto, StationDto, TrainTypeDto } from "../domain/dto.ts";
import { createPlaceholderTrip, ensureTailPlaceholder } from "../domain/utils.ts";
import { getErrorMessage } from "../Util.ts";
import * as timetableApi from "../store/timetableApi.ts";

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
export function useStopTimeEditor(params: {
    routeId: number;
    direct: number;
    setTrips: React.Dispatch<React.SetStateAction<TripWithStopTimesDto[]>>;
}) {
    const { routeId, direct, setTrips } = params;

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const changeStopTime = useCallback(
        (stopTime: StopTimeDto) => {
            const updatedTrip = timetableApi.setStopTime(routeId, stopTime);
            if (!updatedTrip) return;
            setTrips((prev) => prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)));
        },
        [routeId, setTrips]
    );

    const promotePlaceholderAndSave = useCallback(
        (stopTime: StopTimeDto) => {
            const trip = timetableApi.createTrip(routeId, direct);

            const nextStopTime: StopTimeDto = { ...stopTime, tripID: trip.id };
            const updatedTrip = timetableApi.setStopTime(routeId, nextStopTime);
            if (!updatedTrip) return;

            setTrips((prev) => {
                const next = prev.map((t) => (t.id >= 0 ? t : updatedTrip));
                next.push(createPlaceholderTrip(routeId, direct));
                return next;
            });
        },
        [routeId, direct, setTrips]
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
            setTrips((prev) => {
                const next = prev.filter((t) => !tripIds.includes(t.id));
                return ensureTailPlaceholder(next, routeId, direct);
            });
        },
        [routeId, direct, setTrips]
    );

    const insertEmptyTripAt = useCallback(
        (index: number) => {
            const newTrip = timetableApi.insertTripAt(routeId, index, direct);
            setTrips((prev) => {
                const next = [...prev];
                next.splice(index, 0, newTrip);
                return ensureTailPlaceholder(next, routeId, direct);
            });
        },
        [routeId, direct, setTrips]
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

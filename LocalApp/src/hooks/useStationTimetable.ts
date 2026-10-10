import { useCallback, useEffect, useMemo, useState } from "react";
import type { StationDto, TimeTableDto, TrainTypeDto, TripWithStopTimesDto } from "../domain/dto.ts";
import { subscribe } from "../store/localStore.ts";
import { getTimetable } from "../store/timetableApi.ts";

const EMPTY_TIMETABLE: TimeTableDto = { stations: [], trainTypes: [], trips: [] };

/** 種別が見つからないとき用の既定値 */
const FALLBACK_TRAIN_TYPE: TrainTypeDto = { color: "#000", shortName: "", routeID: 0, name: "", fontBold: false, lineStyle: 0, index: 0, lineBold: false, id: 0 };

export type StationTimetableEntry = {
    trip: TripWithStopTimesDto;
    trainType: TrainTypeDto;
    /** 表示する時刻（0:00からの秒）。発時刻があれば発、無ければ着（終着駅）を使う */
    time: number;
    /** 発時刻が無く、着時刻で代用しているか（終着） */
    isArrivalOnly: boolean;
};

export type StationTimetableHour = {
    /** 0:00からの経過時間数（24を超える深夜帯もそのまま、24時で折り返さない） */
    hour: number;
    entries: StationTimetableEntry[];
};

/**
 * 指定方向の列車のうち、指定駅に停車するものを時刻順に集め、時間帯ごとにまとめます。
 *
 * @param trips 全列車（両方向を含む）
 * @param stationId 対象の駅ID
 * @param direct 0:下り 1:上り
 * @param trainTypeById 種別ID→種別のMap
 */
function buildHourRows(trips: TripWithStopTimesDto[], stationId: number, direct: number, trainTypeById: Map<number, TrainTypeDto>): StationTimetableHour[] {
    const entries: StationTimetableEntry[] = [];

    for (const trip of trips) {
        if (trip.direct !== direct || trip.id === -1) continue;
        const st = trip.stopTimesByStationId[stationId];
        if (!st) continue;
        // 停車(1)以外(未設定/通過/経由なし)はこの駅の時刻表には載せない
        if (st.stopType !== 1) continue;

        const isArrivalOnly = st.depTime < 0;
        const time = isArrivalOnly ? st.ariTime : st.depTime;
        if (time < 0) continue;

        entries.push({ trip, trainType: trainTypeById.get(trip.trainTypeID) ?? FALLBACK_TRAIN_TYPE, time, isArrivalOnly });
    }

    entries.sort((a, b) => a.time - b.time);

    const byHour = new Map<number, StationTimetableEntry[]>();
    for (const e of entries) {
        const hour = Math.floor(e.time / 3600);
        const list = byHour.get(hour);
        if (list) list.push(e);
        else byHour.set(hour, [e]);
    }

    return [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([hour, list]) => ({ hour, entries: list }));
}

/**
 * 1駅を基準にした時刻表（下り・上りそれぞれ、時間帯ごとの発車分一覧）を作ります。
 *
 * @param routeId 路線ID
 * @param stationId 対象の駅ID
 */
export function useStationTimetable(routeId: number, stationId: number) {
    const [data, setData] = useState<TimeTableDto>(EMPTY_TIMETABLE);

    const reload = useCallback(() => {
        setData(getTimetable(routeId));
    }, [routeId]);

    useEffect(() => {
        reload();
        const unsubscribe = subscribe(reload);
        return () => {
            unsubscribe();
        };
    }, [reload]);

    const station = useMemo(() => data.stations.find((s) => s.id === stationId) ?? null, [data.stations, stationId]);
    const stations = useMemo(() => [...data.stations].sort((a, b) => a.index - b.index), [data.stations]);
    const trainTypeById = useMemo(() => new Map(data.trainTypes.map((t) => [t.id, t] as const)), [data.trainTypes]);

    const down = useMemo(() => buildHourRows(data.trips, stationId, 0, trainTypeById), [data.trips, stationId, trainTypeById]);
    const up = useMemo(() => buildHourRows(data.trips, stationId, 1, trainTypeById), [data.trips, stationId, trainTypeById]);

    return { station, stations: stations as StationDto[], down, up };
}

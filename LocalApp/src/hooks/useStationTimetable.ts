import { useCallback, useEffect, useMemo, useState } from "react";
import type { StationDto, TimeTableDto, TrainTypeDto, TripWithStopTimesDto } from "../domain/dto.ts";
import { subscribe } from "../store/localStore.ts";
import { getTimetable } from "../store/timetableApi.ts";

const EMPTY_TIMETABLE: TimeTableDto = { stations: [], trainTypes: [], trips: [] };

/** 種別が見つからないとき用の既定値 */
const FALLBACK_TRAIN_TYPE: TrainTypeDto = { color: "#000", shortName: "", routeID: 0, name: "", fontBold: false, lineStyle: 0, index: 0, lineBold: false, id: 0 };

/** 時刻表の1日は午前3時始まり・翌午前2時終わりとする（0〜2時台は前日の深夜帯として扱う） */
const DAY_START_HOUR = 3;
/** 表示する時間帯の並び（3,4,...,23,0,1,2）。深夜0〜2時台は23時の次に表示する */
const DISPLAY_HOURS: number[] = [...Array(24).keys()].map((i) => (i + DAY_START_HOUR) % 24);

export type StationTimetableEntry = {
    trip: TripWithStopTimesDto;
    trainType: TrainTypeDto;
    /** 表示する時刻（0:00からの秒）。発時刻があれば発、無ければ着（終着駅）を使う */
    time: number;
    /** 発時刻が無く、着時刻で代用しているか（終着） */
    isArrivalOnly: boolean;
    /** この駅がこの列車の始発駅か */
    isOrigin: boolean;
    /** この駅がこの列車の終着駅か */
    isTerminus: boolean;
    /** 行き先（この列車の終着駅名の先頭1文字） */
    destChar: string;
    /** 行き先（この列車の終着駅名） */
    destName: string;
};

export type StationTimetableHour = {
    /** 表示用の時（0〜23。深夜0〜2時台は23時の次の行として扱う） */
    hour: number;
    entries: StationTimetableEntry[];
};

/**
 * 時刻表の1日の始まり(3:00)を基準にした並び替え用のキーを返します。
 * 3時より前の時刻は前日深夜帯とみなし、24時間足して23時台の続きとして扱います。
 *
 * @param time 0:00からの秒
 */
function dayKey(time: number): number {
    return time < DAY_START_HOUR * 3600 ? time + 24 * 3600 : time;
}

/**
 * 列車の走行順に並べた駅配列を返します（上りは駅のindex降順＝下りと逆順）。
 *
 * @param stations 路線の全駅（順不同）
 * @param direct 0:下り 1:上り
 */
function orderStationsByTravelDirection(stations: StationDto[], direct: number): StationDto[] {
    const sorted = [...stations].sort((a, b) => a.index - b.index);
    return direct === 1 ? sorted.reverse() : sorted;
}

/**
 * 列車ごとの始発駅・終着駅（停車のみ。通過/経由なしは除く）を求めます。
 *
 * @param trips 対象方向の列車
 * @param orderedStations 走行順に並べた駅
 */
function buildTripEndpoints(trips: TripWithStopTimesDto[], orderedStations: StationDto[]): Map<number, { originId: number; destId: number; destName: string }> {
    const result = new Map<number, { originId: number; destId: number; destName: string }>();
    for (const trip of trips) {
        const stops = orderedStations.filter((st) => trip.stopTimesByStationId[st.id]?.stopType === 1);
        if (stops.length === 0) continue;
        const dest = stops[stops.length - 1];
        result.set(trip.id, { originId: stops[0].id, destId: dest.id, destName: dest.name });
    }
    return result;
}

/**
 * 指定方向の列車のうち、指定駅に停車するものを時刻順に集め、3時始まり・翌2時終わりの時間帯ごとにまとめます。
 *
 * @param trips 全列車（両方向を含む）
 * @param stationId 対象の駅ID
 * @param direct 0:下り 1:上り
 * @param stations 路線の全駅（順不同）
 * @param trainTypeById 種別ID→種別のMap
 */
export function buildHourRows(trips: TripWithStopTimesDto[], stationId: number, direct: number, stations: StationDto[], trainTypeById: Map<number, TrainTypeDto>): StationTimetableHour[] {
    const directionTrips = trips.filter((t) => t.direct === direct && t.id !== -1);
    const orderedStations = orderStationsByTravelDirection(stations, direct);
    const endpoints = buildTripEndpoints(directionTrips, orderedStations);

    const entries: StationTimetableEntry[] = [];

    for (const trip of directionTrips) {
        const st = trip.stopTimesByStationId[stationId];
        if (!st) continue;
        // 停車(1)以外(未設定/通過/経由なし)はこの駅の時刻表には載せない
        if (st.stopType !== 1) continue;

        const isArrivalOnly = st.depTime < 0;
        const time = isArrivalOnly ? st.ariTime : st.depTime;
        if (time < 0) continue;

        const endpoint = endpoints.get(trip.id);
        entries.push({
            trip,
            trainType: trainTypeById.get(trip.trainTypeID) ?? FALLBACK_TRAIN_TYPE,
            time,
            isArrivalOnly,
            isOrigin: endpoint?.originId === stationId,
            isTerminus: endpoint?.destId === stationId,
            destChar: endpoint?.destName.charAt(0) ?? "",
            destName: endpoint?.destName ?? "",
        });
    }

    entries.sort((a, b) => dayKey(a.time) - dayKey(b.time));

    const byHour = new Map<number, StationTimetableEntry[]>();
    for (const e of entries) {
        const hour = Math.floor(e.time / 3600) % 24;
        const list = byHour.get(hour);
        if (list) list.push(e);
        else byHour.set(hour, [e]);
    }

    return DISPLAY_HOURS.map((hour) => ({ hour, entries: byHour.get(hour) ?? [] }));
}

/**
 * 時間帯ごとの行一覧から、実際に使われている列車種別を重複なく集めます（種別の並び順＝index順）。
 *
 * @param hourGroups 下り・上りの時間帯ごとの行一覧
 */
export function collectTrainTypes(hourGroups: StationTimetableHour[][]): TrainTypeDto[] {
    const byId = new Map<number, TrainTypeDto>();
    for (const hours of hourGroups) {
        for (const h of hours) {
            for (const e of h.entries as StationTimetableEntry[]) {
                byId.set(e.trainType.id, e.trainType);
            }
        }
    }
    return [...byId.values()].sort((a, b) => a.index - b.index);
}

/**
 * 行き先の頭文字と終着駅名の一覧を集めます（駅名ごとに1件）。
 *
 * @param hourGroups 下り・上りの時間帯ごとの行一覧
 */
export function collectDestinations(hourGroups: StationTimetableHour[][]): { char: string; name: string }[] {
    const seen = new Map<string, { char: string; name: string }>();
    for (const hours of hourGroups) {
        for (const h of hours) {
            for (const e of h.entries) {
                if (e.destName) seen.set(e.destName, { char: e.destChar, name: e.destName });
            }
        }
    }
    return [...seen.values()];
}

/**
 * 1駅を基準にした時刻表（下り・上りそれぞれ、3時始まり・翌2時終わりの時間帯ごとの発車分一覧）を作ります。
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

    const down = useMemo(() => buildHourRows(data.trips, stationId, 0, data.stations, trainTypeById), [data.trips, stationId, data.stations, trainTypeById]);
    const up = useMemo(() => buildHourRows(data.trips, stationId, 1, data.stations, trainTypeById), [data.trips, stationId, data.stations, trainTypeById]);

    return { station, stations: stations as StationDto[], down, up };
}

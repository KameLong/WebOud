import type { StationDto, TripWithStopTimesDto } from "./dto.ts";

/** 解析の対象になる列車（解析対象の時間帯に、始発駅を出発する列車） */
export type TargetTrip = {
    trip: TripWithStopTimesDto;
    /** 始発駅（その列車が最初に停車する駅） */
    originId: number;
    /** 始発駅の出発時刻（0:00からの秒。3時より前は翌日として+24h済みの値） */
    time: number;
};

/**
 * 列車の始発駅と、そこを出発する時刻を求めます。始発駅は、走行順（下りは駅のindex順、上りは逆順）で最初に停車する(停車種別が「停車」)駅です。
 * 出発時刻が無ければ到着時刻を使います。
 *
 * @param trip 列車
 * @param stationsInTravelOrder 走行順に並べた駅
 * @returns 始発駅と時刻。停車駅が無い、または時刻が無い列車は null
 */
export function originOf(trip: TripWithStopTimesDto, stationsInTravelOrder: StationDto[]): { stationId: number; time: number } | null {
    for (const st of stationsInTravelOrder) {
        const stop = trip.stopTimesByStationId[st.id];
        if (stop?.stopType !== 1) continue;
        const time = stop.depTime >= 0 ? stop.depTime : stop.ariTime;
        return time >= 0 ? { stationId: st.id, time } : null;
    }
    return null;
}

/**
 * 解析の対象の列車を求めます。始発駅を、指定の時間帯（開始以上・終了未満）に出発する列車です。
 *
 * @param trips 路線の全列車（両方向）
 * @param stations 路線の全駅（順不同）
 * @param start 時間帯の開始（0:00からの秒。3時より前は翌日として+24h）
 * @param end 時間帯の終了
 * @returns 対象の列車（出発時刻順）
 */
export function selectTargetTrips(trips: TripWithStopTimesDto[], stations: StationDto[], start: number, end: number): TargetTrip[] {
    const down = [...stations].sort((a, b) => a.index - b.index);
    const up = [...down].reverse();
    const result: TargetTrip[] = [];
    for (const trip of trips) {
        if (trip.id === -1) continue;
        const origin = originOf(trip, trip.direct === 1 ? up : down);
        if (origin && origin.time >= start && origin.time < end) result.push({ trip, originId: origin.stationId, time: origin.time });
    }
    return result.sort((a, b) => a.time - b.time);
}

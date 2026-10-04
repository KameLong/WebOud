import { getRoute, updateRoute } from "./localStore.ts";
import type { StationDto, StopTimeDto, TimeTableDto, TrainTypeDto, TripDto, TripWithStopTimesDto } from "../domain/dto.ts";

/**
 * 路線の駅・列車種別・列車をまとめて返します（路線が無ければ空）。
 *
 * @param routeId 路線ID
 */
export function getTimetable(routeId: number): TimeTableDto {
    const route = getRoute(routeId);
    if (!route) return { stations: [], trainTypes: [], trips: [] };
    return { stations: route.stations, trainTypes: route.trainTypes, trips: route.trips };
}

/* ---------------- Stations ---------------- */

/**
 * 駅を追加します。
 *
 * @param routeId 路線ID
 * @param dto idを除いた駅データ（idは自動採番）
 */
export function addStation(routeId: number, dto: Omit<StationDto, "id">): StationDto {
    let created!: StationDto;
    updateRoute(routeId, (r) => {
        const id = r.counters.station;
        created = { ...dto, id };
        return { ...r, counters: { ...r.counters, station: id + 1 }, stations: [...r.stations, created] };
    });
    return created;
}

/**
 * 駅を更新します。
 *
 * @param routeId 路線ID
 * @param item 更新後の駅（idで対象を特定）
 */
export function updateStation(routeId: number, item: StationDto) {
    updateRoute(routeId, (r) => ({ ...r, stations: r.stations.map((s) => (s.id === item.id ? item : s)) }));
}

/**
 * 駅を削除します。
 *
 * @param routeId 路線ID
 * @param id 削除する駅ID
 */
export function deleteStation(routeId: number, id: number) {
    updateRoute(routeId, (r) => ({ ...r, stations: r.stations.filter((s) => s.id !== id) }));
}

/* ---------------- TrainTypes ---------------- */

/**
 * 列車種別を追加します。
 *
 * @param routeId 路線ID
 * @param dto idを除いた種別データ（idは自動採番）
 */
export function addTrainType(routeId: number, dto: Omit<TrainTypeDto, "id">): TrainTypeDto {
    let created!: TrainTypeDto;
    updateRoute(routeId, (r) => {
        const id = r.counters.trainType;
        created = { ...dto, id };
        return { ...r, counters: { ...r.counters, trainType: id + 1 }, trainTypes: [...r.trainTypes, created] };
    });
    return created;
}

/**
 * 列車種別を更新します。
 *
 * @param routeId 路線ID
 * @param item 更新後の種別（idで対象を特定）
 */
export function updateTrainType(routeId: number, item: TrainTypeDto) {
    updateRoute(routeId, (r) => ({ ...r, trainTypes: r.trainTypes.map((t) => (t.id === item.id ? item : t)) }));
}

/**
 * 列車種別を削除します。
 *
 * @param routeId 路線ID
 * @param id 削除する種別ID
 */
export function deleteTrainType(routeId: number, id: number) {
    updateRoute(routeId, (r) => ({ ...r, trainTypes: r.trainTypes.filter((t) => t.id !== id) }));
}

/**
 * 指定した種別の列車を、別の種別へ一括変更します。
 *
 * @param routeId 路線ID
 * @param fromIds 変更前の種別ID（複数可）
 * @param toId 変更後の種別ID
 */
export function reassignTrainType(routeId: number, fromIds: number[], toId: number) {
    const from = new Set(fromIds);
    updateRoute(routeId, (r) => ({
        ...r,
        trips: r.trips.map((t) => (from.has(t.trainTypeID) ? { ...t, trainTypeID: toId } : t)),
    }));
}

/* ---------------- Trips / StopTimes ---------------- */

/**
 * 空の列車を末尾に追加します。
 *
 * @param routeId 路線ID
 * @param direct 0:下り 1:上り
 */
export function createTrip(routeId: number, direct: number): TripWithStopTimesDto {
    let created!: TripWithStopTimesDto;
    updateRoute(routeId, (r) => {
        const id = r.counters.trip;
        created = {
            id,
            routeID: routeId,
            direct,
            trainTypeID: r.trainTypes[0]?.id ?? 0,
            name: "",
            no: "",
            stopTimesByStationId: {},
        };
        return { ...r, counters: { ...r.counters, trip: id + 1 }, trips: [...r.trips, created] };
    });
    return created;
}

/**
 * 同じ方向の列車の中で、指定位置に空の列車を挿入します。
 *
 * @param routeId 路線ID
 * @param index 同方向の列車内での挿入位置（範囲外は端に丸める）
 * @param direct 0:下り 1:上り
 */
export function insertTripAt(routeId: number, index: number, direct: number): TripWithStopTimesDto {
    let created!: TripWithStopTimesDto;
    updateRoute(routeId, (r) => {
        const id = r.counters.trip;
        created = {
            id,
            routeID: routeId,
            direct,
            trainTypeID: r.trainTypes[0]?.id ?? 0,
            name: "",
            no: "",
            stopTimesByStationId: {},
        };
        const sameDirection = r.trips.filter((t) => t.direct === direct);
        const others = r.trips.filter((t) => t.direct !== direct);
        const nextSameDirection = [...sameDirection];
        nextSameDirection.splice(Math.max(0, Math.min(index, sameDirection.length)), 0, created);
        return { ...r, counters: { ...r.counters, trip: id + 1 }, trips: [...others, ...nextSameDirection] };
    });
    return created;
}

/**
 * 列車のプロパティ（番号・名前・種別・方向）を更新します。時刻は変更しません。
 *
 * @param routeId 路線ID
 * @param trip 更新後の列車情報（idで対象を特定）
 */
export function putTrip(routeId: number, trip: TripDto) {
    updateRoute(routeId, (r) => ({
        ...r,
        trips: r.trips.map((t) =>
            t.id === trip.id ? { ...t, no: trip.no, name: trip.name, trainTypeID: trip.trainTypeID, direct: trip.direct } : t
        ),
    }));
}

/**
 * 列車を削除します。
 *
 * @param routeId 路線ID
 * @param ids 削除する列車IDの配列
 */
export function deleteTrips(routeId: number, ids: number[]) {
    const idSet = new Set(ids);
    updateRoute(routeId, (r) => ({ ...r, trips: r.trips.filter((t) => !idSet.has(t.id)) }));
}

/**
 * 指定tripの指定駅の時刻を作成/更新し、更新後のTripを返します
 *
 * @param routeId 路線ID
 * @param stopTime 保存する時刻（tripID/stationIDで対象を特定。idが未採番なら新規採番）
 */
export function setStopTime(routeId: number, stopTime: StopTimeDto): TripWithStopTimesDto | undefined {
    let updatedTrip: TripWithStopTimesDto | undefined;
    updateRoute(routeId, (r) => {
        const tripIndex = r.trips.findIndex((t) => t.id === stopTime.tripID);
        if (tripIndex < 0) return r;

        const trip = r.trips[tripIndex];
        const existing = trip.stopTimesByStationId[stopTime.stationID];
        const usesNewId = !existing || existing.id <= 0;
        const id = usesNewId ? r.counters.stopTime : existing.id;
        const nextStopTime: StopTimeDto = { ...stopTime, id };

        const nextTrip: TripWithStopTimesDto = {
            ...trip,
            stopTimesByStationId: { ...trip.stopTimesByStationId, [stopTime.stationID]: nextStopTime },
        };
        updatedTrip = nextTrip;

        const nextTrips = [...r.trips];
        nextTrips[tripIndex] = nextTrip;

        return {
            ...r,
            counters: usesNewId ? { ...r.counters, stopTime: id + 1 } : r.counters,
            trips: nextTrips,
        };
    });
    return updatedTrip;
}

/**
 * 指定tripの指定駅・パートの時刻をoffsetSeconds分だけずらします
 *
 * @param routeId 路線ID
 * @param tripId 対象の列車ID
 * @param stationId 対象の駅ID
 * @param part ずらす対象（arr:着 dep:発。trackは何もしない）
 * @param offsetSeconds ずらす秒数（負で戻す）
 */
export function shiftStopTime(routeId: number, tripId: number, stationId: number, part: "arr" | "dep" | "track", offsetSeconds: number) {
    let updatedTrip: TripWithStopTimesDto | undefined;
    updateRoute(routeId, (r) => {
        const tripIndex = r.trips.findIndex((t) => t.id === tripId);
        if (tripIndex < 0) return r;
        const trip = r.trips[tripIndex];
        const existing = trip.stopTimesByStationId[stationId];
        if (!existing) return r;

        const next = { ...existing };
        if (part === "arr" && next.ariTime >= 0) next.ariTime += offsetSeconds;
        if (part === "dep" && next.depTime >= 0) next.depTime += offsetSeconds;

        const nextTrip: TripWithStopTimesDto = {
            ...trip,
            stopTimesByStationId: { ...trip.stopTimesByStationId, [stationId]: next },
        };
        updatedTrip = nextTrip;

        const nextTrips = [...r.trips];
        nextTrips[tripIndex] = nextTrip;
        return { ...r, trips: nextTrips };
    });
    return updatedTrip;
}

/**
 * 指定方向の列車を orderedTripIds の順番に並び替えます（他方向の列車の並びはそのまま）
 *
 * @param routeId 路線ID
 * @param direct 並び替える方向（0:下り 1:上り）
 * @param orderedTripIds 新しい並び順の列車ID配列
 */
export function reorderTrips(routeId: number, direct: number, orderedTripIds: number[]) {
    updateRoute(routeId, (r) => {
        const orderIndex = new Map(orderedTripIds.map((id, i) => [id, i]));
        const others = r.trips.filter((t) => t.direct !== direct);
        const sameDirection = r.trips.filter((t) => t.direct === direct);
        const sorted = [...sameDirection].sort((a, b) => (orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER));
        return { ...r, trips: [...others, ...sorted] };
    });
}

/**
 * クリップボードからの複数Trip一括追加。新しいIDを採番して追加します
 *
 * @param routeId 路線ID
 * @param trips 追加する列車（id/tripIDはプレースホルダ可。採番し直される）
 */
export function addTripBlock(routeId: number, trips: TripWithStopTimesDto[]): TripWithStopTimesDto[] {
    const created: TripWithStopTimesDto[] = [];
    updateRoute(routeId, (r) => {
        let tripCounter = r.counters.trip;
        let stopTimeCounter = r.counters.stopTime;

        const newTrips = trips.map((t) => {
            const tripId = tripCounter++;
            const stMap: Record<number, StopTimeDto> = {};
            for (const v of Object.values(t.stopTimesByStationId)) {
                const stId = stopTimeCounter++;
                stMap[v.stationID] = { ...v, id: stId, tripID: tripId };
            }
            const trip: TripWithStopTimesDto = { ...t, id: tripId, routeID: routeId, stopTimesByStationId: stMap };
            created.push(trip);
            return trip;
        });

        return {
            ...r,
            counters: { ...r.counters, trip: tripCounter, stopTime: stopTimeCounter },
            trips: [...r.trips, ...newTrips],
        };
    });
    return created;
}

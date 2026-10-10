import { getRoute, updateRoute, withDefaultTrainType } from "./localStore.ts";
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

/** indexを配列の並びどおり0,1,2…に振り直す（変更が無い要素は同じ参照のまま） */
function renumber<T extends { index: number }>(list: T[]): T[] {
    return list.map((x, i) => (x.index === i ? x : { ...x, index: i }));
}

/**
 * 並び順(index)で並んだ配列の指定位置に新しい要素を挿入し、indexを振り直します。
 *
 * @param list 現在の配列
 * @param position 挿入位置（範囲外は端に丸める）
 * @param added 挿入する要素（idは採番済み）
 */
function insertAtPosition<T extends { index: number }>(list: T[], position: number, added: T[]): T[] {
    const sorted = [...list].sort((a, b) => a.index - b.index);
    sorted.splice(Math.max(0, Math.min(position, sorted.length)), 0, ...added);
    return renumber(sorted);
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
/**
 * 駅を指定位置にまとめて挿入します（1回の更新。以降の駅のindexは振り直される）。
 *
 * @param routeId 路線ID
 * @param position 挿入位置（0始まり。範囲外は端に丸める）
 * @param dtos idを除いた駅データ（indexは無視され、並び順で振り直される）
 */
export function insertStations(routeId: number, position: number, dtos: Omit<StationDto, "id">[]): StationDto[] {
    let created: StationDto[] = [];
    updateRoute(routeId, (r) => {
        let id = r.counters.station;
        created = dtos.map((dto) => ({ ...dto, id: id++ }));
        return { ...r, counters: { ...r.counters, station: id }, stations: insertAtPosition(r.stations, position, created) };
    });
    return created;
}

/**
 * 駅をまとめて削除し、index振り直しと、削除した駅の時刻データの掃除も行います。
 *
 * @param routeId 路線ID
 * @param ids 削除する駅IDの配列
 */
export function deleteStations(routeId: number, ids: number[]) {
    const idSet = new Set(ids);
    updateRoute(routeId, (r) => ({
        ...r,
        stations: renumber(r.stations.filter((s) => !idSet.has(s.id))),
        trips: r.trips.map((t) => {
            if (!Object.keys(t.stopTimesByStationId).some((k) => idSet.has(Number(k)))) return t;
            return { ...t, stopTimesByStationId: Object.fromEntries(Object.entries(t.stopTimesByStationId).filter(([k]) => !idSet.has(Number(k)))) };
        }),
    }));
}

export function updateStation(routeId: number, item: StationDto) {
    updateRoute(routeId, (r) => ({ ...r, stations: r.stations.map((s) => (s.id === item.id ? item : s)) }));
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
/**
 * 列車種別を指定位置にまとめて挿入します（1回の更新。以降の種別のindexは振り直される）。
 *
 * @param routeId 路線ID
 * @param position 挿入位置（0始まり。範囲外は端に丸める）
 * @param dtos idを除いた種別データ（indexは無視され、並び順で振り直される）
 */
export function insertTrainTypes(routeId: number, position: number, dtos: Omit<TrainTypeDto, "id">[]): TrainTypeDto[] {
    let created: TrainTypeDto[] = [];
    updateRoute(routeId, (r) => {
        let id = r.counters.trainType;
        created = dtos.map((dto) => ({ ...dto, id: id++ }));
        return { ...r, counters: { ...r.counters, trainType: id }, trainTypes: insertAtPosition(r.trainTypes, position, created) };
    });
    return created;
}

/**
 * 列車種別をまとめて削除し、indexを振り直します。すべて削除した場合は標準の列車種別(普通)を自動で追加します。
 * 使用中の列車の処理は呼び出し側で先に行うこと。
 *
 * @param routeId 路線ID
 * @param ids 削除する種別IDの配列
 */
export function deleteTrainTypes(routeId: number, ids: number[]) {
    const idSet = new Set(ids);
    // すべて削除した場合は、標準の列車種別が自動で追加される
    updateRoute(routeId, (r) => withDefaultTrainType({ ...r, trainTypes: renumber(r.trainTypes.filter((t) => !idSet.has(t.id))) }));
}

export function updateTrainType(routeId: number, item: TrainTypeDto) {
    updateRoute(routeId, (r) => ({ ...r, trainTypes: r.trainTypes.map((t) => (t.id === item.id ? item : t)) }));
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
        trips: r.trips.map((t) => (t.id === trip.id ? { ...t, no: trip.no, name: trip.name, trainTypeID: trip.trainTypeID, direct: trip.direct } : t)),
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
 * 指定した列車の、指定駅（のカーソル位置の時刻）から後ろの駅の時刻を、まとめてずらします。
 * 先頭の駅は、カーソルがある「着」なら着と発、「発」（または番線）なら発だけを対象にし、
 * それより後ろの駅は着・発の両方を対象にします。未設定(-1)の時刻は変えず、結果が0より小さくなる場合は0にします。
 *
 * @param routeId 路線ID
 * @param tripId 対象の列車ID
 * @param stationIds ずらす駅のID（表示順に、カーソルの駅から末尾まで）
 * @param firstPart 先頭の駅でカーソルがあるパート（arr/track/dep）
 * @param offsetSeconds ずらす秒数（負で戻す）
 */
export function shiftStopTimesFrom(routeId: number, tripId: number, stationIds: number[], firstPart: "arr" | "dep" | "track", offsetSeconds: number) {
    updateRoute(routeId, (r) => {
        const tripIndex = r.trips.findIndex((t) => t.id === tripId);
        if (tripIndex < 0) return r;
        const trip = r.trips[tripIndex];

        const shift = (v: number) => (v >= 0 ? Math.max(0, v + offsetSeconds) : v);
        const stopTimes = { ...trip.stopTimesByStationId };
        stationIds.forEach((stationId, i) => {
            const existing = stopTimes[stationId];
            if (!existing) return;
            const next = { ...existing };
            const isFirst = i === 0;
            if (!isFirst || firstPart === "arr") next.ariTime = shift(next.ariTime);
            next.depTime = shift(next.depTime);
            stopTimes[stationId] = next;
        });

        const nextTrips = [...r.trips];
        nextTrips[tripIndex] = { ...trip, stopTimesByStationId: stopTimes };
        return { ...r, trips: nextTrips };
    });
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
 * @param position 同じ方向の列車の中での挿入位置（0始まり。範囲外は端に丸める）。省略時は末尾に追加する
 */
export function addTripBlock(routeId: number, trips: TripWithStopTimesDto[], position?: number): TripWithStopTimesDto[] {
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

        const counters = { ...r.counters, trip: tripCounter, stopTime: stopTimeCounter };
        if (position === undefined || newTrips.length === 0) {
            return { ...r, counters, trips: [...r.trips, ...newTrips] };
        }

        // 同じ方向の列車の中の指定位置へ挿入する（他方向の列車の並びはそのまま）
        const direct = newTrips[0].direct;
        const sameDirection = r.trips.filter((t) => t.direct === direct);
        const others = r.trips.filter((t) => t.direct !== direct);
        sameDirection.splice(Math.max(0, Math.min(position, sameDirection.length)), 0, ...newTrips);
        return { ...r, counters, trips: [...others, ...sameDirection] };
    });
    return created;
}

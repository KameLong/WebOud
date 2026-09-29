import { getRoute, updateRoute } from "./localStore.ts";
import type { StationDto, StopTimeDto, TimeTableDto, TrainTypeDto, TripDto, TripWithStopTimesDto } from "../domain/dto.ts";

export function getTimetable(routeId: number): TimeTableDto {
    const route = getRoute(routeId);
    if (!route) return { stations: [], trainTypes: [], trips: [] };
    return { stations: route.stations, trainTypes: route.trainTypes, trips: route.trips };
}

/* ---------------- Stations ---------------- */

export function addStation(routeId: number, dto: Omit<StationDto, "id">): StationDto {
    let created!: StationDto;
    updateRoute(routeId, (r) => {
        const id = r.counters.station;
        created = { ...dto, id };
        return { ...r, counters: { ...r.counters, station: id + 1 }, stations: [...r.stations, created] };
    });
    return created;
}

export function updateStation(routeId: number, item: StationDto) {
    updateRoute(routeId, (r) => ({ ...r, stations: r.stations.map((s) => (s.id === item.id ? item : s)) }));
}

export function deleteStation(routeId: number, id: number) {
    updateRoute(routeId, (r) => ({ ...r, stations: r.stations.filter((s) => s.id !== id) }));
}

/* ---------------- TrainTypes ---------------- */

export function addTrainType(routeId: number, dto: Omit<TrainTypeDto, "id">): TrainTypeDto {
    let created!: TrainTypeDto;
    updateRoute(routeId, (r) => {
        const id = r.counters.trainType;
        created = { ...dto, id };
        return { ...r, counters: { ...r.counters, trainType: id + 1 }, trainTypes: [...r.trainTypes, created] };
    });
    return created;
}

export function updateTrainType(routeId: number, item: TrainTypeDto) {
    updateRoute(routeId, (r) => ({ ...r, trainTypes: r.trainTypes.map((t) => (t.id === item.id ? item : t)) }));
}

export function deleteTrainType(routeId: number, id: number) {
    updateRoute(routeId, (r) => ({ ...r, trainTypes: r.trainTypes.filter((t) => t.id !== id) }));
}

/* ---------------- Trips / StopTimes ---------------- */

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

export function putTrip(routeId: number, trip: TripDto) {
    updateRoute(routeId, (r) => ({
        ...r,
        trips: r.trips.map((t) =>
            t.id === trip.id ? { ...t, no: trip.no, name: trip.name, trainTypeID: trip.trainTypeID, direct: trip.direct } : t
        ),
    }));
}

export function deleteTrips(routeId: number, ids: number[]) {
    const idSet = new Set(ids);
    updateRoute(routeId, (r) => ({ ...r, trips: r.trips.filter((t) => !idSet.has(t.id)) }));
}

/** 指定tripの指定駅の時刻を作成/更新し、更新後のTripを返します */
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

/** 指定tripの指定駅・パートの時刻をoffsetSeconds分だけずらします */
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

/** クリップボードからの複数Trip一括追加。新しいIDを採番して追加します */
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

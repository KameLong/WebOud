import type { StationDto, TrainTypeDto, TripWithStopTimesDto } from "../domain/dto.ts";

export type RouteCounters = {
    station: number;
    trainType: number;
    trip: number;
    stopTime: number;
};

export type RouteRecord = {
    id: number;
    name: string;
    updatedAt: number;
    counters: RouteCounters;
    stations: StationDto[];
    trainTypes: TrainTypeDto[];
    trips: TripWithStopTimesDto[];
};

export type RouteSummary = {
    id: number;
    name: string;
    updatedAt: number;
    stationCount: number;
    trainTypeCount: number;
    tripCount: number;
};

export type StoreState = {
    version: 1;
    nextRouteId: number;
    routes: RouteRecord[];
};

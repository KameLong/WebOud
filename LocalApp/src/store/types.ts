import type { OdTable } from "../domain/od.ts";
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
    /** 駅間の利用客数（解析ページで入力する、1時間あたりの人数）。入力が無い路線・古いデータには無い */
    od?: OdTable;
    /** 乗客が駅に来る時間帯（解析ページで入力する）。0:00からの秒（3時より前は翌日として+24h）。どちらも入力が無いうちは無い */
    arrival?: { start?: number; end?: number };
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

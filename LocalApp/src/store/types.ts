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
    /** 解析対象の時間帯（始発駅をこの時間帯に出発する列車が、解析結果を表示する対象）。形式は arrival と同じ */
    target?: { start?: number; end?: number };
    /** 合計所要時間を求める時間帯（この時間帯に発駅に着いた乗客が、着駅に着くまでに要した時間の合計を求める）。形式は arrival と同じ */
    total?: { start?: number; end?: number };
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

export type StationDto = {
    id: number;
    name: string;
    routeID: number;
    index: number;
    showStyle: number; // int (bit flags)
};

export type TrainTypeDto = {
    id: number;
    name: string;
    routeID: number;
    index: number;
    shortName: string;
    color: string; // "#RRGGBB"
    fontBold: boolean;
    lineBold: boolean;
    lineStyle: number; // 0:実線 1:破線 2:点線
};

export type StopTimeDto = {
    id: number;
    tripID: number;
    stationID: number;
    depTime: number;
    ariTime: number;
    stopType: number;
    stop: number;
};

export type TripDto = {
    id: number;
    routeID: number;
    direct: number; // 0:下り 1:上り
    trainTypeID: number;
    name: string;
    no: string;
};

export type TripWithStopTimesDto = TripDto & {
    stopTimesByStationId: Record<number, StopTimeDto>;
};

export type TimeTableDto = {
    stations: StationDto[];
    trainTypes: TrainTypeDto[];
    trips: TripWithStopTimesDto[];
};

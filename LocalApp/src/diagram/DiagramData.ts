import type { StationDto, TrainTypeDto, TripDto } from "../domain/dto.ts";

export interface DiagramStation {
    stationTime: number;
    station: StationDto;
}
export interface DiagramTrip {
    stopTimes: DiagramStopTime[];
    trainType: TrainTypeDto;
    train: TripDto;
}
export interface DiagramStopTime {
    depTime: number;
    ariTime: number;
}

export interface DiagramData {
    stations: DiagramStation[];
    upTrips: DiagramTrip[];
    downTrips: DiagramTrip[];
}

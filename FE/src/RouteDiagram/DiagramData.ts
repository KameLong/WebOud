import type {StationDto} from "../server/DTO/StationDTO.ts";
import type {TrainTypeDto} from "../server/DTO/TrainTypeDTO.ts";
import type {TripDto} from "../server/DTO/TripDTO.ts";

export interface DiagramStation {
    stationTime: number;
    station:StationDto;
}
export interface DiagramTrip{
    stopTimes: DiagramStopTime[];
    trainType: TrainTypeDto;
    train:TripDto;
}
export interface DiagramStopTime{
    depTime: number;
    ariTime: number;

}

export interface DiagramData {
    stations: DiagramStation[];
    upTrips: DiagramTrip[];
    downTrips: DiagramTrip[];
}
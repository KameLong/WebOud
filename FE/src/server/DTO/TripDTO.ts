import type {StopTimeDto} from "./StopTimeDTO.ts";

export type TripDto={
    id:number,
    routeID:number,
    direct:number,
    trainTypeID:number,
    name:string,
    no:string
}
export type TripCreateDto={
    routeID:number,
    direct:number,
    trainTypeID:number,
    name:string,
    no:string
}
export type TripUpdateDto={
    routeID:number,
    direct:number,
    trainTypeID:number,
    name:string,
    no:string
}
export type TripWithStopTimesDto=TripDto&{
    stopTimesByStationId: Record<number, StopTimeDto>;
}

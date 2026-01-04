import type {StationDto} from "./StationDTO.ts";
import type {TrainTypeDto} from "./TrainTypeDTO.ts";
import type {TripDto, TripWithStopTimesDto} from "./TripDTO.ts";
import type {StopTimeDto} from "./StopTimeDTO.ts";

export type TimeTableDto=
{
    stations:StationDto[];
    trainTypes:TrainTypeDto[];
    trips:TripWithStopTimesDto[];
};
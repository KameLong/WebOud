import type {StationDto} from "./StationDTO.ts";
import type {TrainTypeDto} from "./TrainTypeDTO.ts";
import type { TripWithStopTimesDto} from "./TripDTO.ts";

export type TimeTableDto=
{
    stations:StationDto[];
    trainTypes:TrainTypeDto[];
    trips:TripWithStopTimesDto[];
};
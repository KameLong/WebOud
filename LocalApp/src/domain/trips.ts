import type { StationDto, StopTimeDto, TripWithStopTimesDto } from "./dto.ts";

/**
 * 末尾の入力用プレースホルダ列車（id=-1）を作ります。
 *
 * @param routeID 所属する路線ID
 * @param direct 0:下り 1:上り
 */
export function createPlaceholderTrip(routeID: number, direct: number): TripWithStopTimesDto {
    return {
        id: -1,
        routeID,
        trainTypeID: 0,
        no: "",
        name: "",
        direct,
        stopTimesByStationId: {},
    };
}

/**
 * 列車一覧の末尾にプレースホルダ列車が必ず1つだけ付くように整えます。
 *
 * @param trips 対象方向の列車一覧
 * @param routeID プレースホルダ作成時に使う路線ID
 * @param direct プレースホルダ作成時に使う方向
 */
export function ensureTailPlaceholder(trips: TripWithStopTimesDto[], routeID: number, direct: number): TripWithStopTimesDto[] {
    const nonPlaceholder = trips.filter((t) => t.id !== -1);
    const placeholders = trips.filter((t) => t.id === -1);

    const tail = placeholders.length ? placeholders[placeholders.length - 1] : null;

    const result = [...nonPlaceholder];
    result.push(tail ?? createPlaceholderTrip(routeID, direct));

    return result;
}

//与えられたstoptimeの配列の中でstationIndexより前にある駅のうち、時刻があるものを返します。
/**
 * @param stopTimes 駅順に並べた停車時刻の配列
 * @param stationIndex 探索を始める駅のインデックス（この駅から先頭方向へ遡る）
 */
export function getLastTimeFormStopTimes(stopTimes: StopTimeDto[], stationIndex: number): number {
    for (let i = stationIndex; i >= 0; i--) {
        if (stopTimes[i]?.depTime >= 0) {
            return stopTimes[i]?.depTime;
        }
        if (stopTimes[i]?.ariTime >= 0) {
            return stopTimes[i]?.ariTime;
        }
    }
    return -1;
}

/**
 * 駅の並び順に合わせて、列車の停車時刻を配列にします（未登録の駅はundefined）。
 *
 * @param trip 対象の列車
 * @param stations 表示順に並べた駅
 */
export function makeStopTimeList(trip: TripWithStopTimesDto, stations: StationDto[]) {
    return stations.map((st) => {
        return trip.stopTimesByStationId[st.id];
    });
}

/**
 * 指定駅の時刻を返します。まだ時刻が保存されていない場合は、
 * その駅・列車に紐づく未保存のStopTimeDtoを作って返します
 * （tripIDはtrip.idをそのまま使うため、placeholder列車(-1)でもそのまま機能します）。
 */
export function getOrCreateStopTime(trip: TripWithStopTimesDto, stationId: number): StopTimeDto {
    return (
        trip.stopTimesByStationId[stationId] ?? {
            id: 0,
            tripID: trip.id,
            stationID: stationId,
            ariTime: -1,
            depTime: -1,
            stop: 0,
            stopType: 0,
        }
    );
}

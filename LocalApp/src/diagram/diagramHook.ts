import { useEffect, useState } from "react";
import type { StopTimeDto } from "../domain/dto.ts";
import type { DiagramStation } from "./DiagramData.ts";
import type { DiagramLine } from "./DiagramCanvas.ts";
import type { StationDto, TrainTypeDto, TripWithStopTimesDto } from "../domain/dto.ts";

export function hasTime(st: StopTimeDto) {
    return !(st.ariTime === -1 && st.depTime === -1);
}
const getAD = (stopTime: StopTimeDto) => {
    if (stopTime.ariTime >= 0) {
        return stopTime.ariTime;
    }
    return stopTime.depTime;
};
const getDA = (stopTime: StopTimeDto) => {
    if (stopTime.depTime >= 0) {
        return stopTime.depTime;
    }
    return stopTime.ariTime;
};
const diagramStartTime = 3600 * 3;
function diagramTime(time: number): number {
    if (time < 0) {
        return time;
    }
    if (time < diagramStartTime) {
        return time + 24 * 3600;
    }
    return time;
}

type TripWithTimes = TripWithStopTimesDto & { times: StopTimeDto[] };

const makeDiagramLine = (trips: { train: TripWithTimes; stopTimes: StopTimeDto[]; trainType: TrainTypeDto }[], routeStations: DiagramStation[], direction: number): DiagramLine[] => {
    const diagramLines: DiagramLine[] = [];
    trips.forEach((trip) => {
        const diagramLine: DiagramLine = {
            color: trip.trainType.color,
            points: [],
            number: trip.train.no,
        };
        const stopTimes = trip.stopTimes;
        const stationIndexArray = new Array(stopTimes.length).fill(0).map((_, _i) => _i);
        if (direction === 1) {
            stationIndexArray.reverse();
        }
        for (const i of stationIndexArray) {
            const st = stopTimes[i];
            if (st.ariTime >= 0) {
                diagramLine.points.push({
                    x: diagramTime(st.ariTime),
                    y: routeStations[i].stationTime,
                });
            }
            if (st.depTime >= 0) {
                diagramLine.points.push({
                    x: diagramTime(st.depTime),
                    y: routeStations[i].stationTime,
                });
            }
        }
        diagramLines.push(diagramLine);
    });
    return diagramLines;
};

export function useDiagramViewHook2(stations: StationDto[], trainTypes: TrainTypeDto[], trip: TripWithStopTimesDto[]) {
    const [diaStations, setDiaStations] = useState<DiagramStation[]>([]);
    const [downLines, setDownLines] = useState<DiagramLine[]>([]);
    const [upLines, setUpLines] = useState<DiagramLine[]>([]);

    const _downTrips: TripWithTimes[] = trip
        .filter((t) => t.direct === 0 && t.id !== -1)
        .map((t) => ({
            ...t,
            times: stations.map((station) => {
                const st = t.stopTimesByStationId[station.id];
                if (st === undefined) {
                    return { id: -1, tripID: t.id, stop: -1, depTime: -1, stopType: 0, ariTime: -1, stationID: station.id };
                }
                return st;
            }),
        }));

    const _upTrips: TripWithTimes[] = trip
        .filter((t) => t.direct === 1 && t.id !== -1)
        .map((t) => ({
            ...t,
            times: stations.map((station) => {
                const st = t.stopTimesByStationId[station.id];
                if (st === undefined) {
                    return { id: -1, tripID: t.id, stop: -1, depTime: -1, stopType: 0, ariTime: -1, stationID: station.id };
                }
                return st;
            }),
        }));

    useEffect(() => {
        if (stations.length === 0) {
            setDiaStations([]);
            setDownLines([]);
            setUpLines([]);
            return;
        }
        const rs: DiagramStation[] = [];
        rs.push({ stationTime: 0, station: stations[0] });
        let nowStationTime = 0;
        for (let i = 1; i < stations.length; i++) {
            let minTime = 24 * 3600;
            for (let j = 0; j < _downTrips.length; j++) {
                const t = _downTrips[j];
                const stopTimes = t.times;
                if (hasTime(stopTimes[i]) && hasTime(stopTimes[i - 1])) {
                    let time = diagramTime(getAD(t.times[i])) - diagramTime(getDA(t.times[i - 1]));
                    if (t.times[i].stopType !== 1) {
                        time += 30;
                    }
                    if (t.times[i - 1].stopType !== 1) {
                        time += 30;
                    }
                    minTime = Math.min(minTime, time);
                }
            }
            for (let j = 0; j < _upTrips.length; j++) {
                const t = _upTrips[j];
                const stopTimes = t.times;
                if (hasTime(stopTimes[i]) && hasTime(stopTimes[i - 1])) {
                    let time = diagramTime(getAD(t.times[i - 1])) - diagramTime(getDA(t.times[i]));
                    if (t.times[i].stopType !== 1) {
                        time += 30;
                    }
                    if (t.times[i - 1].stopType !== 1) {
                        time += 30;
                    }
                    minTime = Math.min(minTime, time);
                }
            }
            if (minTime === 24 * 3600) {
                minTime = 90;
            }
            if (minTime < 90) {
                minTime = 90;
            }
            nowStationTime = nowStationTime + minTime;
            rs.push({ stationTime: nowStationTime, station: stations[i] });
        }

        setDiaStations(rs);
        const downTrips = _downTrips.map((item) => ({
            train: item,
            stopTimes: item.times.map((st) => ({ ...st, depTime: getDA(st), ariTime: getAD(st) })),
            trainType: trainTypes.find((tt) => tt.id === item.trainTypeID) ?? trainTypes[0],
        }));
        const upTrips = _upTrips.map((item) => ({
            train: item,
            stopTimes: item.times.map((st) => ({ ...st, depTime: getDA(st), ariTime: getAD(st) })),
            trainType: trainTypes.find((tt) => tt.id === item.trainTypeID) ?? trainTypes[0],
        }));

        setDownLines(makeDiagramLine(downTrips, rs, 0));
        setUpLines(makeDiagramLine(upTrips, rs, 1));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trip, trainTypes, stations]);
    return { diaStations, downLines, upLines };
}

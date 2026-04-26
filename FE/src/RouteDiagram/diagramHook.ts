import {useEffect, useState} from "react";
import type {StopTimeDto} from "../server/DTO/StopTimeDTO.ts";
import type {DiagramStation, DiagramTrip} from "./DiagramData.ts";
import type {DiagramLine} from "./DiagramCanvas.ts";
import type {StationDto} from "../server/DTO/StationDTO.ts";
import type {TrainTypeDto} from "../server/DTO/TrainTypeDTO.ts";
import type {TripDto, TripWithStopTimesDto} from "../server/DTO/TripDTO.ts";


export function hasTime(st: StopTimeDto) {
    return st.ariTime===-1&&st.depTime===-1;
}
const getAD = (stopTime: StopTimeDto) => {
    if (stopTime.ariTime >= 0) {
        return stopTime.ariTime;
    }
    return stopTime.depTime;
}
const getDA = (stopTime: StopTimeDto) => {
    if (stopTime.depTime >= 0) {
        return stopTime.depTime;
    }
    return stopTime.ariTime;
}
const diagramStartTime=3600*3;
function diagramTime(time:number):number{
    if(time<0){
        return time;
    }
    if(time<diagramStartTime){
        return time+24*3600;
    }
    return time;
}

const makeDiagramLine = (trips: DiagramTrip[], routeStations: DiagramStation[],direction:number): DiagramLine[] => {
    const diagramLines: DiagramLine[] = [];
    trips.forEach(trip => {

        const diagramLine: DiagramLine = {
            color: trip.trainType.color,
            points: [],
            number: "",
        };
        const stopTimes = trip.stopTimes;
        const stationIndexArray=(new Array(stopTimes.length).fill(0).map((_,_i)=>_i));
        if(direction===1){
            stationIndexArray.reverse();
        }
        for(let i of stationIndexArray){
            const st = stopTimes[i];
            if (st.ariTime >= 0) {
                diagramLine.points.push({
                    x: diagramTime(st.ariTime),
                    y: routeStations[i].stationTime
                });
            }
            if (st.depTime >= 0) {
                diagramLine.points.push({
                    x: diagramTime(st.depTime),
                    y: routeStations[i].stationTime
                });
            }
        }
        diagramLines.push(diagramLine);
    })
    return diagramLines;
}


export function useDiagramViewHook2(stations:StationDto[],trainTypes:TrainTypeDto[],trip:TripWithStopTimesDto[]) {
    const [diaStations, setDiaStations] = useState<DiagramStation[]>([]);
    const [downLines, setDownLines] = useState<DiagramLine[]>([]);
    const [upLines, setUpLines] = useState<DiagramLine[]>([]);


    // const stations = lineData.stations;
    // const trainTypes = lineData.trainType;

    const _downTrips=trip.filter(trip=>trip.direct===0).map(trip=>{
        return {...trip,times:stations.map(station=>{
            const st=trip.stopTimesByStationId[station.id];
            if(st===undefined){
                return{
                    id:-1,
                    tripID:trip.id,
                    stop:-1,
                    depTime:-1,
                    stopType:0,
                    ariTime:-1,
                    stationID:station.id
                }
            }
            return st;
            })}
    });

    const _upTrips=trip.filter(trip=>trip.direct===1).map(trip=>{
        return {...trip,times:stations.map(station=>{
                const st=trip.stopTimesByStationId[station.id];
                if(st===undefined){
                    return{
                        id:-1,
                        tripID:trip.id,
                        stop:-1,
                        depTime:-1,
                        stopType:0,
                        ariTime:-1,
                        stationID:station.id
                    }
                }
                return st;
            })}
    });
    useEffect(() => {
        if(stations.length===0){
            return ;
        }
        const rs: DiagramStation[] = [];
        rs.push({
            stationTime: 0,
            station: stations[0]});
        let nowStationTime = 0;
        for (let i = 1; i < stations.length; i++) {
            let minTime = 24 * 3600;
            //downTripの中で所要時間探索
            for (let j = 0; j < _downTrips.length; j++) {
                const trip = _downTrips[j];
                const stopTimes = trip.times;
                if (hasTime(stopTimes[i]) && hasTime(stopTimes[i - 1])) {
                    let t = diagramTime(getAD(trip.times[i]))- diagramTime(getDA(trip.times[i - 1]));
                    if (trip.times[i].stopType !== 1) {
                        t += 30;
                    }
                    if (trip.times[i - 1].stopType !== 1) {
                        t += 30;
                    }
                    minTime = Math.min(minTime, t);
                }
            }
            //upTripの中で所要時間探索
            for (let j = 0; j < _upTrips.length; j++) {
                const trip =_upTrips[j];
                const stopTimes = trip.times;
                if (hasTime(stopTimes[i]) && hasTime(stopTimes[i - 1])) {

                    let t = diagramTime(getAD(trip.times[i-1])) - diagramTime(getDA(trip.times[i]));
                    if (trip.times[i].stopType !== 1) {
                        t += 30;
                    }
                    if (trip.times[i - 1].stopType !== 1) {
                        t += 30;
                    }
                    minTime = Math.min(minTime, t);
                }
            }
            if (minTime === 24 * 3600) {
                minTime = 90;
            }
            if (minTime < 90) {
                minTime = 90;
            }
            nowStationTime = nowStationTime + minTime;
            rs.push({stationTime: nowStationTime, station: stations[i]});
        }

        setDiaStations(rs);
        const downTrips = _downTrips.map(item => {
            return {
                train: item,
                stopTimes: item.times.map(item => {
                    return {...item, depTime: getDA(item), ariTime: getAD(item)}
                }),
                trainType: trainTypes.find(tt=>tt.id===item.trainTypeID)??trainTypes[1]
            }
        });
        const upTrips = _upTrips.map(item => {
            return {
                train:item,
                stopTimes: item.times.map(item => {
                    return {...item, depTime: getDA(item), ariTime: getAD(item)}
                }),
                trainType: trainTypes.find(tt=>tt.id===item.trainTypeID)??trainTypes[1]
            }
        });

        setDownLines(makeDiagramLine(downTrips, rs,0));
        setUpLines(makeDiagramLine(upTrips, rs,1));

    }, [trip,trainTypes,stations]);
    return {diaStations, downLines, upLines};
}
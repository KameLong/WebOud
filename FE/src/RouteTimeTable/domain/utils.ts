import type {Part} from "./types.ts";
import type { TripWithStopTimesDto} from "../../server/DTO/TripDTO.ts";

export const FONT_SIZE=14;
export const LINE_HEIGHT=FONT_SIZE*1.25;
export const TRAIN_WIDTH=FONT_SIZE*3;
export const STATION_NAME_WIDTH=FONT_SIZE*6;
export const ARR_BORDER_BOTTOM_WIDTH=1;

/** ======================
 * utils
 * ====================== */
export function makeRangeSet(a: number, b: number) {
    const s = new Set<number>();
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    for (let i = lo; i <= hi; i++) s.add(i);
    return s;
}

export function decodeShowStyleDown(showStyle: number): { showArr: boolean; showTrack: boolean; showDep: boolean } {
    const bits = showStyle & 0b111; // 下り（低位3bit）
    return {
        showArr: (bits & 0b001) !== 0,
        showTrack: (bits & 0b010) !== 0,
        showDep: (bits & 0b100) !== 0,
    };
}
// 例：下り側の3bitだけ見る（あなたの実装に合わせて）
export function decodeDownParts(stationShowStyle: number): Part[] {
    const bits = stationShowStyle & 0b111;
    const showArr = (bits & 0b001) !== 0;
    const showTrack = (bits & 0b010) !== 0;
    const showDep = (bits & 0b100) !== 0;

    const parts: Part[] = [];
    if (showArr) parts.push("arr");
    if (showTrack) parts.push("track");
    if (showDep) parts.push("dep");
    return parts;
}

export function cellHeight(style:number){
    const showStyle=decodeShowStyleDown(style);
    let result=0;
    if(showStyle.showArr){
        result+=LINE_HEIGHT;
    }
    if(showStyle.showTrack){
        result+=LINE_HEIGHT;
    }
    if(showStyle.showDep){
        result+=LINE_HEIGHT;
    }
    if(showStyle.showDep&&showStyle.showArr){
        result+=ARR_BORDER_BOTTOM_WIDTH;
    }
    return result;
}

export function createPlaceholderTrip(routeID: number): TripWithStopTimesDto {
    return {
        id: -1,
        routeID,
        trainTypeID: 0,
        no: "",
        name: "",
        direct: 0,
        stopTimesByStationId: {},
    };
}


export function ensureTailPlaceholder(trips: TripWithStopTimesDto[], routeID: number): TripWithStopTimesDto[] {
    const nonPlaceholder = trips.filter(t => t.id !== -1);
    const placeholders   = trips.filter(t => t.id === -1);

    const tail = placeholders.length
        ? placeholders[placeholders.length - 1]
        : null;

    const result = [...nonPlaceholder];
    result.push(tail ?? createPlaceholderTrip(routeID));

    return result;
}


export function timeInt2Str(time:number,showSecond:boolean){
    let t=time;
    const ss=time%60;
    t=t-ss;
    t/=60;
    const mm=t%60;
    t=t-mm;
    t/=60;
    const hh=t%24;
    return `${hh}${mm.toString(10).padStart(2,'0')}`
}

export function timeStr2Int(timeStr:string):number{
    let hh=0;
    let mm=0;
    let ss=0;
    switch(timeStr.length){
        case 0:
            return -1;
        case 4:
            hh=parseInt(timeStr.substring(0,2));
            mm=parseInt(timeStr.substring(2,4));
            break;
        case 3:
            hh=parseInt(timeStr.substring(0,1));
            mm=parseInt(timeStr.substring(1,3));
            break;
        default:
            throw new Error("invalid time");
    }
    const res=hh*3600+mm*60+ss;
    if(res<3*3600){
        return res+24*3600;
    }
    return res;
}

//入力したキーが数値か？
export function isDigitKey(e: React.KeyboardEvent) {
    return e.key.length === 1 && e.key >= "0" && e.key <= "9";
}
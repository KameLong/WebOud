import type { KeyLike, Part } from "./types.ts";
import type { TripWithStopTimesDto } from "./dto.ts";
import type { StopTimeDto } from "./dto.ts";
import type { StationDto } from "./dto.ts";

export const FONT_SIZE = 14;
export const LINE_HEIGHT = FONT_SIZE * 1.25;
export const TRAIN_WIDTH = FONT_SIZE * 3;
export const STATION_NAME_WIDTH = FONT_SIZE * 6;
export const ARR_BORDER_BOTTOM_WIDTH = 1;

/** ======================
 * utils
 * ====================== */
/**
 * aからbまで（両端含む）の整数集合を返します。
 *
 * @param a 範囲の一端（大小どちらでも可）
 * @param b 範囲のもう一端
 */
export function makeRangeSet(a: number, b: number) {
    const s = new Set<number>();
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    for (let i = lo; i <= hi; i++) s.add(i);
    return s;
}

/** 駅のshowStyleは方向ごとに4bitずつ持つ（下位4bitが下り、次の4bitが上り）。各4bit内: 1=着 2=番線 4=発（8は予約） */
export const SHOW_STYLE_BITS = 4;
export const SHOW_STYLE_MASK = 0b1111;
/** 着/番線/発のビット */
export const SHOW_ARR = 0b001;
export const SHOW_TRACK = 0b010;
export const SHOW_DEP = 0b100;

/**
 * 駅のshowStyleから、指定方向の4bitを取り出します。
 *
 * @param showStyle 駅のshowStyle（下位4bitが下り、次の4bitが上り）
 * @param direct 0:下り 1:上り
 */
export function getDirectStyle(showStyle: number, direct: number): number {
    return (showStyle >> (direct === 1 ? SHOW_STYLE_BITS : 0)) & SHOW_STYLE_MASK;
}

/**
 * showStyleの指定方向の4bitだけを差し替えた値を返します。
 *
 * @param showStyle 元のshowStyle
 * @param direct 0:下り 1:上り
 * @param bits 新しい4bit値
 */
export function setDirectStyle(showStyle: number, direct: number, bits: number): number {
    const shift = direct === 1 ? SHOW_STYLE_BITS : 0;
    return (showStyle & ~(SHOW_STYLE_MASK << shift)) | ((bits & SHOW_STYLE_MASK) << shift);
}

/**
 * 下り・上りの4bit値からshowStyleを組み立てます。
 *
 * @param down 下りの4bit値
 * @param up 上りの4bit値
 */
export function makeShowStyle(down: number, up: number): number {
    return setDirectStyle(setDirectStyle(0, 0, down), 1, up);
}

/**
 * 1方向分の表示スタイル（4bit）を着/番線/発の真偽値に展開します。
 *
 * @param bits getDirectStyleで取り出した1方向分の4bit値
 */
export function decodeShowStyle(bits: number): { showArr: boolean; showTrack: boolean; showDep: boolean } {
    return {
        showArr: (bits & SHOW_ARR) !== 0,
        showTrack: (bits & SHOW_TRACK) !== 0,
        showDep: (bits & SHOW_DEP) !== 0,
    };
}

/**
 * 表示スタイルから、表示するパート（着/番線/発）を上から順に返します。
 *
 * @param stationShowStyle 駅のshowStyle（全体）
 * @param direct 0:下り 1:上り
 */
export function decodeParts(stationShowStyle: number, direct: number): Part[] {
    const { showArr, showTrack, showDep } = decodeShowStyle(getDirectStyle(stationShowStyle, direct));

    const parts: Part[] = [];
    if (showArr) parts.push("arr");
    if (showTrack) parts.push("track");
    if (showDep) parts.push("dep");
    return parts;
}

/**
 * 1駅分のセルの高さ(px)を返します。
 *
 * @param style 1方向分の表示スタイル（getDirectStyleで取り出した4bit値）
 */
export function cellHeight(style: number) {
    const showStyle = decodeShowStyle(style);
    let result = 0;
    if (showStyle.showArr) {
        result += LINE_HEIGHT;
    }
    if (showStyle.showTrack) {
        result += LINE_HEIGHT;
    }
    if (showStyle.showDep) {
        result += LINE_HEIGHT;
    }
    if (showStyle.showDep && showStyle.showArr) {
        result += ARR_BORDER_BOTTOM_WIDTH;
    }
    return result;
}

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

/**
 * 0:00からの秒を「hmm」(秒表示時は「hmmss」)形式の文字列にします。
 *
 * @param time 0:00からの経過秒（24時間で折り返す）
 * @param showSecond trueなら秒も付ける
 */
export function timeInt2Str(time: number, showSecond: boolean) {
    let t = time;
    const ss = time % 60;
    t = t - ss;
    t /= 60;
    const mm = t % 60;
    t = t - mm;
    t /= 60;
    const hh = t % 24;
    if (showSecond) {
        return `${hh}${mm.toString(10).padStart(2, "0")}${ss.toString(10).padStart(2, "0")}`;
    }
    return `${hh}${mm.toString(10).padStart(2, "0")}`;
}

/**
 * 「hmm」「hhmm」形式の文字列を0:00からの秒に変換します。3時より前は翌日扱い(+24h)。
 *
 * @param timeStr 時刻文字列。空文字なら未入力として-1を返し、3/4桁以外は例外を投げる
 */
export function timeStr2Int(timeStr: string): number {
    let hh = 0;
    let mm = 0;
    const ss = 0;
    switch (timeStr.length) {
        case 0:
            return -1;
        case 4:
            hh = parseInt(timeStr.substring(0, 2));
            mm = parseInt(timeStr.substring(2, 4));
            break;
        case 3:
            hh = parseInt(timeStr.substring(0, 1));
            mm = parseInt(timeStr.substring(1, 3));
            break;
        default:
            throw new Error("invalid time");
    }
    const res = hh * 3600 + mm * 60 + ss;
    if (res < 3 * 3600) {
        return res + 24 * 3600;
    }
    return res;
}

//入力したキーが数値か？
/**
 * @param e キーイベント
 */
export function isDigitKey(e: KeyLike) {
    return e.key.length === 1 && e.key >= "0" && e.key <= "9";
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

import { O_O } from "@route-builders/oud-operator";
import type { StationDto, StopTimeDto, TrainTypeDto, TripWithStopTimesDto } from "../domain/dto.ts";
import { makeShowStyle, SHOW_ARR, SHOW_DEP } from "../domain/utils.ts";
import type { RouteRecord } from "../store/types.ts";

/** 読み込んだOuDiaファイルの概要（取り込みダイアログの表示用） */
export type OudiaSummary = {
    /** 路線名 */
    routeName: string;
    stationCount: number;
    trainTypeCount: number;
    /** ダイヤ（OuDiaのダイヤ名）ごとの列車数。取り込むダイヤをここから選ぶ */
    diagrams: { name: string; downCount: number; upCount: number }[];
};

/** パースしたOuDiaファイル */
export type ParsedOudia = {
    oud: O_O;
    summary: OudiaSummary;
};

/**
 * OuDiaファイルのバイト列を文字列に直し、行の配列にします。
 * UTF-8として読めればUTF-8、そうでなければShift_JIS（OuDiaの標準）として読みます。
 *
 * @param buffer ファイルの内容
 */
export function decodeOudiaLines(buffer: ArrayBuffer): string[] {
    let text: string;
    try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
        text = new TextDecoder("shift_jis").decode(buffer);
    }
    return text.replace(/^﻿/, "").replace(/\r/g, "").split("\n");
}

/**
 * OuDiaファイルを読み込み、概要とともに返します。
 * 形式が不正な場合は、日本語のメッセージ付きのErrorを投げます。
 *
 * @param buffer OuDiaファイル(.oud)の内容
 */
export function parseOudia(buffer: ArrayBuffer): ParsedOudia {
    let oud: O_O;
    try {
        oud = new O_O().fromOud(decodeOudiaLines(buffer));
    } catch {
        throw new Error("OuDiaファイルとして読み込めませんでした。.oud形式のファイルを選んでください");
    }
    if (oud.stations.length === 0) throw new Error("駅が1つも見つかりませんでした");
    return {
        oud,
        summary: {
            routeName: oud.name || "OuDiaから取り込んだ路線",
            stationCount: oud.stations.length,
            trainTypeCount: oud.trainTypes.length,
            diagrams: oud.diagrams.map((d) => ({ name: d.name, downCount: d.downStreaks.length, upCount: d.upStreaks.length })),
        },
    };
}

/** このアプリの時刻は3:00より前を翌日(+24h)として持つ。OuDiaの0:00〜の時刻を合わせる */
function normalizeTime(seconds: number): number {
    if (seconds < 0) return -1;
    return seconds < 3 * 3600 ? seconds + 24 * 3600 : seconds;
}

/**
 * OuDiaの駅の時刻形式から、下り・上りそれぞれの表示（着/発）を決める
 * - 発時刻のみ(0): 下り・上りとも発
 * - 発着時刻(10): 下り・上りとも着と発
 * - 下り着時刻(20): 下りは着、上りは発
 * - 上り着時刻(30): 下りは発、上りは着
 */
function showStyleFromTimeType(timeType: number): number {
    switch (timeType) {
        case 10:
            return makeShowStyle(SHOW_ARR | SHOW_DEP, SHOW_ARR | SHOW_DEP);
        case 20:
            return makeShowStyle(SHOW_ARR, SHOW_DEP);
        case 30:
            return makeShowStyle(SHOW_DEP, SHOW_ARR);
        default:
            return makeShowStyle(SHOW_DEP, SHOW_DEP);
    }
}

/**
 * OuDiaの駅の扱い(10:停車 20:通過 30:経由なし 40:直通 0:運行なし)を、このアプリの停車種別に変換する。
 * 時刻があるのに「運行なし」になっている場合（番線付きの書式などでライブラリが読み取れないとき）は停車として扱う。
 *
 * @param type OuDiaの駅の扱い
 * @param hasTime 着・発のどちらかに時刻があるか
 */
function stopTypeFromOudia(type: number, hasTime: boolean): number {
    switch (type) {
        case 10:
            return 1;
        case 20:
            return 2;
        case 30:
            return 3;
        default:
            return hasTime ? 1 : 0;
    }
}

/**
 * 読み込んだOuDiaファイルの指定したダイヤを、路線データ(RouteRecord)に変換します。
 * 駅・列車種別・列車（下り・上り）を作り、IDは1から振ります。
 *
 * @param parsed parseOudiaの結果
 * @param diagramIndex 取り込むダイヤの番号（OuDiaのダイヤの並び順。ダイヤが無いファイルでは無視）
 * @param routeName 取り込み後の路線名
 * @param routeId 新しい路線のID（駅・列車などが持つrouteIDになる）
 */
export function oudiaToRouteRecord(parsed: ParsedOudia, diagramIndex: number, routeName: string, routeId: number): RouteRecord {
    const { oud } = parsed;

    const stations: StationDto[] = oud.stations.map((s, i) => ({
        id: i + 1,
        name: s.name,
        routeID: routeId,
        index: i,
        showStyle: showStyleFromTimeType(s.timeType),
    }));

    const trainTypes: TrainTypeDto[] = oud.trainTypes.map((t, i) => ({
        id: i + 1,
        name: t.name,
        routeID: routeId,
        index: i,
        shortName: t.shortname,
        color: t.trainColor.HEX(true),
        fontBold: false,
        lineBold: t.lineWeight >= 2,
        // OuDia: 10=点線 20=破線 → このアプリ: 1=破線 2=点線
        lineStyle: t.lineType === 20 ? 1 : t.lineType === 10 ? 2 : 0,
    }));

    const diagram = oud.diagrams[diagramIndex];
    const trips: TripWithStopTimesDto[] = [];
    let stopTimeId = 1;
    const addStreaks = (streaks: NonNullable<typeof diagram>["downStreaks"], direct: number) => {
        for (const streak of streaks) {
            const tripId = trips.length + 1;
            const stopTimesByStationId: Record<number, StopTimeDto> = {};
            stations.forEach((station, i) => {
                // OuDiaのEkiJikokuは各列車の走行順（上りは駅一覧と逆順）に並んでいるため、
                // 上り列車は駅一覧を逆順にたどって対応する時刻を拾う
                const h = streak.stHandlings[direct === 1 ? stations.length - 1 - i : i];
                if (!h) return;
                const ariTime = normalizeTime(h.arrival.getTime());
                const depTime = normalizeTime(h.departure.getTime());
                const stopType = stopTypeFromOudia(h.type, ariTime >= 0 || depTime >= 0);
                if (stopType === 0) return;
                stopTimesByStationId[station.id] = { id: stopTimeId++, tripID: tripId, stationID: station.id, ariTime, depTime, stopType, stop: 0 };
            });
            trips.push({
                id: tripId,
                routeID: routeId,
                direct,
                // 種別の番号が範囲外のときは先頭の種別にする
                trainTypeID: (trainTypes[streak.typeIdx] ?? trainTypes[0])?.id ?? 0,
                name: streak.name,
                no: streak.operationNum,
                stopTimesByStationId,
            });
        }
    };
    if (diagram) {
        addStreaks(diagram.downStreaks, 0);
        addStreaks(diagram.upStreaks, 1);
    }

    return {
        id: routeId,
        name: routeName,
        updatedAt: Date.now(),
        counters: { station: stations.length + 1, trainType: trainTypes.length + 1, trip: trips.length + 1, stopTime: stopTimeId },
        stations,
        trainTypes,
        trips,
    };
}

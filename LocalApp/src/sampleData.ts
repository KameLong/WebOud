import { createRoute } from "./store/localStore.ts";
import { addStation, addTrainType, addTripBlock } from "./store/timetableApi.ts";
import type { RouteRecord } from "./store/types.ts";
import type { StationDto, StopTimeDto, TripWithStopTimesDto } from "./domain/dto.ts";

// 神戸電鉄粟生線（鈴蘭台～粟生）の駅一覧（営業キロ順）
const STATION_NAMES = [
    "鈴蘭台",
    "鈴蘭台西口",
    "丸山",
    "西鈴蘭台",
    "花山",
    "大村",
    "木幡",
    "栄",
    "三木上の丸",
    "三木",
    "下石野",
    "広野ゴルフ場前",
    "押部谷",
    "志染",
    "恵比須",
    "小野",
    "粟生",
] as const;

// 快速が通過する駅（0始まりのインデックス）：鈴蘭台西口・丸山・木幡・栄・下石野・広野ゴルフ場前・押部谷
const RAPID_PASS_INDICES = new Set([1, 2, 6, 7, 10, 11, 12]);

const ARR_DEP = 0b101; // 着+発（番線なし）

/**
 * 時・分を0:00からの経過秒に変換します。
 *
 * @param hh 時
 * @param mm 分
 */
function hm(hh: number, mm: number) {
    return hh * 3600 + mm * 60;
}

/**
 * 駅配列（走行方向順）を元に、stationIdごとの停車時刻マップを作ります。
 * id/tripIDはプレースホルダ値で、addTripBlock側で採番し直されます。
 */
function buildStopTimes(stationsInTravelOrder: StationDto[], passIndices: Set<number>, startSeconds: number, secondsPerStation: number): Record<number, StopTimeDto> {
    const result: Record<number, StopTimeDto> = {};
    let t = startSeconds;
    stationsInTravelOrder.forEach((st, i) => {
        const isFirst = i === 0;
        const isLast = i === stationsInTravelOrder.length - 1;
        const passing = passIndices.has(i) && !isFirst && !isLast;

        if (passing) {
            result[st.id] = { id: 0, tripID: 0, stationID: st.id, ariTime: -1, depTime: t, stopType: 2, stop: 0 };
        } else {
            result[st.id] = {
                id: 0,
                tripID: 0,
                stationID: st.id,
                ariTime: isFirst ? -1 : t,
                depTime: isLast ? -1 : t,
                stopType: 1,
                stop: 0,
            };
        }
        t += secondsPerStation;
    });
    return result;
}

/**
 * サンプルダイヤ「神戸電鉄粟生線」を作成し、路線一覧に追加します。
 * 駅・列車種別（普通/快速）・下り/上り各4本の時刻表を持つ、すぐに触って試せるダイヤです。
 */
export function createSampleRoute(): RouteRecord {
    const route = createRoute("神戸電鉄粟生線（サンプル）");
    const routeId = route.id;

    const stations = STATION_NAMES.map((name, i) => addStation(routeId, { name, routeID: routeId, index: i, showStyle: ARR_DEP }));
    const stationsUp = [...stations].reverse();

    const local = addTrainType(routeId, {
        name: "普通",
        routeID: routeId,
        index: 0,
        shortName: "普通",
        color: "#1a5fb4",
        fontBold: false,
        lineBold: false,
        lineStyle: 0,
    });
    const rapid = addTrainType(routeId, {
        name: "快速",
        routeID: routeId,
        index: 1,
        shortName: "快速",
        color: "#c01c28",
        fontBold: true,
        lineBold: true,
        lineStyle: 0,
    });

    /**
     * 1本分の列車データを作ります。
     *
     * @param direct 0:下り 1:上り
     * @param trainTypeID 列車種別ID
     * @param no 列車番号
     * @param startSeconds 始発駅の発車時刻（秒）
     * @param secondsPerStation 1駅あたりの所要秒数
     * @param isRapid trueなら快速として通過駅を設定する
     */
    const makeTrip = (direct: number, trainTypeID: number, no: string, startSeconds: number, secondsPerStation: number, isRapid: boolean): TripWithStopTimesDto => {
        const order = direct === 0 ? stations : stationsUp;
        const passIndices = isRapid ? RAPID_PASS_INDICES : new Set<number>();
        return {
            id: 0,
            routeID: routeId,
            direct,
            trainTypeID,
            name: "",
            no,
            stopTimesByStationId: buildStopTimes(order, passIndices, startSeconds, secondsPerStation),
        };
    };

    const trips: TripWithStopTimesDto[] = [
        // 下り（鈴蘭台→粟生）
        makeTrip(0, local.id, "101", hm(6, 0), 120, false),
        makeTrip(0, rapid.id, "203", hm(6, 15), 90, true),
        makeTrip(0, local.id, "103", hm(6, 30), 120, false),
        makeTrip(0, rapid.id, "205", hm(6, 45), 90, true),
        // 上り（粟生→鈴蘭台）
        makeTrip(1, local.id, "102", hm(6, 5), 120, false),
        makeTrip(1, rapid.id, "204", hm(6, 20), 90, true),
        makeTrip(1, local.id, "104", hm(6, 35), 120, false),
        makeTrip(1, rapid.id, "206", hm(6, 50), 90, true),
    ];

    addTripBlock(routeId, trips);

    return route;
}

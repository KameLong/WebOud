import type { StationDto, TripWithStopTimesDto } from "./dto.ts";
import { odKey, type OdTable } from "./od.ts";

/**
 * 乗客を各列車に割り当てる計算（理想的な条件での乗客の動き）。
 *
 * ・乗客は、乗客が駅に来る時間帯のあいだ、毎分0秒に、駅間の利用客数（1時間あたり）の1/60の人数（小数も扱う）が、発駅に着く。
 * ・乗客は、次の条件で、着駅までの経路（列車と乗り換え駅の並び）を選ぶ（優先度の高い順）。
 *     1. 着駅への到着時刻が最も早い経路
 *     2. 到着時刻が同じなら、乗り換え回数が少ない経路
 *     3. 乗り換え回数も同じなら、列車に乗っている時間の合計が最も長い経路
 *     4. それでも同じ列車の並びがあるときは、今乗っている列車に乗り続ける（乗り換えを遅くする）経路
 *   （それでも決まらないときは、列車の並び順が前のものを選ぶ）
 * ・乗り換えは、同じ駅の中だけで、到着と同時刻の出発にも乗れる（乗り換えにかかる時間は0とする）。
 */

/** 計算の入力 */
export type AnalysisInput = {
    /** 路線の全駅（順不同） */
    stations: StationDto[];
    /** 路線の全列車（両方向） */
    trips: TripWithStopTimesDto[];
    /** 駅間の利用客数（1時間あたりの人数） */
    od: OdTable;
    /** 乗客が駅に来る時間帯（0:00からの秒。開始以上・終了未満の毎分0秒に乗客が着く） */
    arrivalStart: number;
    arrivalEnd: number;
};

/** 1本の列車の、乗客の割り当て結果 */
export type TripLoad = {
    trip: TripWithStopTimesDto;
    /** 停車駅（走行順）のID */
    stationIds: number[];
    /** 各停車駅の到着・出発時刻（0:00からの秒） */
    times: { arr: number; dep: number }[];
    /** 各区間（停車駅i→i+1）を走るときの乗車人数。長さは 停車駅数-1 */
    onboard: number[];
    /** 各停車駅での乗車人数・降車人数 */
    boardings: number[];
    alightings: number[];
};

/** 計算の結果 */
export type AnalysisResult = {
    /** 全列車の割り当て結果（2駅以上に停車する列車のみ） */
    trips: TripLoad[];
    /** 駅に着いた乗客の合計 */
    generated: number;
    /** どこかの列車で、着駅まで行けた乗客の合計 */
    assigned: number;
    /** 着駅まで行ける列車が無かった乗客の合計 */
    unreachable: number;
};

type StopInfo = { stationIdx: number; arr: number; dep: number };

/** 乗っている列車の状態（その列車に乗っていて、まだ降りていない） */
type Aboard = {
    kind: "A";
    transfers: number;
    /** これまでに乗った時間の合計から、今の列車に乗った時刻を引いた値（今の時刻を足すと、乗っている時間の合計になる） */
    rideBase: number;
    trip: number;
    boardPos: number;
    /** 乗る前にいた駅の状態（最初の乗車なら、出発の駅の状態） */
    from: AtStation;
};

/** 駅にいる状態（列車を降りて着いた、または乗客が駅に着いた） */
type AtStation = {
    kind: "S";
    /** 乗り換え回数（出発の駅にいる状態は-1） */
    transfers: number;
    /** 列車に乗っていた時間の合計 */
    ride: number;
    via: Aboard | null;
    alightPos: number;
    time: number;
};

type Event = { time: number; type: 0 | 1; trip: number; pos: number; stationIdx: number };

/**
 * 状態を、列車の並びと、降りた停車位置の並びにします（同じ条件のときの優劣を決めるため）。
 *
 * @param l 状態
 */
function describe(l: Aboard | AtStation): { trips: number[]; alights: number[] } {
    if (l.kind === "S") {
        if (!l.via) return { trips: [], alights: [] };
        const d = describe(l.via);
        d.alights.push(l.alightPos);
        return d;
    }
    const d = describe(l.from);
    d.trips.push(l.trip);
    return d;
}

/**
 * 2つの状態の優劣を決めます（負なら a が良い）。同じ時刻に同じ場所にいる状態どうしを比べます。
 * 乗り換え回数が少ない方、乗っている時間が長い方、同じ列車の並びなら降りる位置が後の方（乗り続ける方）、
 * それでも決まらなければ、列車の並び順が前の方を選びます。
 *
 * @param a 状態
 * @param b 状態
 */
function compare(a: Aboard | AtStation, b: Aboard | AtStation): number {
    if (a.transfers !== b.transfers) return a.transfers - b.transfers;
    const ra = a.kind === "A" ? a.rideBase : a.ride;
    const rb = b.kind === "A" ? b.rideBase : b.ride;
    if (ra !== rb) return rb - ra;
    const da = describe(a);
    const db = describe(b);
    const same = da.trips.length === db.trips.length && da.trips.every((t, i) => t === db.trips[i]);
    if (same) {
        for (let i = 0; i < da.alights.length; i++) if (da.alights[i] !== db.alights[i]) return db.alights[i] - da.alights[i];
        return 0;
    }
    for (let i = 0; i < Math.min(da.trips.length, db.trips.length); i++) if (da.trips[i] !== db.trips[i]) return da.trips[i] - db.trips[i];
    return da.trips.length - db.trips.length;
}

/**
 * 列車ごとの、停車駅と到着・出発時刻を求めます。停車駅は、走行順（下りは駅の並び順、上りは逆順）に並べた、停車種別が「停車」の駅です。
 * 時刻は、到着か出発の片方しか無ければ同じ値を使い、前の時刻より戻らないように整えます。時刻の無い駅は飛ばします。
 *
 * @param trips 列車
 * @param stations 路線の全駅
 * @returns 列車ごとの停車駅（2駅未満の列車は含めない）
 */
function buildTripStops(trips: TripWithStopTimesDto[], stations: StationDto[]): { trip: TripWithStopTimesDto; stops: StopInfo[] }[] {
    const down = [...stations].sort((a, b) => a.index - b.index);
    const up = [...down].reverse();
    const indexOf = new Map(stations.map((s, i) => [s.id, i]));
    const out: { trip: TripWithStopTimesDto; stops: StopInfo[] }[] = [];
    for (const trip of trips) {
        if (trip.id === -1) continue;
        const stops: StopInfo[] = [];
        let last = -Infinity;
        for (const st of trip.direct === 1 ? up : down) {
            const s = trip.stopTimesByStationId[st.id];
            if (s?.stopType !== 1) continue;
            const arrRaw = s.ariTime >= 0 ? s.ariTime : s.depTime;
            const depRaw = s.depTime >= 0 ? s.depTime : s.ariTime;
            if (arrRaw < 0 || depRaw < 0) continue;
            const arr = Math.max(arrRaw, last);
            const dep = Math.max(depRaw, arr);
            stops.push({ stationIdx: indexOf.get(st.id)!, arr, dep });
            last = dep;
        }
        if (stops.length >= 2) out.push({ trip, stops });
    }
    return out;
}

/** 次の描画に処理を譲る（計算の途中でも、画面が固まらないようにする） */
function yieldToUi(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * 乗客を各列車に割り当てます。発駅ごとに計算を区切り、そのたびに画面へ処理を譲って、進み具合を知らせます。
 *
 * @param input 駅・列車・駅間の利用客数・乗客が駅に来る時間帯
 * @param onProgress 進み具合を受け取る関数（done:済んだ発駅の数 / total:計算する発駅の数）
 */
export async function analyzePassengers(input: AnalysisInput, onProgress?: (done: number, total: number) => void): Promise<AnalysisResult> {
    const { stations, od } = input;
    const infos = buildTripStops(input.trips, stations);
    const loads: TripLoad[] = infos.map(({ trip, stops }) => ({
        trip,
        stationIds: stops.map((s) => stations[s.stationIdx].id),
        times: stops.map((s) => ({ arr: s.arr, dep: s.dep })),
        onboard: stops.slice(1).map(() => 0),
        boardings: stops.map(() => 0),
        alightings: stops.map(() => 0),
    }));

    // 到着・出発の出来事を、時刻順に並べる（同じ時刻では、到着を先に：乗り換え時間0）
    const events: Event[] = [];
    infos.forEach(({ stops }, k) => {
        stops.forEach((s, p) => {
            if (p > 0) events.push({ time: s.arr, type: 0, trip: k, pos: p, stationIdx: s.stationIdx });
            if (p < stops.length - 1) events.push({ time: s.dep, type: 1, trip: k, pos: p, stationIdx: s.stationIdx });
        });
    });
    events.sort((a, b) => a.time - b.time || a.type - b.type || a.trip - b.trip || a.pos - b.pos);

    /**
     * 指定の時刻以降の、最初の出来事の位置を返す。
     *
     * @param time 時刻（秒）
     */
    const firstEventAt = (time: number) => {
        let lo = 0;
        let hi = events.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (events[mid].time < time) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    };

    const n = stations.length;
    const K = infos.length;
    const origins = stations.map((_, i) => i).filter((i) => stations.some((to, j) => i !== j && (od[odKey(stations[i].id, to.id)] ?? 0) > 0));
    const result: AnalysisResult = { trips: loads, generated: 0, assigned: 0, unreachable: 0 };

    for (let oi = 0; oi < origins.length; oi++) {
        const o = origins[oi];
        // この発駅から、利用客数が入っている着駅
        const weights = new Array<number>(n).fill(0);
        let destCount = 0;
        for (let j = 0; j < n; j++) {
            const v = j === o ? 0 : (od[odKey(stations[o].id, stations[j].id)] ?? 0);
            if (v > 0) {
                weights[j] = v / 60;
                destCount++;
            }
        }

        for (let t = input.arrivalStart; t < input.arrivalEnd; t += 60) {
            const origin: AtStation = { kind: "S", transfers: -1, ride: 0, via: null, alightPos: -1, time: t };
            const aboard: (Aboard | null)[] = new Array(K).fill(null);
            const atStation: (AtStation | null)[] = new Array(n).fill(null);
            atStation[o] = origin;
            const best: (AtStation | null)[] = new Array(n).fill(null);
            let pending = destCount;
            let stopAfter = Infinity;

            for (let e = firstEventAt(t); e < events.length; e++) {
                const ev = events[e];
                if (ev.time > stopAfter) break;
                if (ev.type === 0) {
                    // 到着：乗っている状態から、ここで降りた状態を作る
                    const a = aboard[ev.trip];
                    if (!a) continue;
                    const s: AtStation = { kind: "S", transfers: a.transfers, ride: a.rideBase + ev.time, via: a, alightPos: ev.pos, time: ev.time };
                    const cur = atStation[ev.stationIdx];
                    if (!cur || compare(s, cur) < 0) atStation[ev.stationIdx] = s;
                    if (weights[ev.stationIdx] > 0) {
                        const b = best[ev.stationIdx];
                        if (!b) {
                            best[ev.stationIdx] = s;
                            pending--;
                            if (pending === 0) stopAfter = Math.max(...best.map((x) => (x ? x.time : -Infinity)));
                        } else if (s.time === b.time && compare(s, b) < 0) best[ev.stationIdx] = s;
                    }
                } else {
                    // 出発：駅にいる状態から、この列車に乗った状態を作り、今乗っている状態と比べる
                    const from = atStation[ev.stationIdx];
                    if (!from) continue;
                    const boarded: Aboard = { kind: "A", transfers: from.transfers + 1, rideBase: from.ride - ev.time, trip: ev.trip, boardPos: ev.pos, from };
                    const cur = aboard[ev.trip];
                    if (!cur || compare(boarded, cur) < 0) aboard[ev.trip] = boarded;
                }
            }

            // 着駅ごとに、選んだ経路の列車へ、乗客を割り当てる
            for (let j = 0; j < n; j++) {
                const w = weights[j];
                if (w <= 0) continue;
                result.generated += w;
                const final = best[j];
                if (!final) {
                    result.unreachable += w;
                    continue;
                }
                result.assigned += w;
                let cur: AtStation | null = final;
                while (cur && cur.via) {
                    const a: Aboard = cur.via;
                    const load = loads[a.trip];
                    load.boardings[a.boardPos] += w;
                    load.alightings[cur.alightPos] += w;
                    for (let p = a.boardPos; p < cur.alightPos; p++) load.onboard[p] += w;
                    cur = a.from;
                }
            }
        }
        onProgress?.(oi + 1, origins.length);
        await yieldToUi();
    }
    return result;
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StopTimeDto } from "../../server/DTO/StopTimeDTO";
import type {Cursor, KeyLike} from "../domain/types";
import { getLastTimeFormStopTimes, isDigitKey, makeStopTimeList } from "../domain/utils";
import type {TripWithStopTimesDto} from "../../server/DTO/TripDTO.ts";
import type {StationDto} from "../../server/DTO/StationDTO.ts";

// 必要最低限のナビ型（あなたのhookが返してるものに合わせて拡張してOK）
type NavLike = {
    cursor: Cursor;
    moveVertical: (delta: 1|-1) => void;
    setCursor?: (fn: (cur: Cursor) => Cursor) => void;
};


type ChangeStopTimeFn = (st: StopTimeDto) => Promise<void> | void;

type Options = {
    stations: StationDto[];
    trips: TripWithStopTimesDto[];
    nav: NavLike;
    changeStopTime: ChangeStopTimeFn;
};

type State = {
    enabled: boolean;
    buf: string;
    lastTime: number; // seconds, -1 if unknown
};


/**
 * 連続入力（Alt+T）をhook化：
 * - enabled中に数字キーで buf を貯める
 * - buf が 2桁になったら確定
 *   - lastTime === -1 の場合：bufをhh扱いして lastTime を hh*3600 に更新して終了（保存しない）
 *   - lastTime !== -1 の場合：bufをmm扱いして時補完→ StopTime更新 → moveVertical(1)
 * - Escape：bufクリアして enabled=false
 * - Backspace：buf末尾削除
 *
 * 既存仕様（stopType補正など）を維持
 */
export function useContinuousTimeInput(opts: Options) {
    const { stations, trips, nav, changeStopTime } = opts;

    const [enabled, setEnabled] = useState(false);
    const [buf, setBuf] = useState("");
    const [lastTime, setLastTime] = useState<number>(-1);

    // 「今のカーソル位置の lastTime」を追従（enabled中でも更新はする：現行のあなたの挙動に合わせる）
    useEffect(() => {
        const c = nav.cursor.c;
        const r = nav.cursor.r;
        const trip = trips[c];
        const station = stations[r];
        if (!trip || !station) return;

        const list = makeStopTimeList(trip, stations);
        const lt = getLastTimeFormStopTimes(list, r);
        setLastTime(lt);
        setBuf("");
    }, [nav.cursor, trips, stations]);

    const reset = useCallback((disableAlso: boolean) => {
        setBuf("");
        if (disableAlso) setEnabled(false);
    }, []);

    const toggle = useCallback(() => {
        setEnabled((v) => {
            const next = !v;
            if (!next) {
                // OFFにする時はバッファは消してOK（あなたはAlt+TでON/OFF時にbufリセットしてた）
                setBuf("");
                setLastTime(-1);
            } else {
                // ONにした瞬間の lastTime は effect が追従するが、
                // 直後の入力で参照されるので cursor基準で即反映しておく
                const c = nav.cursor.c;
                const r = nav.cursor.r;
                const trip = trips[c];
                const station = stations[r];
                if (trip && station) {
                    const list = makeStopTimeList(trip, stations);
                    const lt = getLastTimeFormStopTimes(list, r);
                    setLastTime(lt);
                } else {
                    setLastTime(-1);
                }
                setBuf("");
            }
            return next;
        });
    }, [nav, trips, stations]);

    // 「bufが2桁になったら確定」ロジックを1か所に集約
    const commitIfReady = useCallback(
        async (nextBuf: string) => {
            if (nextBuf.length !== 2) return false;

            const r = nav.cursor.r;
            const c = nav.cursor.c;
            const st = stations[r];
            const tr = trips[c];
            if (!st || !tr) {
                setBuf("");
                return true;
            }

            const s = nextBuf; // "00".."59" or "00".."25" (special hh mode)
            setBuf(""); // 確定したのでバッファは空に

            // special：lastTimeがまだ無い→ hhとして採用して lastTime を作る（保存しない）
            if (lastTime === -1) {
                const hh = Number(s);
                if (Number.isNaN(hh) || hh < 0 || hh > 25) {
                    // 不正なら無視（あなたの実装に合わせて console.log などは呼ばない）
                    return true;
                }
                setLastTime(hh * 3600);
                return true;
            }

            // 通常：mmとして扱う
            const mm = Number(s);
            if (Number.isNaN(mm) || mm < 0 || mm > 59) {
                return true;
            }

            const part = nav.cursor.part;
            const current: StopTimeDto =
                (tr.stopTimesByStationId?.[st.id] as StopTimeDto | undefined) ?? {
                    id: 0,
                    tripID: tr.id,
                    stationID: st.id,
                    ariTime: -1,
                    depTime: -1,
                    stop: 0,
                    stopType: 0,
                };

            const nextStopTime: StopTimeDto = { ...current };

            let lastHH = Math.floor(lastTime / 3600) % 24;
            if (mm * 60 < (lastTime % 3600)) {
                lastHH++;
            }
            const seconds = lastHH * 3600 + mm * 60;

            if (part === "arr") nextStopTime.ariTime = seconds;
            if (part === "dep") nextStopTime.depTime = seconds;

            // stopType の自動補正（現行仕様）
            if (nextStopTime.stopType === 0 || nextStopTime.stopType === 3) {
                if (nextStopTime.ariTime >= 0 || nextStopTime.depTime >= 0) {
                    nextStopTime.stopType = 1;
                }
            }

            await changeStopTime(nextStopTime);

            // 次へ
            nav.moveVertical(1);

            return true;
        },
        [stations, trips, nav, changeStopTime, lastTime]
    );

    const onKeyDown = useCallback(
        async (e: KeyLike) => {
            // Alt+T トグル（あなたの仕様）
            if (
                e.altKey &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.shiftKey &&
                (e.key === "t" || e.key === "T")
            ) {
                e.preventDefault?.();
                toggle();
                return true;
            }

            if (!enabled) return false;

            // enabled中：Escape
            if (e.key === "Escape") {
                e.preventDefault?.();
                reset(true);
                return true;
            }

            // enabled中：Backspace
            if (e.key === "Backspace") {
                e.preventDefault?.();
                setBuf((prev) => prev.slice(0, -1));
                return true;
            }

            // enabled中：数字
            if (isDigitKey(e)) {
                e.preventDefault?.();
                const digit = e.key;

                // 次のbufをローカルで作る（競合しにくい）
                let committed = false;
                setBuf((prev) => {
                    const nb = (prev + digit).slice(0, 2); // 仕様上2桁で確定なので2桁以上はいらない
                    // commitは setState の外でやりたいが、nb を得るためにここで構築
                    // → ただし副作用は避けたいので "予約" だけして、直後に実行する
                    queueMicrotask(async () => {
                        // commitIfReady は buf=2桁のときだけ動く
                        // ここでnbを渡して確定
                        const ok = await commitIfReady(nb);
                        committed = ok;
                    });
                    return nb;
                });

                return true;
            }

            return false;
        },
        [enabled, toggle, reset, commitIfReady]
    );

    const state: State = useMemo(
        () => ({
            enabled,
            buf,
            lastTime,
        }),
        [enabled, buf, lastTime]
    );

    return {
        state,              // { enabled, buf, lastTime }
        setEnabled,         // 必要なら外からON/OFF
        reset,              // bufクリア
        toggle,             // Alt+T と同じ
        onKeyDown,          // RouteTimetablePage から呼ぶ
    };
}

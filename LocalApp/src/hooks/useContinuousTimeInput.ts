import { useCallback, useEffect, useMemo, useState } from "react";
import type { StopTimeDto } from "../domain/dto.ts";
import type { Cursor, KeyLike } from "../domain/types.ts";
import { getLastTimeFormStopTimes, isDigitKey, makeStopTimeList } from "../domain/utils.ts";
import type { TripWithStopTimesDto } from "../domain/dto.ts";
import type { StationDto } from "../domain/dto.ts";

type NavLike = {
    cursor: Cursor;
    moveVertical: (delta: 1 | -1) => void;
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
 * 連続入力（Alt+T）：
 * - enabled中に数字キーで buf を貯める
 * - buf が 2桁になったら確定
 *   - lastTime === -1 の場合：bufをhh扱いして lastTime を更新して終了（保存しない）
 *   - lastTime !== -1 の場合：bufをmm扱いして時補完→ StopTime更新 → moveVertical(1)
 * - Escape：bufクリアして enabled=false
 * - Backspace：buf末尾削除
 *
 * @param opts stations:駅一覧 / trips:列車一覧 / nav:カーソル操作 / changeStopTime:確定した時刻の保存関数
 */
export function useContinuousTimeInput(opts: Options) {
    const { stations, trips, nav, changeStopTime } = opts;

    const [enabled, setEnabled] = useState(false);
    const [buf, setBuf] = useState("");
    const [lastTime, setLastTime] = useState<number>(-1);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nav.cursor, trips, stations]);

    /**
     * 入力途中のバッファを消します。
     *
     * @param disableAlso trueなら連続入力モード自体も終了する
     */
    const reset = useCallback((disableAlso: boolean) => {
        setBuf("");
        if (disableAlso) setEnabled(false);
    }, []);

    const toggle = useCallback(() => {
        setEnabled((v) => {
            const next = !v;
            if (!next) {
                setBuf("");
                setLastTime(-1);
            } else {
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

    const commitIfReady = useCallback(
        /**
         * 2桁入力されていれば時刻として確定します。
         *
         * @param nextBuf 入力済みの数字文字列。2桁のときだけ処理する
         */
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

            const s = nextBuf;
            setBuf("");

            if (lastTime === -1) {
                const hh = Number(s);
                if (Number.isNaN(hh) || hh < 0 || hh > 25) {
                    return true;
                }
                setLastTime(hh * 3600);
                return true;
            }

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
            if (mm * 60 < lastTime % 3600) {
                lastHH++;
            }
            const seconds = lastHH * 3600 + mm * 60;

            if (part === "arr") nextStopTime.ariTime = seconds;
            if (part === "dep") nextStopTime.depTime = seconds;

            if (nextStopTime.stopType === 0 || nextStopTime.stopType === 3) {
                if (nextStopTime.ariTime >= 0 || nextStopTime.depTime >= 0) {
                    nextStopTime.stopType = 1;
                }
            }

            await changeStopTime(nextStopTime);

            nav.moveVertical(1);

            return true;
        },
        [stations, trips, nav, changeStopTime, lastTime]
    );

    const onKeyDown = useCallback(
        /**
         * 連続入力用のキー処理。処理した場合はtrueを返します。
         *
         * @param e キーイベント（Alt+Tで切替、数字/Backspace/Escapeを処理）
         */
        async (e: KeyLike) => {
            if (e.altKey && (e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault?.();
                toggle();
                return true;
            }

            if (!enabled) return false;

            if (e.key === "Escape") {
                e.preventDefault?.();
                reset(true);
                return true;
            }

            if (e.key === "Backspace") {
                e.preventDefault?.();
                setBuf((prev) => prev.slice(0, -1));
                return true;
            }

            if (isDigitKey(e)) {
                e.preventDefault?.();
                const digit = e.key;

                setBuf((prev) => {
                    const nb = (prev + digit).slice(0, 2);
                    queueMicrotask(() => {
                        void commitIfReady(nb);
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
        state,
        setEnabled,
        reset,
        toggle,
        onKeyDown,
    };
}

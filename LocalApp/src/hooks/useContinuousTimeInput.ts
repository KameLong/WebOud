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
    /** 直近の確定が不正だった場合の警告文。次の確定操作や入力で消える */
    warning: string | null;
};

/**
 * 連続入力（Alt+T）：
 * - enabled中に数字キーで buf を貯める
 * - buf が 2桁になったら確定
 *   - lastTime === -1 の場合：bufをhh扱いして lastTime を更新して終了（保存しない）
 *   - lastTime !== -1 の場合：bufをmm扱いして時補完→ StopTime更新 → moveVertical(1)
 *   - 不正な値（hh:0〜25、mm:0〜59の範囲外）は確定せず、警告を出してbufを残す
 * - Escape：bufクリアして enabled=false
 * - Backspace：buf末尾削除
 * - commitPending：Enterやカーソル移動の直前に呼び、1桁だけ入力されていれば0埋めして確定を試みる
 *
 * @param opts stations:駅一覧 / trips:列車一覧 / nav:カーソル操作 / changeStopTime:確定した時刻の保存関数
 */
export function useContinuousTimeInput(opts: Options) {
    const { stations, trips, nav, changeStopTime } = opts;

    const [enabled, setEnabled] = useState(false);
    const [buf, setBuf] = useState("");
    const [lastTime, setLastTime] = useState<number>(-1);
    const [warning, setWarning] = useState<string | null>(null);

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
        setWarning(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nav.cursor, trips, stations]);

    /**
     * 入力途中のバッファと警告を消します。
     *
     * @param disableAlso trueなら連続入力モード自体も終了する
     */
    const reset = useCallback((disableAlso: boolean) => {
        setBuf("");
        setWarning(null);
        if (disableAlso) setEnabled(false);
    }, []);

    const toggle = useCallback(() => {
        setEnabled((v) => {
            const next = !v;
            if (!next) {
                setBuf("");
                setLastTime(-1);
                setWarning(null);
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

    /**
     * 2桁の文字列を時刻として確定を試みます。不正な場合はbufを残したまま警告を出してfalseを返します。
     *
     * @param s 2桁の数字文字列
     */
    const commit2 = useCallback(
        async (s: string): Promise<boolean> => {
            const r = nav.cursor.r;
            const c = nav.cursor.c;
            const st = stations[r];
            const tr = trips[c];
            if (!st || !tr) {
                setBuf("");
                return true;
            }

            if (lastTime === -1) {
                const hh = Number(s);
                if (Number.isNaN(hh) || hh < 0 || hh > 25) {
                    setWarning(`「${s}」は時刻として入力できません（0〜25で入力してください）`);
                    return false;
                }
                setWarning(null);
                setBuf("");
                setLastTime(hh * 3600);
                return true;
            }

            const mm = Number(s);
            if (Number.isNaN(mm) || mm < 0 || mm > 59) {
                setWarning(`「${s}」は分として入力できません（0〜59で入力してください）`);
                return false;
            }
            setWarning(null);
            setBuf("");

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

    /**
     * 2桁たまったら確定します（入力中の自動確定用）。
     *
     * @param nextBuf 入力済みの数字文字列。2桁のときだけ処理する
     */
    const commitIfReady = useCallback(
        async (nextBuf: string) => {
            if (nextBuf.length !== 2) return false;
            await commit2(nextBuf);
            return true;
        },
        [commit2]
    );

    /**
     * Enterやカーソル移動の直前に呼び、入力途中のバッファを確定させます。
     * 1桁だけ入力されていれば0埋めして確定を試みます。何も入力されていなければ何もせずtrueを返します。
     * 不正な値だった場合は警告を出し、bufを残したままfalseを返します（呼び出し側は後続の操作を中断してください）。
     */
    const commitPending = useCallback(async (): Promise<boolean> => {
        if (buf.length === 0) return true;
        const padded = buf.length === 1 ? buf.padStart(2, "0") : buf;
        return commit2(padded);
    }, [buf, commit2]);

    const onKeyDown = useCallback(
        /**
         * 連続入力用のキー処理。処理した場合はtrueを返します。
         *
         * @param e キーイベント（Alt+Tで切替、数字/Backspace/Escapeを処理）
         */
        async (e: KeyLike) => {
            // macOSはAlt(Option)併用時にkeyが特殊文字に化ける(例: Alt+T→†)ため、e.codeで判定する
            if (e.altKey && e.code === "KeyT" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
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
                setWarning(null);
                setBuf((prev) => prev.slice(0, -1));
                return true;
            }

            if (isDigitKey(e)) {
                e.preventDefault?.();
                const digit = e.key;
                setWarning(null);

                // setBuf の更新関数（第2引数の関数形）はReactの仕様上、StrictModeなどで
                // 複数回呼ばれることがあるため、中で確定処理(副作用)を行ってはいけない。
                // ここでは次のbufの値を直接計算してsetBuf・確定処理を1回だけ行う。
                const nb = (buf + digit).slice(0, 2);
                setBuf(nb);
                if (nb.length === 2) {
                    void commitIfReady(nb);
                }

                return true;
            }

            return false;
        },
        [enabled, toggle, reset, buf, commitIfReady]
    );

    const state: State = useMemo(
        () => ({
            enabled,
            buf,
            lastTime,
            warning,
        }),
        [enabled, buf, lastTime, warning]
    );

    return {
        state,
        setEnabled,
        reset,
        toggle,
        onKeyDown,
        commitPending,
    };
}

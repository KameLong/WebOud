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

/** 時刻文字列（hmm / hhmm / h:mm / hh:mm）の時・分を取り出す。形式や範囲が不正ならnull */
function parseTimeStr(timeStr: string): { hh: number; mm: number } | null {
    const m = /^(\d{1,2}):?(\d{2})$/.exec(timeStr);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh > 23 || mm > 59) return null;
    return { hh, mm };
}

/**
 * 時刻文字列として入力できる形式かを返します。空文字は「未入力」として有効扱いです。
 *
 * @param timeStr 検証する文字列（hmm / hhmm / h:mm / hh:mm。時は0〜23、分は0〜59）
 */
export function isValidTimeStr(timeStr: string): boolean {
    return timeStr === "" || parseTimeStr(timeStr) !== null;
}

/**
 * 時刻文字列を0:00からの秒に変換します。3時より前は翌日扱い(+24h)。
 *
 * @param timeStr 時刻文字列（hmm / hhmm / h:mm / hh:mm）。空文字なら未入力として-1、形式が不正なら0(0:00)を返す
 */
export function timeStr2Int(timeStr: string): number {
    if (timeStr === "") return -1;
    const t = parseTimeStr(timeStr);
    if (!t) return 0;
    const res = t.hh * 3600 + t.mm * 60;
    if (res < 3 * 3600) {
        return res + 24 * 3600;
    }
    return res;
}

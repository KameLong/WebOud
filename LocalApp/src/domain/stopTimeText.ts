import type { StopTimeDto } from "./dto.ts";
import { timeInt2Str } from "./utils.ts";

/**
 * 発時刻欄に表示する文字列を返します。
 *
 * @param stopTime 停車時刻（未登録ならundefined）
 * @param showArr 着の行を表示しているか（非表示なら着時刻で代用しない）
 * @param _showDep 未使用
 * @param showPass 通過駅の時刻を表示するか
 */
export function depTimeStr(stopTime: StopTimeDto, showArr: boolean, _showDep: boolean, showPass: boolean): string {
    if (!stopTime) {
        return "‥";
    }
    if (stopTime.stopType == 0) {
        return "‥";
    }
    if (stopTime.stopType == 3) {
        return "║";
    }
    if (stopTime.stopType == 2 && !showPass) {
        return "⇂";
    }

    let useTime = stopTime.depTime;
    if (useTime < 0 && !showArr) {
        useTime = stopTime.ariTime;
    }
    if (useTime < 0) {
        return "〇";
    }
    return timeInt2Str(useTime, false);
}

/**
 * 着時刻欄に表示する文字列を返します。
 *
 * @param stopTime 停車時刻（未登録ならundefined）
 * @param _showArr 未使用
 * @param showDep 発の行を表示しているか（非表示なら発時刻で代用する）
 * @param showPass 通過駅の時刻を表示するか
 */
export function ariTimeStr(stopTime: StopTimeDto, _showArr: boolean, showDep: boolean, showPass: boolean): string {
    if (!stopTime) {
        return "‥";
    }

    if (stopTime.stopType === 0) {
        return "‥";
    }
    if (stopTime.stopType === 3) {
        return "║";
    }
    if (stopTime.stopType === 2 && !showPass) {
        return "⇂";
    }

    let useTime = stopTime.ariTime;
    if (useTime < 0 && !showDep) {
        useTime = stopTime.depTime;
    }
    if (useTime < 0) {
        return "〇";
    }
    return timeInt2Str(useTime, false);
}

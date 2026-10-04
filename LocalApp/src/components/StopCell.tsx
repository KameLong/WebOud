import type { Cursor, Part } from "../domain/types.ts";
import type { StationDto, StopTimeDto } from "../domain/dto.ts";
import { ARR_BORDER_BOTTOM_WIDTH, cellHeight, decodeShowStyle, LINE_HEIGHT, timeInt2Str } from "../domain/utils.ts";

/**
 * 発時刻欄に表示する文字列を返します。
 *
 * @param stopTime 停車時刻（未登録ならundefined）
 * @param showArr 着の行を表示しているか（非表示なら着時刻で代用しない）
 * @param _showDep 未使用
 * @param showPass 通過駅の時刻を表示するか
 */
function depTimeStr(stopTime: StopTimeDto, showArr: boolean, _showDep: boolean, showPass: boolean): string {
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
function ariTimeStr(stopTime: StopTimeDto, _showArr: boolean, showDep: boolean, showPass: boolean): string {
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

/**
 * 連続入力モード中の入力途中表示を作ります。
 *
 * @param buf 入力済みの数字
 * @param lastTime 直前の確定時刻（秒）。-1なら時から入力する
 */
function contStr(buf: string, lastTime: number): string {
    if (lastTime < 0) {
        return buf.padEnd(4, "-");
    }
    const hh = Math.floor(lastTime / 3600) % 24;
    return hh + buf.padEnd(2, "-");
}
/**
 * 1駅×1列車分のセル（着/番線/発）を描画します。
 *
 * @param props r:駅の行 / c:列車の列 / cursor:現在のカーソル / station:駅 / stopTime:停車時刻 / cont:連続入力の状態
 */
export function StopCell(props: {
    r: number;
    c: number;
    cursor: Cursor;
    station: StationDto;
    stopTime: StopTimeDto;
    cont: { buf: string; lastTime: number; enabled: boolean };
}) {
    const { r, c, cursor, station, stopTime, cont } = props;
    const ROW_H = cellHeight(station.showStyle);
    const inThisCell = cursor.r === r && cursor.c === c;
    /**
     * このセルの指定パートにカーソルがあるかを返します。
     *
     * @param part arr/track/dep
     */
    const isPartSelected = (part: Part) => inThisCell && cursor.part === part;

    /**
     * 1パート分のスタイルを返します。
     *
     * @param selected カーソルがあるか
     */
    const partStyle = (selected: boolean): React.CSSProperties => ({
        lineHeight: LINE_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxSizing: "border-box",
        outline: selected ? "1px dashed #333" : "1px solid transparent",
        backgroundColor: selected && cont.enabled ? "#eef8ff" : "white",
        outlineOffset: -1,
    });
    const s = decodeShowStyle(station.showStyle);
    const showArrBottomBorder = s.showArr && s.showDep;
    return (
        <div
            style={{
                height: ROW_H,
                display: "flex",
                flexDirection: "column",
                background: "white",
                userSelect: "none",
                boxSizing: "border-box",
                fontFamily: "DiaPro",
            }}
        >
            {s.showArr && (
                <div
                    data-r={r}
                    data-c={c}
                    data-part="arr"
                    style={{ ...partStyle(isPartSelected("arr")), ...(showArrBottomBorder ? { borderBottom: `${ARR_BORDER_BOTTOM_WIDTH}px solid black` } : {}) }}
                >
                    {ariTimeStr(stopTime, s.showArr, s.showDep, false)}
                </div>
            )}
            {s.showTrack && (
                <div data-r={r} data-c={c} data-part="track" style={{ ...partStyle(isPartSelected("track")) }}>
                    {""}
                </div>
            )}

            {s.showDep && (
                <div data-r={r} data-c={c} data-part="dep" style={{ ...partStyle(isPartSelected("dep")) }}>
                    {isPartSelected("dep") && cont.enabled ? contStr(cont.buf, cont.lastTime) : depTimeStr(stopTime, s.showArr, s.showDep, false)}
                </div>
            )}
        </div>
    );
}

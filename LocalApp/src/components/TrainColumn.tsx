import React from "react";
import type { Cursor } from "../domain/types.ts";
import { TrainHeader } from "./TrainHeader.tsx";
import { TRAIN_WIDTH } from "../domain/utils.ts";
import { StopCell } from "./StopCell.tsx";
import type { StationDto, TripWithStopTimesDto, TrainTypeDto } from "../domain/dto.ts";

export const TrainColumn = React.memo(
    /**
     * 1列車分の縦の列（見出し＋各駅のセル）を描画します。
     *
     * @param props trip:列車 / stations:表示順の駅 / trainType:種別 / cursor:カーソル / c:列番号 / isSelected,invert:選択表示 / HEADER_H,zHeader:見出しの高さとz-index / onOpenTripProperty:見出しダブルクリック時 / cont:連続入力の状態 / direct:0:下り 1:上り
     */
    function TrainColumn(props: {
        trip: TripWithStopTimesDto;
        stations: StationDto[];
        trainType: TrainTypeDto;
        cursor: Cursor;
        c: number;
        isSelected: boolean;
        invert: boolean;
        HEADER_H: number;
        zHeader: number;
        onOpenTripProperty: (tripId: number) => void;
        cont: { buf: string; lastTime: number; enabled: boolean };
        direct: number;
    }) {
        const { trip, c, stations, cursor, isSelected, invert, HEADER_H, zHeader, trainType, cont, direct } = props;

        return (
            <div
                style={{
                    width: TRAIN_WIDTH,
                    borderRight: "1px solid #333",
                    borderBottom: "2px solid #333",
                    borderTop: "2px solid #333",
                    color: trainType.color,
                    filter: invert ? "invert(100%)" : "",
                }}
            >
                <TrainHeader
                    t={trip}
                    HEADER_H={HEADER_H}
                    zHeader={zHeader}
                    onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        props.onOpenTripProperty?.(props.trip.id);
                    }}
                    traintype={trainType}
                />

                {stations.map((st, r) => {
                    void isSelected;

                    return <StopCell cont={cont} direct={direct} key={st.id} r={r} c={c} cursor={cursor} stopTime={trip.stopTimesByStationId[st.id]} station={st} />;
                })}
            </div>
        );
    },
    // 戻り値がtrueなら再描画をスキップする。
    // カーソルがこの列に出入りするとき（連続入力の途中表示もこの列だけ）は必ず再描画し、
    // それ以外は、列の見た目に影響するpropsが変わったときだけ再描画する。
    // onOpenTripPropertyは呼び出し側で毎回作り直されるが、中身は変わらないので比較しない。
    (prev, next) => {
        const c = next.c;
        const cursorAffects = prev.cursor.c === c || next.cursor.c === c;
        if (cursorAffects) return false;

        return (
            prev.c === next.c &&
            prev.trip === next.trip &&
            prev.stations === next.stations &&
            prev.trainType === next.trainType &&
            prev.isSelected === next.isSelected &&
            prev.invert === next.invert &&
            prev.HEADER_H === next.HEADER_H &&
            prev.zHeader === next.zHeader &&
            prev.direct === next.direct
        );
    },
);

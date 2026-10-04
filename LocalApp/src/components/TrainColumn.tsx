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
     * @param props trip:列車 / stations:表示順の駅 / trainType:種別 / cursor:カーソル / c:列番号 / isSelected,invert:選択表示 / HEADER_H,zHeader:見出しの高さとz-index / onOpenTripProperty:見出しダブルクリック時 / cont:連続入力の状態
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
    }) {
        const { trip, c, stations, cursor, isSelected, invert, HEADER_H, zHeader, trainType, cont } = props;

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

                    return <StopCell cont={cont} key={st.id} r={r} c={c} cursor={cursor} stopTime={trip.stopTimesByStationId[st.id]} station={st} />;
                })}
            </div>
        );
    },
    (prev, next) => {
        const c = prev.c;
        const cursorAffects = prev.cursor.c === c || next.cursor.c === c;
        const selectionAffects = prev.isSelected !== next.isSelected || prev.invert !== next.invert;
        return !(cursorAffects || selectionAffects);
    }
);

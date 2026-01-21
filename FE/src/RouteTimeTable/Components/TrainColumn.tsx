import type {Cursor} from "../domain/types.ts";
import {TrainHeader} from "./TrainHeader.tsx";
import { TRAIN_WIDTH} from "../domain/utils.ts";
import {StopCell} from "./StopCell.tsx";
import type {StationDto} from "../../server/DTO/StationDTO.ts";
import type {TripWithStopTimesDto} from "../../server/DTO/TripDTO.ts";
import type {TrainTypeDto} from "../../server/DTO/TrainTypeDTO.ts";
import React from "react";

export const TrainColumn = React.memo(
    function TrainColumn(props: {
        trip: TripWithStopTimesDto;
        stations: StationDto[];
        trainType:TrainTypeDto;
        cursor: Cursor;
        c: number;
        isSelected: boolean;
        invert: boolean;
        HEADER_H: number;
        zHeader: number;
        continuousInput:boolean;
        onOpenTripProperty:(tripId: number)=>void
        cont: { buf: string, lastTime: number }
    }) {
        const { trip, c, stations, cursor, isSelected, invert, HEADER_H,   zHeader,trainType,continuousInput,cont } = props;
        // console.log(trip);

        return (
            <div style={{
                width: TRAIN_WIDTH,
                borderRight: "1px solid #333",
                borderBottom: "2px solid #333",
                borderTop: "2px solid #333",
                color:trainType.color,
                filter:invert?"invert(100%)":"",

            }}>
                    <TrainHeader t={trip} HEADER_H={HEADER_H} zHeader={zHeader}
                                 onDoubleClick={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     props.onOpenTripProperty?.(props.trip.id); // 列車ID渡す
                                 }}
                                 traintype={trainType}
                                 />

                {stations.map((st, r) => {
                    // invert は列選択の反転表示（複数列選択時）
                    // isSelected は単列選択時の扱いを将来差別化したい場合に使える（今は未使用）
                    void isSelected;

                    return <StopCell
                        cont={cont}
                        key={st.id}
                        r={r}
                        c={c}
                        continuousInput={continuousInput}
                        cursor={cursor}
                        stopTime={trip.stopTimesByStationId[st.id]}
                        station={st}
                    />;
                })}
            </div>
        );
    },
    (prev, next) => {
        // この列が影響を受ける場合だけ再描画
        const c = prev.c;
        const cursorAffects = prev.cursor.c === c || next.cursor.c === c;
        const selectionAffects = prev.isSelected !== next.isSelected || prev.invert !== next.invert;
        return !(cursorAffects || selectionAffects);
    }
);

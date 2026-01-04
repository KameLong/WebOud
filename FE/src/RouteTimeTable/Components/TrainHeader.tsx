import {LINE_HEIGHT} from "../domain/utils.ts";
import type {TripDto} from "../../server/DTO/TripDTO.ts";
import type {TrainTypeDto} from "../../server/DTO/TrainTypeDTO.ts";

export function TrainHeader(props: {
    t: TripDto;
    traintype:TrainTypeDto;
    invert: boolean;
    HEADER_H: number;
    zHeader: number;
    onDoubleClick?:  React.MouseEventHandler<HTMLDivElement>;
}) {
    const { t, invert, HEADER_H,  zHeader,traintype } = props;
    return (
        <div
            onDoubleClick={props.onDoubleClick}
            style={{
                position: "sticky",
                top: 0,
                zIndex: zHeader,
                height: HEADER_H,
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                borderBottom: "2px solid #333",
                backgroundColor: "white",

            }}
        >
            <div style={{ height: LINE_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center",borderBottom:'1px solid black'}}>
                {traintype.shortName}
            </div>
            <div style={{ height: LINE_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {t.no || "\u00A0"}
            </div>
            <div
            style={{borderBottom: "2px solid #333", }}>

            </div>
            <div style={{ height: LINE_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {t.name}
            </div>
        </div>
    );
}

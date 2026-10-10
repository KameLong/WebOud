import { LINE_HEIGHT } from "../domain/utils.ts";
import type { TripDto, TrainTypeDto } from "../domain/dto.ts";

/**
 * 列車の見出し（種別略称・番号・列車名）を描画します。
 *
 * @param props t:列車 / traintype:種別 / HEADER_H:高さ / zHeader:z-index / onDoubleClick:ダブルクリック時の処理
 */
export function TrainHeader(props: {
    t: TripDto;
    traintype: TrainTypeDto;
    HEADER_H: number;
    zHeader: number;
    onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
    const { t, HEADER_H, zHeader, traintype } = props;
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
            <div style={{ height: LINE_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {traintype.shortName}
            </div>
            <div style={{borderBottom:"1px solid #333"}}></div>
            <div style={{ height: LINE_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.no || " "}</div>
            <div style={{ borderBottom: "2px solid #333" }}></div>
            <div style={{ height: LINE_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.name}</div>
        </div>
    );
}

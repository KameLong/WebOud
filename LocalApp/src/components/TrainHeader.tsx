import type { GridMetrics } from "../domain/utils.ts";
import type { TripDto, TrainTypeDto } from "../domain/dto.ts";

/**
 * 列車の見出し（種別略称・番号・列車名）を描画します。種別略称は縦書き・横方向中央寄せで表示し、
 * 文字数が多いときは自動で2列に折り返します（3列目以降は収まらない分を切り詰める）。
 *
 * @param props t:列車 / traintype:種別 / HEADER_H:高さ / zHeader:z-index / onDoubleClick:ダブルクリック時の処理 / metrics:文字サイズから決まる寸法一式
 */
export function TrainHeader(props: {
    t: TripDto;
    traintype: TrainTypeDto;
    HEADER_H: number;
    zHeader: number;
    onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
    metrics: GridMetrics;
}) {
    const { t, HEADER_H, zHeader, traintype, metrics } = props;
    const { FONT_SIZE, LINE_HEIGHT } = metrics;
    // 種別名欄の高さ（縦書きで4文字×2列まで収まる分）。HEADER_Hの余白内に収まるサイズにしてある
    const SHORT_NAME_ROW_H = FONT_SIZE * 4 + 8;
    // 縦書きの1文字分の実質幅（行間込み）
    const VERTICAL_CHAR_W = Math.ceil(FONT_SIZE * 1.2);
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
            <div style={{ height: SHORT_NAME_ROW_H, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {traintype.shortName && (
                    <span
                        style={{
                            writingMode: "vertical-rl",
                            textOrientation: "mixed",
                            display: "inline-block",
                            height: SHORT_NAME_ROW_H - 6,
                            maxWidth: VERTICAL_CHAR_W * 2,
                            lineHeight: 1.2,
                            overflow: "hidden",
                            wordBreak: "break-all",
                        }}
                    >
                        {traintype.shortName}
                    </span>
                )}
            </div>
            <div style={{borderBottom:"1px solid #333"}}></div>
            <div style={{ height: LINE_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.no || " "}</div>
            <div style={{ borderBottom: "2px solid #333" }}></div>
            <div style={{ height: LINE_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.name}</div>
        </div>
    );
}

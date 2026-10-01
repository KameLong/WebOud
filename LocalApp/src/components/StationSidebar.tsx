import { Fragment } from "react";
import type { StationDto } from "../domain/dto.ts";
import { cellHeight, decodeShowStyleDown, LINE_HEIGHT, STATION_NAME_WIDTH } from "../domain/utils.ts";
import { FitTextX } from "./FitText.tsx";

type Part = "arr" | "track" | "dep";

const LABEL_WIDTH = LINE_HEIGHT;

export function StationSidebar(props: { stations: StationDto[]; HEADER_H: number; zLeft: number; zCorner: number; onStationClick?: (station: StationDto) => void }) {
    const { stations, HEADER_H, zLeft, zCorner, onStationClick } = props;

    function buildPartsForStation(st: StationDto): Array<{ key: Part; label: string }> {
        const s = decodeShowStyleDown(st.showStyle);
        const parts: Array<{ key: Part; label: string }> = [];
        if (s.showArr) parts.push({ key: "arr", label: "着" });
        if (s.showTrack) parts.push({ key: "track", label: "番線" });
        if (s.showDep) parts.push({ key: "dep", label: "発" });

        if (parts.length === 0) parts.push({ key: "dep", label: "発" });

        return parts;
    }

    function withSeparatorsForStation(st: StationDto): boolean {
        const s = decodeShowStyleDown(st.showStyle);
        return s.showTrack;
    }

    return (
        <div
            style={{
                position: "sticky",
                left: 0,
                flexShrink: 0,
                zIndex: zLeft,
                borderRight: "2px solid #333",
                borderTop: "2px solid #333",
                borderLeft: "2px solid #333",
                borderBottom: "2px solid #333",
                marginBottom: "10px",
            }}
        >
            <div
                style={{
                    top: 0,
                    left: 0,
                    zIndex: zCorner,
                    position: "sticky",
                    width: STATION_NAME_WIDTH + LABEL_WIDTH,
                    minWidth: STATION_NAME_WIDTH + LABEL_WIDTH,
                    maxWidth: STATION_NAME_WIDTH + LABEL_WIDTH,
                    height: HEADER_H,
                    boxSizing: "border-box",
                    background: "#fafafa",
                    borderBottom: "2px solid #333",
                    display: "flex",
                }}
            >
                <div style={{ width: STATION_NAME_WIDTH + LABEL_WIDTH - 4 }}>
                    <FitTextX text={"列車種別"} />
                    <div
                        style={{
                            width: STATION_NAME_WIDTH + LABEL_WIDTH,
                            borderBottom: "1px solid #333",
                        }}
                    >
                        {" "}
                    </div>
                    <FitTextX text={"列車番号"} />
                    <div
                        style={{
                            width: STATION_NAME_WIDTH + LABEL_WIDTH,
                            borderBottom: "2px solid #333",
                        }}
                    >
                        {" "}
                    </div>
                    <FitTextX text={""} />
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
                {stations.map((st) => {
                    const parts = buildPartsForStation(st);
                    const withSep = withSeparatorsForStation(st);
                    const sepH = 1;
                    const ROW_H = cellHeight(st.showStyle);
                    const sepCount = withSep ? Math.max(0, parts.length - 1) : 0;
                    const contentH = Math.max(0, ROW_H - sepCount * sepH);
                    const unitH = parts.length > 0 ? Math.floor(contentH / parts.length) : ROW_H;
                    const lastH = parts.length > 0 ? contentH - unitH * (parts.length - 1) : ROW_H;

                    return (
                        <div
                            key={st.id}
                            style={{
                                display: "flex",
                                width: STATION_NAME_WIDTH + LABEL_WIDTH,
                                height: ROW_H,
                                background: "#fff",
                                boxSizing: "border-box",
                            }}
                        >
                            <div
                                onClick={onStationClick ? () => onStationClick(st) : undefined}
                                title={onStationClick ? `${st.name}の時刻順に列車を並び替え` : undefined}
                                style={{
                                    flex: "1 1 auto",
                                    minWidth: 0,
                                    cursor: onStationClick ? "pointer" : undefined,
                                }}
                                onMouseEnter={(e) => {
                                    if (onStationClick) e.currentTarget.style.background = "#eef6ff";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "";
                                }}
                            >
                                <FitTextX text={st.name} />
                            </div>

                            <div
                                style={{
                                    width: LABEL_WIDTH,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    justifyContent: "flex-start",
                                    boxSizing: "border-box",
                                }}
                            >
                                {parts.map((p, i) => {
                                    const h = i === parts.length - 1 ? lastH : unitH;

                                    return (
                                        <Fragment key={p.key}>
                                            <div
                                                style={{
                                                    height: h,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "#333",
                                                    userSelect: "none",
                                                    boxSizing: "border-box",
                                                }}
                                            >
                                                {p.label}
                                            </div>

                                            {withSep && i !== parts.length - 1 && <div style={{ height: sepH, background: "#ddd" }} />}
                                        </Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

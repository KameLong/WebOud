import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Container, NativeSelect } from "@mantine/core";
import { collectDestinations, collectTrainTypes, isPlainBadge, useStationTimetable, type StationTimetableHour } from "./useStationTimetable.ts";
import { readableTextColor } from "../../domain/colors.ts";
import { labelStation } from "./stationLabel.ts";
import { usePdfExport } from "../../shared/pdf/usePdfExport.ts";
import { downloadBytes, loadPdfFonts, subsetFontInBrowser } from "../../shared/pdf/pdfFonts.ts";
import { HelpDialog, HelpList, HelpSection } from "../../shared/ui/HelpDialog.tsx";
import { helpButtonStyle } from "../../shared/ui/helpButtonStyle.ts";
import type { TrainTypeDto } from "../../domain/dto.ts";
import { useT } from "./messages.ts";
import { useCommonT } from "../../shared/i18n/common.ts";

/** 見出し帯・外枠の色 */
const BRAND_COLOR = "#0a72be";
/** 時刻列（時の数字セル）の色 */
const HOUR_CELL_COLOR = "#06406e";
/** 偶数行の背景（縞模様） */
const STRIPE_COLOR = "#e4e4e4";

/**
 * 時刻（分）の見た目。線を太くする種別は種別色で塗りつぶした印、それ以外は色付き文字のみで表す。
 *
 * @param trainType 列車種別
 * @param plain 文字のみで表すか（isPlainBadge）
 * @param children 中身（分の数字）
 */
function TimeBadge({ trainType, plain, children }: { trainType: TrainTypeDto; plain: boolean; children: ReactNode }) {
    return (
        <span
            style={{
                display: "inline-block",
                minWidth: 25,
                padding: "1px 3px",
                textAlign: "center",
                borderRadius: 1,
                lineHeight: 1.3,
                fontWeight: trainType.fontBold || !plain ? 700 : 600,
                background: plain ? "transparent" : trainType.color,
                color: plain ? trainType.color : readableTextColor(trainType.color),
            }}
        >
            {children}
        </span>
    );
}

/**
 * 1時間分の行（時刻の数字＋分の一覧）を描画します。
 *
 * @param hour 時間帯の時（0〜23。深夜0〜2時台は23時の次の行として扱う）
 * @param entries この時間に発車（終着のみの列車は着）する列車の一覧
 * @param striped 背景を灰色にするか
 */
function HourRow({ hour, entries, striped }: StationTimetableHour & { striped: boolean }) {
    const { t } = useT();
    return (
        <div className="tt-row" style={{ display: "flex", alignItems: "stretch", minHeight: 40, background: striped ? STRIPE_COLOR : "#fff" }}>
            <div
                className="tt-hour"
                style={{
                    flex: "0 0 48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: HOUR_CELL_COLOR,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 20,
                    borderBottom: "2px solid #fff",
                }}
            >
                {hour}
            </div>
            <div className="tt-cells" style={{ flex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 6px", padding: "4px 10px", fontSize: 18 }}>
                {entries.map((e) => {
                    const mm = Math.floor((e.time % 3600) / 60)
                        .toString()
                        .padStart(2, "0");
                    const marker = e.isOrigin && e.isTerminus ? "●▽" : e.isOrigin ? "●" : e.isTerminus ? "▽" : "";
                    const title =
                        [e.trainType.name, e.trip.no, e.trip.name, e.destName && t("tipDest", { name: e.destName })].filter(Boolean).join(" ") +
                        (e.isOrigin ? t("tipOrigin") : "") +
                        (e.isTerminus ? t("tipTerminus") : "") +
                        (e.isArrivalOnly ? t("tipArrival") : "");
                    // 始発・終着の印と行き先は、時刻と同じ色（種別の色）で、時刻の右端に重ねて表示する
                    return (
                        <span key={e.trip.id} title={title || undefined} style={{ position: "relative", display: "inline-flex", paddingRight: 8, whiteSpace: "nowrap" }}>
                            <TimeBadge trainType={e.trainType} plain={isPlainBadge(e.trainType)}>
                                {mm}
                            </TimeBadge>
                            <span style={{ position: "absolute", left: "calc(100% - 8px)", top: 0, color: e.trainType.color }}>
                                {marker && <span style={{ position: "absolute", top: 1, left: -3, fontSize: 10, lineHeight: 1 }}>{marker}</span>}
                                {e.destChar && <span style={{ position: "absolute", top: 13, left: -4, fontSize: 12, lineHeight: 1 }}>{e.destChar}</span>}
                            </span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

/** 凡例の1行（見出し＋横並びの項目） */
function LegendRow({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ flex: "0 0 36px", fontWeight: 700, fontSize: 12, borderBottom: `2px solid ${BRAND_COLOR}` }}>{title}</div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 14px", fontSize: 12 }}>{children}</div>
        </div>
    );
}

/**
 * 種別（印の見本＋種別名）と行き先の凡例を、項目を横に並べてコンパクトに表示します。
 *
 * @param trainTypes 表示する種別一覧
 * @param destinations 行き先の印と駅名の一覧（印が空のものは、印を付けない行き先で「無印」と表示する）
 */
function TimetableLegend({ trainTypes, destinations }: { trainTypes: TrainTypeDto[]; destinations: { char: string; name: string }[] }) {
    const { t } = useT();
    if (trainTypes.length === 0) return null;
    return (
        <div className="tt-legend" style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 10px", borderTop: `2px solid ${BRAND_COLOR}`, background: "#fff" }}>
            <LegendRow title={t("legendTypes")}>
                {[...trainTypes].reverse().map((ty) => (
                    <span key={ty.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <TimeBadge trainType={ty} plain={isPlainBadge(ty)}>
                            00
                        </TimeBadge>
                        {ty.name || t("unnamed")}
                    </span>
                ))}
            </LegendRow>
            {destinations.length > 0 && (
                <LegendRow title={t("legendDest")}>
                    {destinations.map((d) => (
                        <span key={d.name}>
                            {d.char ? (
                                <>
                                    <b>{d.char}</b>
                                    {t("destMarkedTail", { name: d.name })}
                                </>
                            ) : (
                                t("destUnmarked", { name: d.name })
                            )}
                        </span>
                    ))}
                </LegendRow>
            )}
            <LegendRow title={t("legendMarks")}>
                <span>{t("markOrigin")}</span>
                <span>{t("markTerminusShort")}</span>
            </LegendRow>
        </div>
    );
}

/**
 * 1方向分の発車時刻表（見出し帯＋時間帯ごとの表）。列車が無ければその旨を表示します。
 *
 * @param stationName 駅名
 * @param towards 方面の駅名（その方向の終点側の駅）
 * @param hours 時間帯ごとの行
 */
function DirectionTable({
    stationName,
    towards,
    hours,
    exporting,
    onExportPdf,
}: {
    stationName: string;
    towards: string;
    hours: StationTimetableHour[];
    /** PDFを作成中か */
    exporting: boolean;
    onExportPdf: () => void;
}) {
    const { t } = useT();
    const hasAnyTrain = hours.some((h) => h.entries.length > 0);
    const stationLabel = labelStation(stationName, t("stationSuffix"));
    return (
        <div className="tt-sheet" style={{ marginBottom: 24, border: `3px solid ${BRAND_COLOR}`, background: "#fff" }}>
            <div className="tt-head" style={{ background: BRAND_COLOR, color: "#fff", display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 16px", padding: "8px 14px" }}>
                <span style={{ fontSize: 22, fontWeight: 700 }}>
                    {t("headFrom", { station: stationLabel, towards })}
                </span>
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                        type="button"
                        onClick={onExportPdf}
                        disabled={exporting}
                        style={{ cursor: exporting ? "default" : "pointer", padding: "2px 10px", fontSize: 13, borderRadius: 4, border: "1px solid #fff", background: "transparent", color: "#fff", opacity: exporting ? 0.6 : 1 }}
                        title={t("pdfButtonTitle")}
                    >
                        {exporting ? t("pdfBusy") : t("pdfButton")}
                    </button>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{t("headRight")}</span>
                </span>
            </div>
            {!hasAnyTrain ? (
                <div style={{ padding: 16, color: "#666", fontSize: 14 }}>{t("noTrains")}</div>
            ) : (
                <div className="tt-rows">
                    {hours.map((h, i) => (
                        <HourRow key={h.hour} hour={h.hour} entries={h.entries} striped={i % 2 === 0} />
                    ))}
                </div>
            )}
            <TimetableLegend trainTypes={collectTrainTypes([hours])} destinations={collectDestinations([hours])} />
        </div>
    );
}

/**
 * 駅時刻表：1駅を基準に、その駅に停車する列車の発車時刻を時間帯ごとに一覧表示します（AOdiaのStationTimeTableに相当、表示専用）。
 * 見た目は鉄道会社の駅掲示の発車時刻表（見出し帯・時の列・種別ごとの色付きの印）を参考にしています。
 */
export function StationTimetablePage() {
    const params = useParams<{ routeId: string; stationId: string }>();
    const routeId = Number(params.routeId ?? 0);
    const stationId = Number(params.stationId ?? 0);
    const nav = useNavigate();
    const { t, tl } = useT();
    const cm = useCommonT().t;
    const [helpOpen, setHelpOpen] = useState(false);
    /** PDFを作成中の方向は pdf.busyKey（"down" / "up"）で分かる */
    const pdf = usePdfExport();

    const { station, stations, down, up } = useStationTimetable(routeId, stationId);
    // 下りは駅リストの末尾側、上りは先頭側が方面
    const downTowards = stations[stations.length - 1]?.name ?? "";
    const upTowards = stations[0]?.name ?? "";

    /**
     * 指定した方向の時刻表をPDFにして保存します（ブラウザの印刷機能は使わず、フォントを埋め込んだPDFファイルを直接作る）。
     *
     * @param direction down:下り / up:上り
     */
    function exportPdf(direction: "down" | "up") {
        if (!station) return;
        return pdf.run(async () => {
            // PDFライブラリは大きいので、PDF出力を押したときに初めて読み込む
            const { buildStationTimetablePdf } = await import("./stationTimetablePdf.ts");
            const fonts = await loadPdfFonts();
            const bytes = await buildStationTimetablePdf(
                { stationName: station.name, towards: direction === "down" ? downTowards : upTowards, hours: direction === "down" ? down : up },
                fonts,
                subsetFontInBrowser,
            );
            downloadBytes(bytes, t("pdfFileName", { station: station.name, direction: cm(direction === "down" ? "down" : "up") }));
        }, direction);
    }

    if (!station) {
        return (
            <Container size="md" py="md">
                {t("stationNotFound")}
                <Button variant="default" size="compact-sm" ml="xs" onClick={() => nav(`/route/${routeId}`)}>
                    {t("backToEdit")}
                </Button>
            </Container>
        );
    }

    return (
        <Container size="md" py="md" style={{ height: "100%", overflow: "auto" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <Button variant="default" size="compact-sm" onClick={() => nav(`/route/${routeId}`)}>
                    {t("backToEditArrow")}
                </Button>
                <NativeSelect
                    value={String(stationId)}
                    onChange={(e) => nav(`/route/${routeId}/station/${e.currentTarget.value}`, { replace: true })}
                    data={stations.map((s) => ({ value: String(s.id), label: s.name }))}
                    aria-label={t("selectStation")}
                    style={{ flex: 1, maxWidth: 240 }}
                />
                <Button variant="light" size="compact-sm" onClick={() => setHelpOpen(true)} style={{ ...helpButtonStyle, marginLeft: "auto" }} title={t("help")}>
                    ？
                </Button>
            </div>

            {pdf.error && (
                <Alert color="red" mb="sm" title={t("pdfFailedTitle")}>
                    {pdf.error}
                </Alert>
            )}
            <DirectionTable stationName={station.name} towards={downTowards} hours={down} exporting={pdf.busyKey === "down"} onExportPdf={() => void exportPdf("down")} />
            <DirectionTable stationName={station.name} towards={upTowards} hours={up} exporting={pdf.busyKey === "up"} onExportPdf={() => void exportPdf("up")} />

            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title={t("helpTitle")}>
                <HelpSection title={t("helpDoSection")}>
                    <HelpList items={tl("helpDoItems")} />
                </HelpSection>
                <HelpSection title={t("helpLegendSection")}>
                    <HelpList items={tl("helpLegendItems")} />
                </HelpSection>
            </HelpDialog>
        </Container>
    );
}

export default StationTimetablePage;

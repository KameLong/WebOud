import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Container, NativeSelect } from "@mantine/core";
import { collectDestinations, collectTrainTypes, isPlainBadge, useStationTimetable, type StationTimetableHour } from "./useStationTimetable.ts";
import { readableTextColor } from "../../domain/colors.ts";
import { usePdfExport } from "../../shared/pdf/usePdfExport.ts";
import { downloadBytes, loadPdfFonts, subsetFontInBrowser } from "../../shared/pdf/pdfFonts.ts";
import { HelpDialog, HelpList, HelpSection } from "../../shared/ui/HelpDialog.tsx";
import { helpButtonStyle } from "../../shared/ui/helpButtonStyle.ts";
import type { TrainTypeDto } from "../../domain/dto.ts";

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
                    const label = e.isArrivalOnly ? `(${mm})` : mm;
                    const marker = e.isOrigin && e.isTerminus ? "●▽" : e.isOrigin ? "●" : e.isTerminus ? "▽" : "";
                    const title =
                        [e.trainType.name, e.trip.no, e.trip.name, e.destName && `${e.destName}行き`].filter(Boolean).join(" ") +
                        (e.isOrigin ? "（この駅が始発）" : "") +
                        (e.isTerminus ? "（この駅が終着）" : "");
                    // 始発・終着の印と行き先は、時刻と同じ色（種別の色）で、時刻の右端に重ねて表示する
                    return (
                        <span key={e.trip.id} title={title || undefined} style={{ position: "relative", display: "inline-flex", paddingRight: 8, whiteSpace: "nowrap" }}>
                            <TimeBadge trainType={e.trainType} plain={isPlainBadge(e.trainType)}>
                                {label}
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
 * @param destinations 行き先の頭文字と駅名の一覧
 */
function TimetableLegend({ trainTypes, destinations }: { trainTypes: TrainTypeDto[]; destinations: { char: string; name: string }[] }) {
    if (trainTypes.length === 0) return null;
    return (
        <div className="tt-legend" style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 10px", borderTop: `2px solid ${BRAND_COLOR}`, background: "#fff" }}>
            <LegendRow title="種別">
                {[...trainTypes].reverse().map((t) => (
                    <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <TimeBadge trainType={t} plain={isPlainBadge(t)}>
                            00
                        </TimeBadge>
                        {t.name || "（名称未設定）"}
                    </span>
                ))}
            </LegendRow>
            {destinations.length > 0 && (
                <LegendRow title="行先">
                    {destinations.map((d) => (
                        <span key={d.name}>
                            <b>{d.char}</b>印 {d.name}ゆき
                        </span>
                    ))}
                </LegendRow>
            )}
            <LegendRow title="記号">
                <span>● この駅が始発</span>
                <span>▽ この駅が終着</span>
                <span>(00) 終着のため到着時刻を表示</span>
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
    const hasAnyTrain = hours.some((h) => h.entries.length > 0);
    const stationLabel = stationName.endsWith("駅") ? stationName : `${stationName}駅`;
    return (
        <div className="tt-sheet" style={{ marginBottom: 24, border: `3px solid ${BRAND_COLOR}`, background: "#fff" }}>
            <div className="tt-head" style={{ background: BRAND_COLOR, color: "#fff", display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 16px", padding: "8px 14px" }}>
                <span style={{ fontSize: 22, fontWeight: 700 }}>
                    {stationLabel}発 ➡ {towards}方面
                </span>
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                        type="button"
                        onClick={onExportPdf}
                        disabled={exporting}
                        style={{ cursor: exporting ? "default" : "pointer", padding: "2px 10px", fontSize: 13, borderRadius: 4, border: "1px solid #fff", background: "transparent", color: "#fff", opacity: exporting ? 0.6 : 1 }}
                        title="この方向の時刻表を、A4縦1枚のPDFファイルとして保存します"
                    >
                        {exporting ? "作成中…" : "PDF出力"}
                    </button>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>発車時刻表</span>
                </span>
            </div>
            {!hasAnyTrain ? (
                <div style={{ padding: 16, color: "#666", fontSize: 14 }}>この駅に停車する列車はありません</div>
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
            downloadBytes(bytes, `駅時刻表_${station.name}_${direction === "down" ? "下り" : "上り"}.pdf`);
        }, direction);
    }

    if (!station) {
        return (
            <Container size="md" py="md">
                駅が見つかりません。
                <Button variant="default" size="compact-sm" ml="xs" onClick={() => nav(`/route/${routeId}`)}>
                    路線編集へ戻る
                </Button>
            </Container>
        );
    }

    return (
        <Container size="md" py="md" style={{ height: "100%", overflow: "auto" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <Button variant="default" size="compact-sm" onClick={() => nav(`/route/${routeId}`)}>
                    ← 路線編集へ
                </Button>
                <NativeSelect
                    value={String(stationId)}
                    onChange={(e) => nav(`/route/${routeId}/station/${e.currentTarget.value}`, { replace: true })}
                    data={stations.map((s) => ({ value: String(s.id), label: s.name }))}
                    aria-label="駅を選択"
                    style={{ flex: 1, maxWidth: 240 }}
                />
                <Button variant="light" size="compact-sm" onClick={() => setHelpOpen(true)} style={{ ...helpButtonStyle, marginLeft: "auto" }} title="ヘルプ">
                    ？
                </Button>
            </div>

            {pdf.error && (
                <Alert color="red" mb="sm" title="PDFを作成できませんでした">
                    {pdf.error}
                </Alert>
            )}
            <DirectionTable stationName={station.name} towards={downTowards} hours={down} exporting={pdf.busyKey === "down"} onExportPdf={() => void exportPdf("down")} />
            <DirectionTable stationName={station.name} towards={upTowards} hours={up} exporting={pdf.busyKey === "up"} onExportPdf={() => void exportPdf("up")} />

            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title="駅時刻表 - ヘルプ">
                <HelpSection title="このページでできること">
                    <HelpList
                        items={[
                            "選択した駅に停車する列車の発車時刻を、方向（下り/上り）ごと・時間帯ごとに一覧表示する（表示専用、編集はできません）",
                            "時間帯は午前3時始まり・翌午前2時終わりで固定表示（0〜2時台は23時の次に表示）",
                            "各表の見出し帯の「PDF出力」で、その方向の時刻表をA4縦1枚のPDFファイルとして保存できる（ブラウザの印刷機能を使わないので、端末による崩れがない。初回だけ日本語フォントを読み込むため通信が必要）",
                            "上部のプルダウンで別の駅へすぐに切り替えられる",
                            "括弧( )付きの数字は、この駅が終着で発車時刻が無いため、代わりに到着時刻を表示している",
                            "線を太くする設定の種別は種別の色で塗りつぶした印、それ以外の種別は色付きの文字で表す。種別名・行先は各表の下の凡例（下り・上りで別々）を参照",
                        ]}
                    />
                </HelpSection>
                <HelpSection title="凡例">
                    <HelpList
                        items={["時刻の右下の1文字：その列車の行き先（終着駅名の頭文字）。その方向で最も多い行き先は、印を付けない", "右上の●：この駅がその列車の始発駅", "右上の▽：この駅がその列車の終着駅", "始発・終着の印と行き先の文字は、時刻と同じ色（種別の色）で表示する"]}
                    />
                </HelpSection>
            </HelpDialog>
        </Container>
    );
}

export default StationTimetablePage;

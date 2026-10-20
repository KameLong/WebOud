import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Container, NativeSelect } from "@mantine/core";
import { useStationTimetable, type StationTimetableEntry, type StationTimetableHour } from "../hooks/useStationTimetable.ts";
import { HelpDialog, HelpList, HelpSection, helpButtonStyle } from "../components/HelpDialog.tsx";
import type { TrainTypeDto } from "../domain/dto.ts";

/** 見出し帯・外枠の色 */
const BRAND_COLOR = "#0a72be";
/** 時刻列（時の数字セル）の色 */
const HOUR_CELL_COLOR = "#06406e";
/** 偶数行の背景（縞模様） */
const STRIPE_COLOR = "#e4e4e4";

/**
 * 印刷（PDF出力）用CSS。印刷対象の1方向だけをA4縦1枚いっぱいに広げ、他の要素は隠します。
 * 時間帯の行は用紙の高さに合わせて均等に引き伸ばします。
 */
const PRINT_CSS = `
@page { size: A4 portrait; margin: 8mm; }
@media print {
  body * { visibility: hidden !important; }
  .tt-printing, .tt-printing * { visibility: visible !important; }
  .tt-printing {
    position: fixed; left: 0; top: 0; width: 100%; height: 100%;
    margin: 0 !important; box-sizing: border-box;
    display: flex; flex-direction: column;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .tt-printing .tt-rows { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .tt-printing .tt-row { flex: 1 1 0 !important; min-height: 0 !important; }
  .tt-printing .tt-hour { flex-basis: 36px !important; font-size: 15px !important; }
  .tt-printing .tt-cells { font-size: 14px !important; padding: 1px 8px !important; gap: 0 4px !important; }
  .tt-printing .tt-head { padding: 5px 12px !important; }
  .tt-printing .tt-legend { flex: 0 0 auto; }
  .tt-no-print { display: none !important; }
}
`;

/**
 * 背景色の上に載せる文字色（白/黒）を明るさから決めます。
 *
 * @param bg "#rrggbb" または "#rgb" 形式の背景色
 */
function readableTextColor(bg: string): string {
    const hex = bg.replace("#", "");
    const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return "#fff";
    return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#000" : "#fff";
}

/**
 * 時刻（分）の見た目。基準種別（最も下位の種別＝普通）は色付き文字のみ、それ以外は種別色で塗りつぶした印で表す。
 *
 * @param trainType 列車種別
 * @param plain 文字のみで表す（基準種別）か
 * @param children 中身（分の数字）
 */
function TimeBadge({ trainType, plain, children }: { trainType: TrainTypeDto; plain: boolean; children: ReactNode }) {
    return (
        <span
            style={{
                display: "inline-block",
                minWidth: 26,
                padding: "1px 3px",
                textAlign: "center",
                borderRadius: 3,
                lineHeight: 1.3,
                fontWeight: trainType.fontBold || !plain ? 700 : 400,
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
 * @param baseTypeId 文字のみで表す基準種別のID
 */
function HourRow({ hour, entries, striped, baseTypeId }: StationTimetableHour & { striped: boolean; baseTypeId: number }) {
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
                    const marker = e.isOrigin && e.isTerminus ? "●▲" : e.isOrigin ? "●" : e.isTerminus ? "▲" : "";
                    const title =
                        [e.trainType.name, e.trip.no, e.trip.name, e.destName && `${e.destName}行き`].filter(Boolean).join(" ") +
                        (e.isOrigin ? "（この駅が始発）" : "") +
                        (e.isTerminus ? "（この駅が終着）" : "");
                    return (
                        <span key={e.trip.id} title={title || undefined} style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap", paddingTop: 8, paddingLeft: 8 }}>
                            {e.destChar && <span style={{ position: "absolute", top: 0, left: 0, fontSize: 10, lineHeight: 1, color: "#333" }}>{e.destChar}</span>}
                            <TimeBadge trainType={e.trainType} plain={e.trainType.id === baseTypeId}>
                                {label}
                            </TimeBadge>
                            {marker && <span style={{ position: "absolute", top: 0, right: -2, fontSize: 8, lineHeight: 1, color: "#333" }}>{marker}</span>}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * 時間帯ごとの行一覧から、実際に使われている列車種別を重複なく集めます（種別の並び順＝index順）。
 *
 * @param hourGroups 下り・上りの時間帯ごとの行一覧
 */
function collectTrainTypes(hourGroups: StationTimetableHour[][]): TrainTypeDto[] {
    const byId = new Map<number, TrainTypeDto>();
    for (const hours of hourGroups) {
        for (const h of hours) {
            for (const e of h.entries as StationTimetableEntry[]) {
                byId.set(e.trainType.id, e.trainType);
            }
        }
    }
    return [...byId.values()].sort((a, b) => a.index - b.index);
}

/**
 * 行き先の頭文字と終着駅名の一覧を集めます（駅名ごとに1件）。
 *
 * @param hourGroups 下り・上りの時間帯ごとの行一覧
 */
function collectDestinations(hourGroups: StationTimetableHour[][]): { char: string; name: string }[] {
    const seen = new Map<string, { char: string; name: string }>();
    for (const hours of hourGroups) {
        for (const h of hours) {
            for (const e of h.entries) {
                if (e.destName) seen.set(e.destName, { char: e.destChar, name: e.destName });
            }
        }
    }
    return [...seen.values()];
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
 * @param baseTypeId 文字のみで表す基準種別のID
 */
function TimetableLegend({ trainTypes, destinations, baseTypeId }: { trainTypes: TrainTypeDto[]; destinations: { char: string; name: string }[]; baseTypeId: number }) {
    if (trainTypes.length === 0) return null;
    return (
        <div className="tt-legend" style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 10px", borderTop: `2px solid ${BRAND_COLOR}`, background: "#fff" }}>
            <LegendRow title="種別">
                {[...trainTypes].reverse().map((t) => (
                    <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <TimeBadge trainType={t} plain={t.id === baseTypeId}>
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
                <span>▲ この駅が終着</span>
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
 * @param baseTypeId 文字のみで表す基準種別のID
 */
function DirectionTable({
    stationName,
    towards,
    hours,
    baseTypeId,
    printing,
    onPrint,
}: {
    stationName: string;
    towards: string;
    hours: StationTimetableHour[];
    baseTypeId: number;
    printing: boolean;
    onPrint: () => void;
}) {
    const hasAnyTrain = hours.some((h) => h.entries.length > 0);
    const stationLabel = stationName.endsWith("駅") ? stationName : `${stationName}駅`;
    return (
        <div className={printing ? "tt-sheet tt-printing" : "tt-sheet"} style={{ marginBottom: 24, border: `3px solid ${BRAND_COLOR}`, background: "#fff" }}>
            <div className="tt-head" style={{ background: BRAND_COLOR, color: "#fff", display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 16px", padding: "8px 14px" }}>
                <span style={{ fontSize: 22, fontWeight: 700 }}>
                    {stationLabel}発 ➡ {towards}方面
                </span>
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                        type="button"
                        className="tt-no-print"
                        onClick={onPrint}
                        style={{ cursor: "pointer", padding: "2px 10px", fontSize: 13, borderRadius: 4, border: "1px solid #fff", background: "transparent", color: "#fff" }}
                        title="A4用紙1枚に印刷します（印刷ダイアログで「PDFに保存」を選んでください）"
                    >
                        PDF出力
                    </button>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>発車時刻表</span>
                </span>
            </div>
            {!hasAnyTrain ? (
                <div style={{ padding: 16, color: "#666", fontSize: 14 }}>この駅に停車する列車はありません</div>
            ) : (
                <div className="tt-rows">
                    {hours.map((h, i) => (
                        <HourRow key={h.hour} hour={h.hour} entries={h.entries} striped={i % 2 === 0} baseTypeId={baseTypeId} />
                    ))}
                </div>
            )}
            <TimetableLegend trainTypes={collectTrainTypes([hours])} destinations={collectDestinations([hours])} baseTypeId={baseTypeId} />
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
    /** 印刷（PDF出力）中の方向。nullなら通常表示 */
    const [printTarget, setPrintTarget] = useState<"down" | "up" | null>(null);

    // 印刷対象を描画してから印刷ダイアログを開き、閉じたら通常表示に戻す
    useEffect(() => {
        if (!printTarget) return;
        const reset = () => setPrintTarget(null);
        window.addEventListener("afterprint", reset);
        const timer = window.setTimeout(() => window.print(), 50);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("afterprint", reset);
        };
    }, [printTarget]);

    const { station, stations, down, up } = useStationTimetable(routeId, stationId);
    // 最も下位（index最小）の種別は色付き文字のみで表し、それ以外は塗りつぶした印にする（上下で共通）
    const baseTypeId = useMemo(() => collectTrainTypes([down, up])[0]?.id ?? -1, [down, up]);
    // 下りは駅リストの末尾側、上りは先頭側が方面
    const downTowards = stations[stations.length - 1]?.name ?? "";
    const upTowards = stations[0]?.name ?? "";

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

            {printTarget && <style>{PRINT_CSS}</style>}
            <DirectionTable stationName={station.name} towards={downTowards} hours={down} baseTypeId={baseTypeId} printing={printTarget === "down"} onPrint={() => setPrintTarget("down")} />
            <DirectionTable stationName={station.name} towards={upTowards} hours={up} baseTypeId={baseTypeId} printing={printTarget === "up"} onPrint={() => setPrintTarget("up")} />

            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title="駅時刻表 - ヘルプ">
                <HelpSection title="このページでできること">
                    <HelpList
                        items={[
                            "選択した駅に停車する列車の発車時刻を、方向（下り/上り）ごと・時間帯ごとに一覧表示する（表示専用、編集はできません）",
                            "時間帯は午前3時始まり・翌午前2時終わりで固定表示（0〜2時台は23時の次に表示）",
                            "各表の見出し帯の「PDF出力」で、その方向だけをA4縦1枚いっぱいに印刷できる（印刷ダイアログの出力先で「PDFに保存」を選ぶ）",
                            "上部のプルダウンで別の駅へすぐに切り替えられる",
                            "括弧( )付きの数字は、この駅が終着で発車時刻が無いため、代わりに到着時刻を表示している",
                            "最も下位の種別（普通など）は色付きの文字、それ以外の種別は種別の色で塗りつぶした印で表す。種別名・行先は各表の下の凡例（下り・上りで別々）を参照",
                        ]}
                    />
                </HelpSection>
                <HelpSection title="凡例">
                    <HelpList
                        items={["時刻の左上の1文字：その列車の行き先（終着駅名の頭文字）", "右上の●：この駅がその列車の始発駅", "右上の▲：この駅がその列車の終着駅"]}
                    />
                </HelpSection>
            </HelpDialog>
        </Container>
    );
}

export default StationTimetablePage;

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Container, NativeSelect, Text, Title } from "@mantine/core";
import { useStationTimetable, type StationTimetableEntry, type StationTimetableHour } from "../hooks/useStationTimetable.ts";
import { HelpDialog, HelpList, HelpSection, helpButtonStyle } from "../components/HelpDialog.tsx";
import type { TrainTypeDto } from "../domain/dto.ts";

/**
 * 1時間分の行（時刻の数字＋分の一覧）を描画します。
 *
 * @param hour 時間帯の時（0〜23。深夜0〜2時台は23時の次の行として扱う）
 * @param entries この時間に発車（終着のみの列車は着）する列車の一覧
 */
function HourRow({ hour, entries }: StationTimetableHour) {
    return (
        <tr style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: "4px 8px", fontWeight: 700, textAlign: "right", borderRight: "2px solid #333", verticalAlign: "top", background: "#fafafa" }}>{hour}</td>
            <td style={{ padding: "4px 8px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px" }}>
                    {entries.map((e) => {
                        const mm = Math.floor((e.time % 3600) / 60)
                            .toString()
                            .padStart(2, "0");
                        const label = e.isArrivalOnly ? `(${mm})` : mm;
                        const marker = e.isOrigin && e.isTerminus ? "●▲" : e.isOrigin ? "●" : e.isTerminus ? "▲" : "";
                        const title =
                            [e.trainType.name, e.trip.no, e.trip.name, e.destChar && `${e.destChar}方面`].filter(Boolean).join(" ") +
                            (e.isOrigin ? "（この駅が始発）" : "") +
                            (e.isTerminus ? "（この駅が終着）" : "");
                        return (
                            <span
                                key={e.trip.id}
                                title={title || undefined}
                                style={{
                                    position: "relative",
                                    display: "inline-block",
                                    color: e.trainType.color,
                                    fontWeight: e.trainType.fontBold ? 700 : 400,
                                    whiteSpace: "nowrap",
                                    paddingTop: 7,
                                    paddingRight: 9,
                                    paddingBottom: 7,
                                }}
                            >
                                {label}
                                {marker && <span style={{ position: "absolute", top: 0, right: 0, fontSize: 7, lineHeight: 1, color: "#333" }}>{marker}</span>}
                                {e.destChar && (
                                    <span style={{ position: "absolute", bottom: 0, right: 0, fontSize: 9, lineHeight: 1, fontWeight: 400, color: "#666" }}>{e.destChar}</span>
                                )}
                            </span>
                        );
                    })}
                </div>
            </td>
        </tr>
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
 * 列車種別の色の凡例（色の四角＋種別名）を一覧表示します。
 *
 * @param trainTypes 表示する種別一覧
 */
function TrainTypeLegend({ trainTypes }: { trainTypes: TrainTypeDto[] }) {
    if (trainTypes.length === 0) return null;
    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", marginTop: 20, paddingTop: 12, borderTop: "1px solid #eee" }}>
            {trainTypes.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                    <span style={{ color: t.color, fontWeight: t.fontBold ? 700 : 400 }}>
                        {t.shortName && t.shortName !== t.name ? `${t.shortName}（${t.name || "無名"}）` : t.name || "（名称未設定）"}
                    </span>
                </div>
            ))}
        </div>
    );
}

/**
 * 1方向分の時刻表（時間帯ごとの表）。列車が無ければその旨を表示します。
 *
 * @param title 見出し（下り／上り）
 * @param hours 時間帯ごとの行
 */
function DirectionTable({ title, hours }: { title: string; hours: StationTimetableHour[] }) {
    const hasAnyTrain = hours.some((h) => h.entries.length > 0);
    return (
        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
            <Title order={4} mb="xs">
                {title}
            </Title>
            {!hasAnyTrain ? (
                <Text size="sm" c="dimmed">
                    この駅に停車する列車はありません
                </Text>
            ) : (
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
                    <tbody>
                        {hours.map((h) => (
                            <HourRow key={h.hour} hour={h.hour} entries={h.entries} />
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

/**
 * 駅時刻表：1駅を基準に、その駅に停車する列車の発車時刻を時間帯ごとに一覧表示します（AOdiaのStationTimeTableに相当、表示専用）。
 */
export function StationTimetablePage() {
    const params = useParams<{ routeId: string; stationId: string }>();
    const routeId = Number(params.routeId ?? 0);
    const stationId = Number(params.stationId ?? 0);
    const nav = useNavigate();
    const [helpOpen, setHelpOpen] = useState(false);

    const { station, stations, down, up } = useStationTimetable(routeId, stationId);
    const legendTrainTypes = useMemo(() => collectTrainTypes([down, up]), [down, up]);

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

            <Title order={3} mb="md">
                {station.name} 時刻表
            </Title>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                <DirectionTable title="下り" hours={down} />
                <DirectionTable title="上り" hours={up} />
            </div>

            <TrainTypeLegend trainTypes={legendTrainTypes} />

            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title="駅時刻表 - ヘルプ">
                <HelpSection title="このページでできること">
                    <HelpList
                        items={[
                            "選択した駅に停車する列車の発車時刻を、時間帯ごと・方向（下り/上り）ごとに一覧表示する（表示専用、編集はできません）",
                            "時間帯は午前3時始まり・翌午前2時終わりで固定表示（0〜2時台は23時の次に表示）",
                            "上部のプルダウンで別の駅へすぐに切り替えられる",
                            "括弧( )付きの数字は、この駅が終着で発車時刻が無いため、代わりに到着時刻を表示している",
                            "時刻の色は列車種別を表す。種別名は時刻表の下の凡例にまとめて表示する",
                        ]}
                    />
                </HelpSection>
                <HelpSection title="凡例">
                    <HelpList
                        items={["右上の●：この駅がその列車の始発駅", "右上の▲：この駅がその列車の終着駅", "右下の1文字：その列車の行き先（終着駅名の頭文字）"]}
                    />
                </HelpSection>
            </HelpDialog>
        </Container>
    );
}

export default StationTimetablePage;

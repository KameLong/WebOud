import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Container, NativeSelect, Text, Title } from "@mantine/core";
import { useStationTimetable, type StationTimetableHour } from "../hooks/useStationTimetable.ts";
import { HelpDialog, HelpList, HelpSection, helpButtonStyle } from "../components/HelpDialog.tsx";

/**
 * 1時間分の行（時刻の数字＋分の一覧）を描画します。
 *
 * @param hour 時間帯の時（0:00からの経過時間数。24時で折り返さない）
 * @param entries この時間に発車（終着のみの列車は着）する列車の一覧
 */
function HourRow({ hour, entries }: StationTimetableHour) {
    return (
        <tr style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: "4px 8px", fontWeight: 700, textAlign: "right", borderRight: "2px solid #333", verticalAlign: "top", background: "#fafafa" }}>{hour}</td>
            <td style={{ padding: "4px 8px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
                    {entries.map((e) => {
                        const mm = Math.floor((e.time % 3600) / 60)
                            .toString()
                            .padStart(2, "0");
                        const label = e.isArrivalOnly ? `(${mm})` : mm;
                        const title = [e.trainType.name, e.trip.no, e.trip.name].filter(Boolean).join(" ") + (e.isArrivalOnly ? "（この駅が終着）" : "");
                        return (
                            <span key={e.trip.id} title={title || undefined} style={{ color: e.trainType.color, fontWeight: e.trainType.fontBold ? 700 : 400, whiteSpace: "nowrap" }}>
                                {e.trainType.shortName && <sup style={{ fontSize: 10 }}>{e.trainType.shortName}</sup>}
                                {label}
                            </span>
                        );
                    })}
                </div>
            </td>
        </tr>
    );
}

/**
 * 1方向分の時刻表（時間帯ごとの表）。列車が無ければその旨を表示します。
 *
 * @param title 見出し（下り／上り）
 * @param hours 時間帯ごとの行
 */
function DirectionTable({ title, hours }: { title: string; hours: StationTimetableHour[] }) {
    return (
        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
            <Title order={4} mb="xs">
                {title}
            </Title>
            {hours.length === 0 ? (
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

            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title="駅時刻表 - ヘルプ">
                <HelpSection title="このページでできること">
                    <HelpList
                        items={[
                            "選択した駅に停車する列車の発車時刻を、時間帯ごと・方向（下り/上り）ごとに一覧表示する（表示専用、編集はできません）",
                            "上部のプルダウンで別の駅へすぐに切り替えられる",
                            "括弧( )付きの数字は、この駅が終着で発車時刻が無いため、代わりに到着時刻を表示している",
                            "色付き・右上の略称は列車種別を表す（種別編集ページの設定に合わせる）",
                        ]}
                    />
                </HelpSection>
            </HelpDialog>
        </Container>
    );
}

export default StationTimetablePage;

import { useMemo, useRef, useState } from "react";
import { Alert, Button, Group, Text, Title } from "@mantine/core";
import { analyzePassengers, type AnalysisResult as Result, type TripLoad } from "../../domain/analysis.ts";
import { selectTargetTrips } from "../../domain/analysisTargets.ts";
import { timeInt2Str } from "../../domain/time.ts";
import type { RouteRecord } from "../../store/types.ts";
import { getErrorMessage } from "../../shared/lib/errors.ts";
import { useCommonT } from "../../shared/i18n/common.ts";
import { useT } from "./messages.ts";

/**
 * 人数を、小数1桁までで表示します（0は「0」）。
 *
 * @param n 人数
 */
function fmt(n: number): string {
    return String(Math.round(n * 10) / 10);
}

/**
 * 解析の結果の表（1方向分）。路線時刻表と同じように、駅を縦に並べ（走行順）、解析対象の列車を横に並べます。
 * 各列車は、時刻と、その右側の乗車客数（各駅を出発したあとの車内の乗客数）の2列です。
 * 時刻は、出発時刻（終着駅は到着時刻）です。通る駅は「↓」、走らない区間は空欄です。
 *
 * @param props route:路線 / direct:0:下り 1:上り / loads:解析対象の列車の割り当て結果（出発時刻順）
 */
function ResultTable({ route, direct, loads }: { route: RouteRecord; direct: number; loads: TripLoad[] }) {
    const { t } = useT();
    const cm = useCommonT().t;
    const typeById = useMemo(() => new Map(route.trainTypes.map((x) => [x.id, x])), [route.trainTypes]);
    const rows = useMemo(() => {
        const asc = [...route.stations].sort((a, b) => a.index - b.index);
        return direct === 1 ? asc.reverse() : asc;
    }, [route.stations, direct]);
    // 色の濃さの基準にする、車内人数の最大
    const maxLoad = useMemo(() => Math.max(1, ...loads.flatMap((l) => l.onboard)), [loads]);
    // 列車ごとの、駅ID → 停車位置
    const positions = useMemo(() => loads.map((l) => new Map(l.stationIds.map((id, p) => [id, p]))), [loads]);
    if (loads.length === 0) return null;

    const summaryRows: { label: string; value: (l: TripLoad) => number }[] = [
        { label: t("resultBoarded"), value: (l) => l.boardings.reduce((a, b) => a + b, 0) },
        { label: t("resultPeak"), value: (l) => Math.max(0, ...l.onboard) },
    ];

    return (
        <section style={{ marginBottom: 20 }}>
            <Text fw={700} size="sm" mb={4}>
                {cm(direct === 1 ? "up" : "down")}　{t("resultCount", { n: loads.length })}
            </Text>
            <div className="rr-scroll">
                <table className="rr-table">
                    <thead>
                        <tr>
                            <th className="rr-corner">{cm("trainType")}</th>
                            {loads.map((l) => {
                                const type = typeById.get(l.trip.trainTypeID);
                                return (
                                    <th key={l.trip.id} colSpan={2} className="rr-train" style={{ color: type?.color, fontWeight: type?.fontBold ? 700 : 400 }}>
                                        {type?.shortName || type?.name}
                                    </th>
                                );
                            })}
                        </tr>
                        <tr>
                            <th className="rr-corner">{cm("trainNo")}</th>
                            {loads.map((l) => (
                                <th key={l.trip.id} colSpan={2} className="rr-train" style={{ color: typeById.get(l.trip.trainTypeID)?.color }}>
                                    {l.trip.no || "\u00a0"}
                                </th>
                            ))}
                        </tr>
                        <tr className="rr-head-last">
                            <th className="rr-corner">{cm("trainName")}</th>
                            {loads.map((l) => (
                                <th key={l.trip.id} colSpan={2} className="rr-train rr-name" title={l.trip.name}>
                                    {l.trip.name || "\u00a0"}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((s) => (
                            <tr key={s.id}>
                                <th className="rr-station" title={s.name}>
                                    {s.name}
                                </th>
                                {loads.map((l, k) => {
                                    const p = positions[k].get(s.id);
                                    const type = typeById.get(l.trip.trainTypeID);
                                    if (p === undefined) {
                                        // 走る区間の途中で停車しない駅は「↓」、走らない区間は空欄
                                        const between = l.stationIds.length > 0 && rows.findIndex((r) => r.id === l.stationIds[0]) < rows.indexOf(s) && rows.indexOf(s) < rows.findIndex((r) => r.id === l.stationIds[l.stationIds.length - 1]);
                                        return (
                                            <td key={l.trip.id} colSpan={2} className="rr-pass">
                                                {between ? "↓" : ""}
                                            </td>
                                        );
                                    }
                                    const v = p < l.onboard.length ? l.onboard[p] : null;
                                    const time = p === 0 ? l.times[p].dep : p === l.times.length - 1 ? l.times[p].arr : l.times[p].dep;
                                    return [
                                        <td key={`${l.trip.id}t`} className="rr-time" style={{ color: type?.color }}>
                                            {timeInt2Str(time, false)}
                                        </td>,
                                        <td key={`${l.trip.id}n`} className="rr-count" style={{ background: v ? `rgba(220, 60, 40, ${Math.min(0.45, (v / maxLoad) * 0.45)})` : undefined }}>
                                            {v === null ? "" : fmt(v)}
                                        </td>,
                                    ];
                                })}
                            </tr>
                        ))}
                        {summaryRows.map((row, i) => (
                            <tr key={row.label} className={i === 0 ? "rr-summary-first" : undefined}>
                                <th className="rr-station">{row.label}</th>
                                {loads.map((l) => (
                                    <td key={l.trip.id} colSpan={2} className="rr-summary">
                                        {fmt(row.value(l))}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/**
 * 解析の結果。「計算する」を押すと、駅間の利用客数・乗客が駅に来る時間帯をもとに、乗客を各列車に割り当てて、
 * 解析対象の列車（始発駅を解析対象の時間帯に出発する列車）ごとの乗車人数を表示します。
 * 入力や時刻表が変わったあとは、結果が古いことを知らせます。
 *
 * @param props route:路線
 */
export function AnalysisResult({ route }: { route: RouteRecord }) {
    const { t } = useT();
    const [running, setRunning] = useState<{ done: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    // 計算した結果と、そのときの路線（路線が変わったら、結果は古い）
    const [done, setDone] = useState<{ result: Result; route: RouteRecord } | null>(null);
    const busy = useRef(false);

    const arrival = route.arrival;
    const target = route.target;
    const hasOd = Object.values(route.od ?? {}).some((v) => v > 0);
    const problems = [
        arrival?.start === undefined || arrival?.end === undefined ? t("needArrival") : null,
        target?.start === undefined || target?.end === undefined ? t("needTarget") : null,
        hasOd ? null : t("needOd"),
    ].filter((x): x is string => x !== null);

    async function run() {
        if (busy.current || problems.length > 0) return;
        busy.current = true;
        setError(null);
        setRunning({ done: 0, total: 1 });
        try {
            const result = await analyzePassengers(
                { stations: route.stations, trips: route.trips, od: route.od ?? {}, arrivalStart: arrival!.start!, arrivalEnd: arrival!.end! },
                (d, total) => setRunning({ done: d, total }),
            );
            setDone({ result, route });
        } catch (e) {
            setError(getErrorMessage(e));
        } finally {
            busy.current = false;
            setRunning(null);
        }
    }

    const stale = done !== null && done.route !== route;
    const shown = useMemo(() => {
        if (!done || target?.start === undefined || target?.end === undefined) return null;
        const ids = new Set(selectTargetTrips(done.route.trips, done.route.stations, done.route.target?.start ?? 0, done.route.target?.end ?? 0).map((x) => x.trip.id));
        const loads = done.result.trips.filter((l) => ids.has(l.trip.id)).sort((a, b) => a.times[0].dep - b.times[0].dep);
        return { down: loads.filter((l) => l.trip.direct === 0), up: loads.filter((l) => l.trip.direct === 1), count: ids.size };
    }, [done, target?.start, target?.end]);

    return (
        <section style={{ marginTop: 28 }}>
            <Group justify="space-between" align="flex-end" mb={4}>
                <Title order={4}>{t("resultTitle")}</Title>
                <Button size="compact-sm" onClick={() => void run()} loading={running !== null} disabled={problems.length > 0}>
                    {t("resultRun")}
                </Button>
            </Group>
            <Text size="xs" c="dimmed" mb="xs">
                {t("resultIntro")}
            </Text>
            {problems.length > 0 && (
                <Text size="sm" c="red" mb="xs">
                    {problems.join(" ")}
                </Text>
            )}
            {running && (
                <Text size="sm" mb="xs">
                    {t("resultRunning", { done: running.done, total: running.total })}
                </Text>
            )}
            {error && (
                <Alert color="red" mb="xs">
                    {error}
                </Alert>
            )}
            {stale && (
                <Alert color="yellow" mb="xs">
                    {t("resultStale")}
                </Alert>
            )}
            {done && shown && (
                <>
                    <Text size="sm" mb="xs">
                        {t("resultSummary", { generated: fmt(done.result.generated), assigned: fmt(done.result.assigned), unreachable: fmt(done.result.unreachable) })}
                    </Text>
                    {done.result.unreachable > 0 && (
                        <Text size="xs" c="red" mb="xs">
                            {t("resultUnreachable")}
                        </Text>
                    )}
                    {shown.count === 0 ? (
                        <Text size="sm" c="dimmed">
                            {t("resultNoTargets")}
                        </Text>
                    ) : (
                        <>
                            <Text size="xs" c="dimmed" mb="xs">
                                {t("resultTableNote")}
                            </Text>
                            <ResultTable route={done.route} direct={0} loads={shown.down} />
                            <ResultTable route={done.route} direct={1} loads={shown.up} />
                        </>
                    )}
                </>
            )}
        </section>
    );
}

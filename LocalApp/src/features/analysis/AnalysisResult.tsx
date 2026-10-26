import { useMemo, useRef, useState } from "react";
import { Alert, Button, Group, Text, Title } from "@mantine/core";
import { analyzePassengers, type AnalysisResult as Result, type TripLoad } from "../../domain/analysis.ts";
import { selectTargetTrips } from "../../domain/analysisTargets.ts";
import { formatClock } from "../../domain/time.ts";
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
 * 解析の結果の表（1方向分）。行が解析対象の列車、列が駅（走行順）で、各駅を出発したあとの乗車人数を表示します。
 *
 * @param props route:路線 / direct:0:下り 1:上り / loads:解析対象の列車の割り当て結果
 */
function ResultTable({ route, direct, loads }: { route: RouteRecord; direct: number; loads: TripLoad[] }) {
    const { t } = useT();
    const cm = useCommonT().t;
    const typeById = useMemo(() => new Map(route.trainTypes.map((x) => [x.id, x])), [route.trainTypes]);
    const columns = useMemo(() => {
        const asc = [...route.stations].sort((a, b) => a.index - b.index);
        return direct === 1 ? asc.reverse() : asc;
    }, [route.stations, direct]);
    if (loads.length === 0) return null;

    return (
        <section style={{ marginBottom: 20 }}>
            <Text fw={700} size="sm" mb={4}>
                {cm(direct === 1 ? "up" : "down")}　{t("resultCount", { n: loads.length })}
            </Text>
            <div className="od-scroll">
                <table className="od-table res-table">
                    <thead>
                        <tr>
                            <th className="od-corner">{t("resultOrigin")}</th>
                            <th className="od-total-head">{cm("trainType")}</th>
                            <th className="od-total-head">{cm("trainNo")}</th>
                            <th className="od-total-head">{t("resultBoarded")}</th>
                            <th className="od-total-head">{t("resultPeak")}</th>
                            {columns.map((s) => (
                                <th key={s.id} className="od-col-head" title={s.name}>
                                    <span>{s.name}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loads.map((l) => {
                            const type = typeById.get(l.trip.trainTypeID);
                            const onboard = new Map(l.stationIds.map((id, p) => [id, p < l.onboard.length ? l.onboard[p] : null]));
                            return (
                                <tr key={l.trip.id}>
                                    <th className="od-row-head">{formatClock(l.times[0].dep)}</th>
                                    <td style={{ color: type?.color, fontWeight: 600, padding: "0 6px", whiteSpace: "nowrap" }}>{type?.shortName || type?.name}</td>
                                    <td style={{ padding: "0 6px", whiteSpace: "nowrap" }}>{l.trip.no}</td>
                                    <td className="od-total">{fmt(l.boardings.reduce((a, b) => a + b, 0))}</td>
                                    <td className="od-total">{fmt(Math.max(0, ...l.onboard))}</td>
                                    {columns.map((s) => {
                                        const v = onboard.get(s.id);
                                        return (
                                            <td key={s.id} className="res-cell">
                                                {v === undefined ? "" : v === null ? "▏" : fmt(v)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
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

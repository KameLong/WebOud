import { useMemo, useState } from "react";
import { Group, NativeSelect, Text, Title } from "@mantine/core";
import { traceRoutes } from "../../domain/analysis.ts";
import { odKey } from "../../domain/od.ts";
import { formatClock } from "../../domain/time.ts";
import type { RouteRecord } from "../../store/types.ts";
import { useT } from "./messages.ts";

/**
 * 人数を、小数1桁までで表示します。
 *
 * @param n 人数
 */
function fmt(n: number): string {
    return String(Math.round(n * 10) / 10);
}

/**
 * 2駅間の経路。発駅と着駅を選ぶと、発駅に着いた乗客が選ぶ経路（乗る列車と乗り換え）を、発駅に着く時刻の順に表示します。
 * 同じ経路になる連続した時刻はまとめて表示します。
 *
 * @param props route:路線（解析の計算に使った時点のもの）
 */
export function PairRoutes({ route }: { route: RouteRecord }) {
    const { t } = useT();
    const [fromId, setFromId] = useState("");
    const [toId, setToId] = useState("");
    const stations = useMemo(() => [...route.stations].sort((a, b) => a.index - b.index), [route.stations]);
    const names = useMemo(() => new Map(route.stations.map((s) => [s.id, s.name])), [route.stations]);
    const typeById = useMemo(() => new Map(route.trainTypes.map((x) => [x.id, x])), [route.trainTypes]);
    const arrival = route.arrival;
    const ready = fromId !== "" && toId !== "" && fromId !== toId && arrival?.start !== undefined && arrival.end !== undefined;

    const groups = useMemo(() => {
        if (!ready) return [];
        return traceRoutes({ stations: route.stations, trips: route.trips, od: {}, arrivalStart: arrival!.start!, arrivalEnd: arrival!.end! }, Number(fromId), Number(toId));
    }, [ready, route.stations, route.trips, arrival, fromId, toId]);
    const perMinute = ready ? (route.od?.[odKey(Number(fromId), Number(toId))] ?? 0) / 60 : 0;

    const options = [{ value: "", label: t("pairChoose") }, ...stations.map((s) => ({ value: String(s.id), label: s.name }))];
    return (
        <section style={{ marginTop: 28 }}>
            <Title order={4} mb={4}>
                {t("pairTitle")}
            </Title>
            <Text size="xs" c="dimmed" mb="xs">
                {t("pairIntro")}
            </Text>
            <Group mb="xs" align="flex-end">
                <NativeSelect label={t("pairFrom")} data={options} value={fromId} onChange={(e) => setFromId(e.currentTarget.value)} />
                <NativeSelect label={t("pairTo")} data={options} value={toId} onChange={(e) => setToId(e.currentTarget.value)} />
            </Group>
            {!ready ? (
                <Text size="sm" c="dimmed">
                    {t("pairNeedBoth")}
                </Text>
            ) : (
                <div className="rr-scroll">
                    <table className="pr-table">
                        <thead>
                            <tr>
                                <th>{t("pairColArrive")}</th>
                                <th>{t("pairColPeople")}</th>
                                <th>{t("pairColRoute")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map((g) => (
                                <tr key={g.firstArrival}>
                                    <td className="pr-nowrap">{g.minutes === 1 ? formatClock(g.firstArrival) : `${formatClock(g.firstArrival)}〜${formatClock(g.lastArrival)}`}</td>
                                    <td className="pr-nowrap pr-num">{perMinute > 0 ? fmt(perMinute * g.minutes) : "-"}</td>
                                    <td>
                                        {g.legs === null ? (
                                            <Text size="sm" c="red">
                                                {t("pairUnreachable")}
                                            </Text>
                                        ) : (
                                            <>
                                                <Text size="xs" c="dimmed">
                                                    {g.legs.length === 1 ? t("pairDirect") : t("pairTransfers", { n: g.legs.length - 1 })}　{t("pairArrive", { time: formatClock(g.legs[g.legs.length - 1].arr) })}
                                                </Text>
                                                {g.legs.map((l, i) => {
                                                    const type = typeById.get(l.trip.trainTypeID);
                                                    const prev = i > 0 ? g.legs![i - 1] : null;
                                                    return (
                                                        <div key={i}>
                                                            {prev && (
                                                                <Text size="xs" c="dimmed">
                                                                    {t("pairAt", { station: names.get(l.boardStationId) ?? "", wait: Math.round((l.dep - prev.arr) / 60) })}
                                                                </Text>
                                                            )}
                                                            <Text size="sm">
                                                                <span style={{ color: type?.color, fontWeight: type?.fontBold ? 700 : 400 }}>{[type?.shortName || type?.name, l.trip.no, l.trip.name].filter(Boolean).join(" ")}</span>
                                                                {"　"}
                                                                {names.get(l.boardStationId)} {t("pairDep", { time: formatClock(l.dep) })} → {names.get(l.alightStationId)} {t("pairArr", { time: formatClock(l.arr) })}
                                                            </Text>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

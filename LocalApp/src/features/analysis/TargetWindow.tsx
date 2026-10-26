import { useMemo } from "react";
import { Text } from "@mantine/core";
import { selectTargetTrips } from "../../domain/analysisTargets.ts";
import { formatClock } from "../../domain/time.ts";
import type { RouteRecord } from "../../store/types.ts";
import { setAnalysisTime } from "../../store/timetableApi.ts";
import { ClockWindow } from "./ClockWindow.tsx";
import { useT } from "./messages.ts";

/**
 * 解析対象の時間帯（例：11:00〜12:00）の入力欄と、その時間帯に始発駅を出発する列車の本数。
 * 始発駅をこの時間帯（開始以上・終了未満）に出発する列車が、解析結果を表示する対象になる。
 *
 * @param props route:路線（駅・列車・保存済みの時間帯）
 */
export function TargetWindow({ route }: { route: RouteRecord }) {
    const { t } = useT();
    const start = route.target?.start;
    const end = route.target?.end;
    const targets = useMemo(() => (start !== undefined && end !== undefined ? selectTargetTrips(route.trips, route.stations, start, end) : null), [route.trips, route.stations, start, end]);
    const down = targets?.filter((x) => x.trip.direct === 0).length ?? 0;
    const up = targets?.filter((x) => x.trip.direct === 1).length ?? 0;

    return (
        <ClockWindow
            title={t("targetTitle")}
            intro={t("targetIntro")}
            startLabel={t("windowStart")}
            endLabel={t("windowEnd")}
            start={start}
            end={end}
            onChange={(which, s) => setAnalysisTime(route.id, "target", which, s)}
        >
            {targets !== null && (
                <Text size="sm" mt="xs">
                    {t("targetSummary", { start: formatClock(start!), end: formatClock(end!), down, up, total: targets.length })}
                </Text>
            )}
        </ClockWindow>
    );
}

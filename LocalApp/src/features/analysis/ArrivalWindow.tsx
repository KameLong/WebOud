import { Text } from "@mantine/core";
import { formatClock } from "../../domain/time.ts";
import { setAnalysisTime } from "../../store/timetableApi.ts";
import { ClockWindow } from "./ClockWindow.tsx";
import { useT } from "./messages.ts";

/**
 * 乗客が駅に来る時間帯（例：10:00〜13:00）の入力欄と、その時間帯の長さ・想定の総乗客数。
 * 駅間の利用客数（1時間あたり）が、この時間帯のあいだ続くものとして、総乗客数を求める。
 *
 * @param props routeId:路線ID / arrival:保存済みの時間帯 / perHour:駅間の利用客数の合計（人/時）
 */
export function ArrivalWindow(props: { routeId: number; arrival: { start?: number; end?: number } | undefined; perHour: number }) {
    const { routeId, arrival, perHour } = props;
    const { t } = useT();
    const start = arrival?.start;
    const end = arrival?.end;
    const hours = start !== undefined && end !== undefined ? (end - start) / 3600 : null;
    const fmt = (n: number) => String(Math.round(n * 100) / 100);

    return (
        <ClockWindow
            title={t("arrivalTitle")}
            intro={t("arrivalIntro")}
            startLabel={t("windowStart")}
            endLabel={t("windowEnd")}
            start={start}
            end={end}
            onChange={(which, s) => setAnalysisTime(routeId, "arrival", which, s)}
        >
            {hours !== null && (
                <Text size="sm" mt="xs">
                    {t("arrivalSummary", { start: formatClock(start!), end: formatClock(end!), hours: fmt(hours), total: fmt(perHour * hours) })}
                </Text>
            )}
        </ClockWindow>
    );
}

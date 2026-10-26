import { useState } from "react";
import { Group, Text, TextInput } from "@mantine/core";
import { formatClock, parseClockInput } from "../../domain/time.ts";
import { setArrivalTime } from "../../store/timetableApi.ts";
import { useT } from "./messages.ts";

/**
 * 時刻を1つ入力する欄。読める時刻のときだけ、その場で保存する（空欄にすると消す）。
 * 読めない文字や、開始と終了の前後が合わない値は、保存せず、入力欄を離れたときに保存済みの値へ戻す。
 *
 * @param props label:欄の名前 / value:保存済みの時刻（秒） / check:入力した時刻が使えるか（使えなければ理由の文を返す） / onCommit:保存する
 */
function ClockField(props: { label: string; value: number | undefined; check: (seconds: number) => string | null; onCommit: (seconds: number | null) => void }) {
    const { label, value, check, onCommit } = props;
    const { t } = useT();
    // 編集中の文字。nullのときは保存済みの時刻を表示する
    const [draft, setDraft] = useState<string | null>(null);
    const parsed = draft === null ? undefined : parseClockInput(draft);
    const problem = draft === null ? null : parsed === undefined ? t("arrivalInvalid") : parsed === null ? null : check(parsed);

    return (
        <TextInput
            label={label}
            value={draft ?? (value === undefined ? "" : formatClock(value))}
            placeholder="hh:mm"
            inputMode="numeric"
            error={problem}
            style={{ width: 130 }}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
                const text = e.currentTarget.value;
                setDraft(text);
                const p = parseClockInput(text);
                if (p === null) onCommit(null);
                else if (p !== undefined && check(p) === null) onCommit(p);
            }}
            onBlur={() => setDraft(null)}
        />
    );
}

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
        <section style={{ marginBottom: 24 }}>
            <Text fw={700} mb={4}>
                {t("arrivalTitle")}
            </Text>
            <Text size="xs" c="dimmed" mb="xs">
                {t("arrivalIntro")}
            </Text>
            <Group gap="xs" align="flex-start" wrap="wrap">
                <ClockField label={t("arrivalStart")} value={start} check={(s) => (end !== undefined && s >= end ? t("arrivalOrder") : null)} onCommit={(s) => setArrivalTime(routeId, "start", s)} />
                <Text mt={28}>〜</Text>
                <ClockField label={t("arrivalEnd")} value={end} check={(s) => (start !== undefined && s <= start ? t("arrivalOrder") : null)} onCommit={(s) => setArrivalTime(routeId, "end", s)} />
            </Group>
            {hours !== null && (
                <Text size="sm" mt="xs">
                    {t("arrivalSummary", { start: formatClock(start!), end: formatClock(end!), hours: fmt(hours), total: fmt(perHour * hours) })}
                </Text>
            )}
        </section>
    );
}

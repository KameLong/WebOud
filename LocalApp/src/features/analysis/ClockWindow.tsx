import { useState, type ReactNode } from "react";
import { Group, Text, TextInput } from "@mantine/core";
import { formatClock, parseClockInput } from "../../domain/time.ts";
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
    const problem = draft === null ? null : parsed === undefined ? t("clockInvalid") : parsed === null ? null : check(parsed);

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
 * 時間帯（開始〜終了の2つの時刻）の入力欄を、見出しと説明つきで表示します。
 *
 * @param props title:見出し / intro:説明 / startLabel・endLabel:欄の名前 / start・end:保存済みの時刻（秒） / onChange:保存する（which:start/end、seconds:秒。nullなら消す） / children:下に表示する内容（時間帯の長さなど）
 */
export function ClockWindow(props: {
    title: string;
    intro: string;
    startLabel: string;
    endLabel: string;
    start: number | undefined;
    end: number | undefined;
    onChange: (which: "start" | "end", seconds: number | null) => void;
    children?: ReactNode;
}) {
    const { title, intro, startLabel, endLabel, start, end, onChange, children } = props;
    const { t } = useT();
    return (
        <section style={{ marginBottom: 24 }}>
            <Text fw={700} mb={4}>
                {title}
            </Text>
            <Text size="xs" c="dimmed" mb="xs">
                {intro}
            </Text>
            <Group gap="xs" align="flex-start" wrap="wrap">
                <ClockField label={startLabel} value={start} check={(s) => (end !== undefined && s >= end ? t("clockOrder") : null)} onCommit={(s) => onChange("start", s)} />
                <Text mt={28}>〜</Text>
                <ClockField label={endLabel} value={end} check={(s) => (start !== undefined && s <= start ? t("clockOrder") : null)} onCommit={(s) => onChange("end", s)} />
            </Group>
            {children}
        </section>
    );
}

import { Text, Title } from "@mantine/core";
import type { CycleExample } from "./cycleExamples.ts";

/**
 * 1つの路線の例。路線の概要と、サイクルの中の種別ごとの発車時刻と、見どころを表示します。
 *
 * @param props example:路線の例 / cycle:サイクルの長さ（分）
 */
function ExampleCard({ example: e, cycle }: { example: CycleExample; cycle: number }) {
    return (
        <article style={{ border: `1px ${e.placeholder ? "dashed" : "solid"} #ccc`, borderRadius: 6, padding: "10px 12px", marginBottom: 12, background: "#fff" }}>
            <Text fw={700} size="sm">
                {e.line}
                <Text span size="xs" c="dimmed" ml={8}>
                    {e.operator}
                </Text>
            </Text>
            <Text size="xs" c="dimmed" mb={6}>
                {e.section}　{e.period}　代表駅：{e.station}
            </Text>
            <div style={{ overflowX: "auto" }}>
                <table className="pr-table">
                    <thead>
                        <tr>
                            <th>種別</th>
                            <th>停車駅</th>
                            <th>発車（{cycle}分サイクルの何分か）</th>
                        </tr>
                    </thead>
                    <tbody>
                        {e.trains.map((t) => (
                            <tr key={t.type}>
                                <td className="pr-nowrap" style={{ color: t.color, fontWeight: 600 }}>
                                    {t.type}
                                </td>
                                <td>{t.stops}</td>
                                <td className="pr-nowrap">{t.minutes.length > 0 ? t.minutes.join("・") : "−"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ul style={{ margin: "6px 0 0", paddingLeft: 20, fontSize: 13 }}>
                {e.notes.map((n) => (
                    <li key={n}>{n}</li>
                ))}
            </ul>
        </article>
    );
}

/**
 * パターンダイヤの例の一覧（サイクルの長さごと）。
 *
 * @param props cycle:サイクルの長さ（分） / examples:路線の例 / intro:このサイクルの説明
 */
export function CycleExamples({ cycle, examples, intro }: { cycle: number; examples: CycleExample[]; intro: string }) {
    return (
        <section style={{ marginBottom: 24 }}>
            <Title order={4} mb={4}>
                {cycle}分サイクルの例
            </Title>
            <Text size="sm" mb="xs">
                {intro}
            </Text>
            {examples.map((e, i) => (
                <ExampleCard key={`${e.line}-${i}`} example={e} cycle={cycle} />
            ))}
        </section>
    );
}

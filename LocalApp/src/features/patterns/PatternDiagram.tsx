import { Text } from "@mantine/core";
import { KIND_STYLE, type Kind, type PatternDiagramData } from "./patternData.ts";

const LEFT = 36;
const TOP = 24;
const ROW = 26;
const SCALE = 9;

/**
 * 説明用のダイヤグラム。横軸が時刻（分）、縦軸が駅（上から下へ A→G）。列車は折れ線で、駅で停まっている間は水平な線になります。
 *
 * @param props data:図のデータ
 */
export function PatternDiagram({ data }: { data: PatternDiagramData }) {
    const width = LEFT + data.minutes * SCALE + 12;
    const height = TOP + (data.stations.length - 1) * ROW + 16;
    const x = (m: number) => LEFT + m * SCALE;
    const y = (s: number) => TOP + s * ROW;
    const kinds = [...new Set(data.trains.map((t) => t.kind))] as Kind[];
    return (
        <figure style={{ margin: "8px 0 16px" }}>
            <div style={{ overflowX: "auto" }}>
                <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={data.caption} style={{ background: "#fff", border: "1px solid #ddd", display: "block" }}>
                    {Array.from({ length: data.minutes / 10 + 1 }, (_, i) => (
                        <g key={i}>
                            <line x1={x(i * 10)} x2={x(i * 10)} y1={TOP - 6} y2={height - 12} stroke="#ccc" strokeWidth={1} />
                            <text x={x(i * 10)} y={14} fontSize={11} textAnchor="middle" fill="#555">
                                {i * 10}分
                            </text>
                        </g>
                    ))}
                    {data.stations.map((s, i) => (
                        <g key={s}>
                            <line x1={LEFT} x2={x(data.minutes)} y1={y(i)} y2={y(i)} stroke="#bbb" strokeWidth={1} />
                            <text x={LEFT - 6} y={y(i) + 4} fontSize={12} textAnchor="end" fill="#222">
                                {s}
                            </text>
                        </g>
                    ))}
                    {data.trains.map((t, k) => {
                        const pts = t.stops.flatMap(([s, arr, dep]) => (dep !== undefined && dep !== arr ? [`${x(arr)},${y(s)}`, `${x(dep)},${y(s)}`] : [`${x(arr)},${y(s)}`]));
                        return <polyline key={k} points={pts.join(" ")} fill="none" stroke={KIND_STYLE[t.kind].color} strokeWidth={1.8} strokeLinejoin="round" />;
                    })}
                </svg>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "6px 0 2px" }}>
                {kinds.map((k) => (
                    <span key={k} style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 18, height: 0, borderTop: `2px solid ${KIND_STYLE[k].color}`, display: "inline-block" }} />
                        {KIND_STYLE[k].label}
                    </span>
                ))}
            </div>
            <Text component="figcaption" size="sm" c="dimmed">
                {data.caption}
            </Text>
        </figure>
    );
}

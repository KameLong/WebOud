import { useNavigate } from "react-router-dom";
import { Button, Container, List, Text, Title } from "@mantine/core";
import { PatternDiagram } from "./PatternDiagram.tsx";
import { CycleExamples } from "./CycleExamples.tsx";
import { EXAMPLES_10, EXAMPLES_15 } from "./cycleExamples.ts";
import { DIAGRAMS, type PatternDiagramData } from "./patternData.ts";

type Pattern = {
    title: string;
    summary: string;
    points: string[];
    diagram?: PatternDiagramData;
};

const PATTERNS: Pattern[] = [
    {
        title: "1. 等間隔ダイヤ（パターンダイヤ）",
        summary: "同じ種別の列車を、毎時同じ分に、一定の間隔で走らせるダイヤです。昼間の時間帯や、本数の少ない路線で広く使われます。",
        points: ["発車時刻が毎時同じなので、利用者が覚えやすい。", "車両や乗務員の運用が組みやすく、折り返し・行き違いも毎時同じパターンの繰り返しにできる。", "時間帯によって間隔を変えたいときは、10分・15分・20分など、60分を割り切れる間隔が選ばれやすい。"],
        diagram: DIAGRAMS.regular,
    },
    {
        title: "2. 速達列車と各駅停車の組み合わせ",
        summary: "急行などの速達列車と各駅停車を、決まった比率で組み合わせます。都市部の私鉄・JRで多く見られる形です。",
        points: ["停車駅の多い駅は各駅停車で、主要駅は速達列車でも、本数を確保する。", "速達列車どうし、各駅停車どうしの間隔をそろえると、等間隔ダイヤになる。", "速達列車と各駅停車の速度差が大きいほど、追いつかれないように間隔を空けたり、待避を設けたりする必要がある。"],
        diagram: DIAGRAMS.mixed,
    },
    {
        title: "3. 待避と緩急接続",
        summary: "各駅停車が途中駅で停まり、後から来る速達列車を先に通す（待避）ダイヤです。待避の間に乗り換えられるようにしたものを、緩急接続と呼びます。",
        points: ["待避駅には、本線のほかに待避用の線路（副本線）が必要になる。", "速達列車が停まる駅で待避を行うと、同じホームで乗り換えられる。", "待避させられる側の各駅停車は所要時間が延びるので、待避の回数と待ち時間が設計のポイントになる。"],
        diagram: DIAGRAMS.connect,
    },
    {
        title: "4. 区間運転（途中駅での折り返し）",
        summary: "混雑する区間だけを走る列車を追加して、全線を走る列車の間に入れるダイヤです。折り返し駅には、折り返し用の線路や、ホームの使い方の工夫が必要です。",
        points: ["都心側は本数を多く、郊外側は少なくする、といった本数の調整ができる。", "折り返し駅では、到着した列車が折り返して発車するまでの時間（折り返し時間）が必要。", "終点で折り返す列車と、途中駅で折り返す列車は、車両の運用でつながっている。"],
        diagram: DIAGRAMS.section,
    },
    {
        title: "5. 単線の行き違い（交換）",
        summary: "線路が1本の区間では、上りと下りの列車が出会う駅（交換駅）を決めて、そこで行き違います。",
        points: ["交換駅の位置と、列車が出会う時刻が、ダイヤの骨格になる。", "ローカル線は、毎時の同じ分に同じ駅で交換するパターンが多い。", "どちらかの列車が遅れると相手も待つので、遅れが広がりやすい。"],
        diagram: DIAGRAMS.single,
    },
    {
        title: "6. 時間帯ごとに変わるダイヤ",
        summary: "朝夕の通勤時間帯、昼間、夜間・深夜で、本数や種別の組み合わせを変えます。",
        points: ["朝夕のラッシュ時は、本数を増やし、間隔を詰めて、速達列車も多く走らせる。", "昼間は、本数を減らして等間隔にし、パターンを単純にする。", "深夜は、各駅停車だけにしたり、終電に向けて行き先を絞ったりする。", "時間帯が切り替わる前後は、車両や乗務員の運用をつなげるために、特別な列車が入ることがある。"],
    },
    {
        title: "7. 相互直通運転",
        summary: "ほかの会社や路線の線路へ列車が乗り入れて、1本の列車がいくつもの路線を続けて走ります。",
        points: ["乗り換えなしで遠くまで行けるが、1か所の遅れが直通する路線すべてに広がりやすい。", "直通する路線どうしで、種別名や停車駅、ダイヤの間隔を合わせる必要がある。", "このアプリでは、直通する先も含めて1つの路線として登録すると扱えます。"],
    },
    {
        title: "8. 特急・長距離列車のダイヤ",
        summary: "都市間を結ぶ特急は、毎時1本などの等間隔にすることもあれば、需要の多い時間帯に集中させることもあります。",
        points: ["地方の幹線では、毎時の同じ分に、特急が1本・2本走る形が見られる。", "普通列車との接続（特急の停車駅で乗り換えられること）が、全体のダイヤを決める。", "特急が各駅停車を追い抜くために、普通列車側で待避や時間調整が入る。"],
    },
];

/**
 * 日本のダイヤの代表的なパターンを、図つきで紹介するページです。ほかのページからのリンクは無く、URL（/patterns）を直接開いて見ます。
 * 説明用の例で、実在の路線や時刻とは関係がありません。
 */
export default function PatternsPage() {
    const nav = useNavigate();
    return (
        <div style={{ height: "100%", overflow: "auto" }}>
            <Container size="md" py="md" px="sm">
                <Button variant="default" size="compact-sm" onClick={() => nav("/")} mb="md">
                    ← 路線一覧へ
                </Button>
                <Title order={2} mb="xs">
                    ダイヤのパターン例（日本）
                </Title>
                <Text size="sm" mb="md">
                    日本の鉄道でよく見られる、ダイヤの組み立て方の例です。図は、横軸が時刻（分）、縦軸が駅のダイヤグラムで、列車が右へ進むほど時刻が進みます。駅で停まっている間は、線が水平になります。
                    すべて説明用の例で、実在の路線や時刻とは関係がありません。
                </Text>
                {PATTERNS.map((p) => (
                    <section key={p.title} style={{ marginBottom: 28 }}>
                        <Title order={3} size="h4" mb={4}>
                            {p.title}
                        </Title>
                        <Text size="sm" mb="xs">
                            {p.summary}
                        </Text>
                        {p.diagram && <PatternDiagram data={p.diagram} />}
                        <List size="sm" spacing={4}>
                            {p.points.map((t) => (
                                <List.Item key={t}>{t}</List.Item>
                            ))}
                        </List>
                    </section>
                ))}
                <Title order={3} size="h4" mt="xl" mb={4}>
                    パターンダイヤの例（全国の路線）
                </Title>
                <Text size="sm" mb="md">
                    毎時同じ分に同じ列車が来る「パターンダイヤ」を、全国の路線から紹介します。1サイクル（15分、10分）の中に、どの種別の列車が何分に来るかを示します。
                </Text>
                <CycleExamples cycle={15} examples={EXAMPLES_15} intro="15分ごとに同じパターンを繰り返すダイヤです。1時間に4回、同じ分に同じ種別が来ます。" />
                <CycleExamples cycle={10} examples={EXAMPLES_10} intro="10分ごとに同じパターンを繰り返すダイヤです。1時間に6回、同じ分に同じ種別が来ます。" />
            </Container>
        </div>
    );
}

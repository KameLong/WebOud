/** 列車の種類（図の線の色と凡例） */
export type Kind = "local" | "express" | "short";

export const KIND_STYLE: Record<Kind, { label: string; color: string }> = {
    local: { label: "各駅停車", color: "#3a3a3a" },
    express: { label: "急行", color: "#d32f2f" },
    short: { label: "区間運転（途中駅で折り返し）", color: "#1976d2" },
};

/** 停車の点：[駅の位置, 到着（分）, 出発（分。省略すると到着と同じ）] */
export type Stop = [station: number, arr: number, dep?: number];

export type DiagramTrain = { kind: Kind; stops: Stop[] };

export type PatternDiagramData = {
    stations: string[];
    /** 横軸の長さ（分） */
    minutes: number;
    trains: DiagramTrain[];
    /** 図の下に書く説明 */
    caption: string;
};

const STATIONS = ["A", "B", "C", "D", "E", "F", "G"];

/**
 * 各駅停車（A→G。1駅間4分）の停車の点を作る。
 *
 * @param t0 始発駅を出発する時刻（分）
 * @param up trueなら上り（G→A）
 */
function local(t0: number, up = false): DiagramTrain {
    return { kind: "local", stops: STATIONS.map((_, i): Stop => [up ? 6 - i : i, t0 + 4 * i]) };
}

/**
 * 急行（A・D・Gだけに停車。A→Dは8分）の停車の点を作る。
 *
 * @param t0 始発駅を出発する時刻（分）
 * @param up trueなら上り（G→A）
 */
function express(t0: number, up = false): DiagramTrain {
    const s = up ? [6, 3, 0] : [0, 3, 6];
    return { kind: "express", stops: s.map((st, i): Stop => [st, t0 + 8 * i]) };
}

export const DIAGRAMS = {
    /** 等間隔ダイヤ：各駅停車だけが10分ごと */
    regular: {
        stations: STATIONS,
        minutes: 60,
        trains: [0, 10, 20, 30, 40].map((t) => local(t)).concat([5, 15, 25, 35, 45].map((t) => local(t, true))),
        caption: "各駅停車が下り・上りとも10分ごと。毎時の同じ分に同じ列車が来ます。",
    },
    /** 優等列車と各駅停車が交互 */
    mixed: {
        stations: STATIONS,
        minutes: 60,
        trains: [express(0), express(20), express(40), local(10), local(30), local(50), express(5, true), express(25, true), express(45, true), local(15, true), local(35, true)],
        caption: "急行（A・D・Gに停車）と各駅停車が、それぞれ20分ごとに交互に走ります。駅Aでは10分ごとに列車があり、急行の通過する駅でも各駅停車が20分ごとに来ます。",
    },
    /** 緩急接続：Dで各駅停車が急行を待避する */
    connect: {
        stations: STATIONS,
        minutes: 60,
        trains: [
            { kind: "local", stops: [[0, 0], [1, 4], [2, 8], [3, 12, 20], [4, 24], [5, 28], [6, 32]] },
            { kind: "local", stops: [[0, 20], [1, 24], [2, 28], [3, 32, 40], [4, 44], [5, 48], [6, 52]] },
            { kind: "local", stops: [[0, 40], [1, 44], [2, 48], [3, 52, 60]] },
            { kind: "express", stops: [[0, 8], [3, 16, 18], [6, 26]] },
            { kind: "express", stops: [[0, 28], [3, 36, 38], [6, 46]] },
            { kind: "express", stops: [[0, 48], [3, 56, 58]] },
        ],
        caption: "各駅停車（黒）が駅Dで停まって急行（赤）を先に通します。急行がDで停まっている間は同じホームで乗り換えられるので、急行に乗り換えるとGまで6分早く着けます。",
    },
    /** 区間運転 */
    section: {
        stations: STATIONS,
        minutes: 60,
        trains: [
            local(0),
            local(20),
            local(40),
            local(10, true),
            local(30, true),
            local(50, true),
            { kind: "short", stops: [[0, 10], [1, 14], [2, 18], [3, 22, 26], [2, 30], [1, 34], [0, 38]] },
            { kind: "short", stops: [[0, 30], [1, 34], [2, 38], [3, 42, 46], [2, 50], [1, 54], [0, 58]] },
        ],
        caption: "全区間を走る列車（黒）が20分ごと。混む区間A〜Dには、Dで折り返す区間運転の列車（青）を間に入れ、A〜Dでは10分ごとの本数にしています。",
    },
    /** 単線の行き違い */
    single: {
        stations: STATIONS,
        minutes: 60,
        trains: [
            { kind: "local", stops: [[0, 0], [1, 4], [2, 8], [3, 12, 14], [4, 18], [5, 22], [6, 26]] },
            { kind: "local", stops: [[6, 0], [5, 4], [4, 8], [3, 12, 14], [2, 18], [1, 22], [0, 26]] },
            { kind: "local", stops: [[0, 30], [1, 34], [2, 38], [3, 42, 44], [4, 48], [5, 52], [6, 56]] },
            { kind: "local", stops: [[6, 30], [5, 34], [4, 38], [3, 42, 44], [2, 48], [1, 52], [0, 56]] },
        ],
        caption: "線路が1本の単線では、駅Dで上りと下りの列車が出会い、行き違い（交換）をします。どちらかが遅れると、相手も待つことになります。",
    },
} satisfies Record<string, PatternDiagramData>;

/** 三角表を埋める計算の結果 */
export type TriangleFill = {
    /** fill[o][s]：走行順で o 番目の駅から乗って、s 番目の駅で降りる人数（o < s） */
    fill: number[][];
    /** 降りる人数が、その時点で乗っている人数を超えた駅（走行順の位置・降りる人数・乗っている人数）。超えた分は降りないものとして扱う */
    shortages: { index: number; alighting: number; onboard: number }[];
    /** 各駅で降りる前に、乗っている人数 */
    onboardBefore: number[];
    /** 最後の駅まで降りる駅が決まらなかった人数（乗る人数の合計が、降りる人数の合計より多いとき） */
    leftover: number;
};

/**
 * 各駅の乗車数と下車数から、駅間の利用客数の三角表を埋めます（1方向分）。
 * 駅を走行順に見ていき、各駅で降りる人は、その時点で乗っている人（乗った駅ごとの人数）に比例して、発駅に割り振ります。
 * そのあと、その駅で乗る人が、その駅を発駅として乗ってきます。
 *
 * @param boardings 走行順の各駅で乗る人数
 * @param alightings 走行順の各駅で降りる人数（同じ長さ）
 */
export function fillTriangle(boardings: number[], alightings: number[]): TriangleFill {
    const m = boardings.length;
    const fill = boardings.map(() => new Array<number>(m).fill(0));
    const shortages: TriangleFill["shortages"] = [];
    const onboardBefore: number[] = [];
    // 今乗っている人の、乗った駅ごとの人数
    const onboard = new Array<number>(m).fill(0);
    for (let k = 0; k < m; k++) {
        const total = onboard.reduce((a, b) => a + b, 0);
        onboardBefore.push(total);
        const want = alightings[k] ?? 0;
        if (want > total + 1e-9) shortages.push({ index: k, alighting: want, onboard: total });
        const take = Math.min(want, total);
        if (take > 0) {
            for (let o = 0; o < k; o++) {
                const out = (onboard[o] * take) / total;
                fill[o][k] = out;
                onboard[o] -= out;
            }
        }
        onboard[k] += boardings[k] ?? 0;
    }
    return { fill, shortages, onboardBefore, leftover: onboard.reduce((a, b) => a + b, 0) };
}

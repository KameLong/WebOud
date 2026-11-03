/**
 * パターンダイヤ（毎時同じ分に同じ列車が来るダイヤ）の例を、全国の路線から紹介するための、データの雛形。
 * 15分サイクル・10分サイクルのそれぞれに、路線ごとの例を足していく。
 *
 * 例を足すときは、下の EXAMPLES_15 / EXAMPLES_10 の配列に、CycleExample を1つ足す。
 * 内容は、時刻表などで確かめたものだけを書く（確かめられない項目は省略する）。
 */

/** 1つのサイクルの中の、1つの種別の列車 */
export type CycleTrain = {
    /** 種別名（例：快速、普通） */
    type: string;
    /** 種別の色（省略すると黒） */
    color?: string;
    /** 停車駅のパターンの説明（例：主要駅のみ停車） */
    stops: string;
    /** サイクルの中での、代表駅の発車時刻（分。例：15分サイクルなら 0〜14 の値） */
    minutes: number[];
};

export type CycleExample = {
    /** 路線名 */
    line: string;
    /** 事業者 */
    operator: string;
    /** 紹介する区間 */
    section: string;
    /** 代表駅（この駅の発車時刻を minutes に書く） */
    station: string;
    /** パターンダイヤになっている時間帯（例：昼間時） */
    period: string;
    /** サイクルの中の、種別ごとの列車（本数・時刻） */
    trains: CycleTrain[];
    /** この例の見どころ（種別の組み合わせ、待避・接続、直通など） */
    notes: string[];
    /** 雛形の表示用。実際の例を書くときは付けない */
    placeholder?: true;
};

/** 雛形の表示用の例（実在の路線ではない）。実際の例を足したら、これは消してよい */
const TEMPLATE: CycleExample = {
    placeholder: true,
    line: "（路線名）",
    operator: "（事業者）",
    section: "（A駅〜B駅）",
    station: "（代表駅）",
    period: "（昼間時など）",
    trains: [
        { type: "（種別1）", stops: "（停車駅のパターン）", minutes: [] },
        { type: "（種別2）", stops: "（停車駅のパターン）", minutes: [] },
    ],
    notes: ["（見どころ）"],
};

/** 15分サイクルのダイヤの例 */
export const EXAMPLES_15: CycleExample[] = [TEMPLATE];

/** 10分サイクルのダイヤの例 */
export const EXAMPLES_10: CycleExample[] = [TEMPLATE];

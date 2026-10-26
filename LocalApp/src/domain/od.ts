/**
 * 駅間の利用客数（OD表：発駅×着駅の、1時間あたりの人数）。値は、「発駅のID-着駅のID」をキーにして持つ。
 * 値が無い（入力されていない）組は、キーごと持たない。
 */
export type OdTable = Record<string, number>;

/**
 * 発駅と着駅の組のキー。
 *
 * @param fromId 発駅のID
 * @param toId 着駅のID
 */
export function odKey(fromId: number, toId: number): string {
    return `${fromId}-${toId}`;
}

/**
 * 入力された文字を、人数にします。全角の数字・カンマ付きも読めます。
 *
 * @param text 入力された文字
 * @returns 人数（0以上）。空欄なら null（値なし）、人数として読めなければ undefined
 */
export function parseOdInput(text: string): number | null | undefined {
    const s = text.normalize("NFKC").trim().replace(/,/g, "");
    if (s === "") return null;
    if (!/^\d+(\.\d+)?$/.test(s)) return undefined;
    return Number(s);
}

/**
 * 表計算ソフトなどからコピーした文字（タブ区切り・改行区切り）を、行×列の文字の表にします。
 *
 * @param text コピーした文字
 */
export function parsePastedGrid(text: string): string[][] {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    return lines.map((l) => l.split("\t"));
}

/**
 * 駅ごとの合計（発駅ごとの合計と、着駅ごとの合計）を求めます。
 *
 * @param od OD表
 * @param stationIds 駅のID（表の並び順）
 */
export function odTotals(od: OdTable, stationIds: number[]): { fromTotals: number[]; toTotals: number[]; grand: number } {
    const fromTotals = stationIds.map(() => 0);
    const toTotals = stationIds.map(() => 0);
    let grand = 0;
    stationIds.forEach((from, r) => {
        stationIds.forEach((to, c) => {
            const v = od[odKey(from, to)];
            if (v === undefined || from === to) return;
            fromTotals[r] += v;
            toTotals[c] += v;
            grand += v;
        });
    });
    return { fromTotals, toTotals, grand };
}

/**
 * 入力補助に、Excelなどからコピーした表（駅ごとの行・乗車数と下車数の列）を貼り付けたときの文字を、行ごとの文字の並びにします。
 * 行の先頭にある、人数として読めない文字（駅名）は取り除き、すべて文字の行（見出し）は読み飛ばします。
 *
 * @param text コピーした文字（タブ区切り・改行区切り）
 * @returns 駅ごとの行（各行は、乗車数・下車数の順の文字。人数が空欄のところは空文字）
 */
export function parseAssistGrid(text: string): string[][] {
    const out: string[][] = [];
    for (const cells of parsePastedGrid(text)) {
        let row = cells.map((x) => x.trim());
        while (row.length > 0 && row[0] !== "" && parseOdInput(row[0]) === undefined) row = row.slice(1);
        if (row.length === 0 && cells.some((x) => x.trim() !== "")) continue;
        out.push(row);
    }
    return out;
}

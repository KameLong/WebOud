import { useMemo, useState } from "react";
import { Alert, Button, Group, Modal, Stack, Tabs, Text, TextInput } from "@mantine/core";
import { odKey, parseOdInput, type OdTable } from "../../domain/od.ts";
import { fillTriangle } from "../../domain/odFill.ts";
import type { StationDto } from "../../domain/dto.ts";
import { useCommonT } from "../../shared/i18n/common.ts";
import { setOdValues } from "../../store/timetableApi.ts";
import { useT } from "./messages.ts";

/**
 * 人数を、小数2桁までで表示します。
 *
 * @param n 人数
 */
function fmt(n: number): string {
    return String(Math.round(n * 100) / 100);
}

/**
 * 1方向分の入力。各駅で乗る人数と降りる人数を入れると、三角表を埋めた結果が計算されます。
 * 入力欄の初めの値は、いまの利用客数の表から、駅ごとの乗る人数・降りる人数を求めたものです。
 *
 * @param props routeId:路線ID / direct:0:下り 1:上り / stations:その方向の走行順の駅 / od:いまの利用客数 / onDone:反映したあとの処理
 */
function DirectionPanel({ routeId, direct, stations, od, onDone }: { routeId: number; direct: 0 | 1; stations: StationDto[]; od: OdTable | undefined; onDone: () => void }) {
    const { t } = useT();
    const cm = useCommonT().t;
    const m = stations.length;

    // 初めの値：いまの表から、乗る人数（発駅の合計）と降りる人数（着駅の合計）を求める
    const initial = useMemo(() => {
        const board = stations.map((from, o) => stations.reduce((sum, to, s) => sum + (s > o ? (od?.[odKey(from.id, to.id)] ?? 0) : 0), 0));
        const alight = stations.map((to, s) => stations.reduce((sum, from, o) => sum + (o < s ? (od?.[odKey(from.id, to.id)] ?? 0) : 0), 0));
        const str = (n: number) => (n > 0 ? fmt(n) : "");
        return { board: board.map(str), alight: alight.map(str) };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [board, setBoard] = useState<string[]>(initial.board);
    const [alight, setAlight] = useState<string[]>(initial.alight);

    const parsed = useMemo(() => {
        const read = (strs: string[], skip: number) => strs.map((x, k) => (k === skip ? 0 : parseOdInput(x)));
        return { board: read(board, m - 1), alight: read(alight, 0) };
    }, [board, alight, m]);
    const invalid = parsed.board.some((v) => v === undefined) || parsed.alight.some((v) => v === undefined);
    const nums = (a: (number | null | undefined)[]) => a.map((v) => v ?? 0);
    const result = useMemo(() => fillTriangle(nums(parsed.board), nums(parsed.alight)), [parsed]);
    const totalBoard = nums(parsed.board).reduce((a, b) => a + b, 0);
    const totalAlight = nums(parsed.alight).reduce((a, b) => a + b, 0);

    /** 計算した三角表を、利用客数の表に反映する（この方向の三角形の中だけ書き換える） */
    function apply() {
        if (invalid) return;
        const changes: { from: number; to: number; value: number | null }[] = [];
        let hasExisting = false;
        for (let o = 0; o < m; o++) {
            for (let s = o + 1; s < m; s++) {
                if ((od?.[odKey(stations[o].id, stations[s].id)] ?? 0) > 0) hasExisting = true;
                const v = Math.round(result.fill[o][s] * 100) / 100;
                changes.push({ from: stations[o].id, to: stations[s].id, value: v > 0 ? v : null });
            }
        }
        if (hasExisting && !confirm(t("assistOverwrite", { direction: cm(direct === 1 ? "up" : "down") }))) return;
        setOdValues(routeId, changes);
        onDone();
    }

    return (
        <Stack gap="xs" mt="xs">
            <Text size="xs" c="dimmed">
                {t("assistIntro")}
            </Text>
            <div className="od-assist-scroll">
                <table className="od-assist-table">
                    <thead>
                        <tr>
                            <th>{cm("station")}</th>
                            <th>{t("assistBoard")}</th>
                            <th>{t("assistAlight")}</th>
                            <th>{t("assistOnboard")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stations.map((s, k) => (
                            <tr key={s.id}>
                                <th>{s.name}</th>
                                <td>
                                    <TextInput
                                        size="xs"
                                        value={k === m - 1 ? "" : board[k]}
                                        disabled={k === m - 1}
                                        error={parsed.board[k] === undefined}
                                        inputMode="decimal"
                                        aria-label={`${s.name} ${t("assistBoard")}`}
                                        onChange={(e) => {
                                            const v = e.currentTarget.value;
                                            setBoard((prev) => prev.map((x, i) => (i === k ? v : x)));
                                        }}
                                    />
                                </td>
                                <td>
                                    <TextInput
                                        size="xs"
                                        value={k === 0 ? "" : alight[k]}
                                        disabled={k === 0}
                                        error={parsed.alight[k] === undefined}
                                        inputMode="decimal"
                                        aria-label={`${s.name} ${t("assistAlight")}`}
                                        onChange={(e) => {
                                            const v = e.currentTarget.value;
                                            setAlight((prev) => prev.map((x, i) => (i === k ? v : x)));
                                        }}
                                    />
                                </td>
                                <td className="od-assist-num">{fmt(result.onboardBefore[k])}</td>
                            </tr>
                        ))}
                        <tr className="od-assist-total">
                            <th>{t("total")}</th>
                            <td className="od-assist-num">{fmt(totalBoard)}</td>
                            <td className="od-assist-num">{fmt(totalAlight)}</td>
                            <td />
                        </tr>
                    </tbody>
                </table>
            </div>
            {invalid && (
                <Alert color="red" p="xs">
                    {t("assistInvalid")}
                </Alert>
            )}
            {result.shortages.map((x) => (
                <Alert key={x.index} color="yellow" p="xs">
                    {t("assistShortage", { station: stations[x.index].name, alight: fmt(x.alighting), onboard: fmt(x.onboard) })}
                </Alert>
            ))}
            {result.leftover > 0.005 && (
                <Alert color="yellow" p="xs">
                    {t("assistLeftover", { n: fmt(result.leftover) })}
                </Alert>
            )}
            <Group justify="flex-end">
                <Button onClick={apply} disabled={invalid || totalBoard === 0}>
                    {t("assistApply", { direction: cm(direct === 1 ? "up" : "down") })}
                </Button>
            </Group>
        </Stack>
    );
}

/**
 * 駅間の利用客数の三角表の、入力補助のダイアログです。下り・上りそれぞれについて、各駅で乗る人数と降りる人数を入れると、
 * 「各駅で降りる人の発駅の割合は、その時点で乗っている人数に比例する」として、三角表を埋めます。
 *
 * @param props open:表示中か / onClose:閉じる / routeId:路線ID / stations:路線の全駅 / od:いまの利用客数
 */
export function OdAssistDialog(props: { open: boolean; onClose: () => void; routeId: number; stations: StationDto[]; od: OdTable | undefined }) {
    const { open, onClose, routeId, stations, od } = props;
    const { t } = useT();
    const cm = useCommonT().t;
    if (!open) return null;
    const down = [...stations].sort((a, b) => a.index - b.index);
    const up = [...down].reverse();
    return (
        <Modal opened onClose={onClose} title={t("assistTitle")} centered size="lg" styles={{ title: { fontWeight: 700 } }}>
            <Tabs defaultValue="down" keepMounted>
                <Tabs.List>
                    <Tabs.Tab value="down">{cm("down")}</Tabs.Tab>
                    <Tabs.Tab value="up">{cm("up")}</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="down">
                    <DirectionPanel routeId={routeId} direct={0} stations={down} od={od} onDone={onClose} />
                </Tabs.Panel>
                <Tabs.Panel value="up">
                    <DirectionPanel routeId={routeId} direct={1} stations={up} od={od} onDone={onClose} />
                </Tabs.Panel>
            </Tabs>
        </Modal>
    );
}

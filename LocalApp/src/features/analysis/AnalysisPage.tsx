import { useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Container, Group, Text, Title } from "@mantine/core";
import { odKey, odTotals, parsePastedGrid, parseOdInput } from "../../domain/od.ts";
import { getRoute, subscribe } from "../../store/localStore.ts";
import { setOdValues } from "../../store/timetableApi.ts";
import { HelpDialog, HelpSection, HelpShortcutTable, HelpList } from "../../shared/ui/HelpDialog.tsx";
import { helpButtonStyle } from "../../shared/ui/helpButtonStyle.ts";
import { ArrivalWindow } from "./ArrivalWindow.tsx";
import { TargetWindow } from "./TargetWindow.tsx";
import { AnalysisResult } from "./AnalysisResult.tsx";
import { OdAssistDialog } from "./OdAssistDialog.tsx";
import { OdCell } from "./OdCell.tsx";
import { useT } from "./messages.ts";

/**
 * 路線の解析ページ。まず、駅間の利用客数（1時間あたりの人数）を入力する「発駅×着駅」の表を用意している。
 * 表は、路線の駅の並び順（下りの順）で、右上が下り、左下が上りの利用客になる。
 */
export function AnalysisPage() {
    const params = useParams<{ routeId: string }>();
    const routeId = Number(params.routeId ?? 0);
    const nav = useNavigate();
    const { t, tl, table } = useT();
    const route = useSyncExternalStore(subscribe, () => getRoute(routeId));
    const [helpOpen, setHelpOpen] = useState(false);
    const [assistOpen, setAssistOpen] = useState(false);
    const tableRef = useRef<HTMLTableElement | null>(null);

    const stations = useMemo(() => [...(route?.stations ?? [])].sort((a, b) => a.index - b.index), [route?.stations]);
    const od = route?.od;
    const totals = useMemo(
        () =>
            odTotals(
                od ?? {},
                stations.map((s) => s.id),
            ),
        [od, stations],
    );

    // 行のコールバックを安定させる（マスが多いので、React.memoを効かせる）
    const stationsRef = useRef(stations);
    useLayoutEffect(() => {
        stationsRef.current = stations;
    });

    const commit = useCallback((from: number, to: number, value: number | null) => setOdValues(routeId, [{ from, to, value }]), [routeId]);

    /**
     * 表計算ソフトなどからコピーした範囲を、指定のマスから貼り付ける（対角のマスと、表の外は飛ばす）。
     *
     * @param row 貼り付けを始める行
     * @param col 貼り付けを始める列
     * @param text コピーした文字
     */
    const paste = useCallback(
        (row: number, col: number, text: string) => {
            const list = stationsRef.current;
            const changes: { from: number; to: number; value: number | null }[] = [];
            parsePastedGrid(text).forEach((cells, i) =>
                cells.forEach((cell, j) => {
                    const r = row + i;
                    const c = col + j;
                    if (r >= list.length || c >= list.length || r === c) return;
                    const value = parseOdInput(cell);
                    if (value !== undefined) changes.push({ from: list[r].id, to: list[c].id, value });
                }),
            );
            setOdValues(routeId, changes);
        },
        [routeId],
    );

    /**
     * 指定のマスへフォーカスを移します。同じ向きに進みながら、対角のマスは飛ばします。
     *
     * @param row 移動元の行
     * @param col 移動元の列
     * @param dr 行の進む向き
     * @param dc 列の進む向き
     */
    const move = useCallback((row: number, col: number, dr: number, dc: number) => {
        const n = stationsRef.current.length;
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < n && c >= 0 && c < n) {
            if (r !== c) {
                tableRef.current?.querySelector<HTMLInputElement>(`input[data-od="${r},${c}"]`)?.focus();
                return;
            }
            r += dr;
            c += dc;
        }
    }, []);

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
            const input = e.currentTarget;
            // 日本語入力の変換中は、Enterや矢印キーで移動しない
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === "ArrowUp" || (e.key === "Enter" && e.shiftKey)) {
                e.preventDefault();
                move(row, col, -1, 0);
            } else if (e.key === "ArrowDown" || e.key === "Enter") {
                e.preventDefault();
                move(row, col, 1, 0);
            } else if (e.key === "ArrowLeft" && input.selectionStart === 0 && input.selectionEnd === 0) {
                e.preventDefault();
                move(row, col, 0, -1);
            } else if (e.key === "ArrowRight" && input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
                e.preventDefault();
                move(row, col, 0, 1);
            }
        },
        [move],
    );

    if (!route) {
        return (
            <Container size="md" py="md">
                {t("routeNotFound")}
                <Button variant="default" size="compact-sm" ml="xs" onClick={() => nav("/")}>
                    {t("backToList")}
                </Button>
            </Container>
        );
    }

    /** 入力した利用客数を、確認のうえ、すべて消す */
    function clearAll() {
        if (!od || Object.keys(od).length === 0) return;
        if (!confirm(t("confirmClear"))) return;
        setOdValues(
            routeId,
            Object.keys(od).map((k) => {
                const [from, to] = k.split("-").map(Number);
                return { from, to, value: null };
            }),
        );
    }

    const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

    return (
        <Container size="xl" py="md" px="sm" style={{ height: "100%", overflow: "auto" }}>
            <Group justify="space-between" mb="xs" wrap="nowrap">
                <Button variant="default" size="compact-sm" onClick={() => nav(`/route/${routeId}`)}>
                    {t("backToEdit")}
                </Button>
                <button onClick={() => setHelpOpen(true)} style={helpButtonStyle} title={t("help")}>
                    ？
                </button>
            </Group>
            <Title order={2}>{t("title")}</Title>
            <Text size="sm" c="dimmed" mb="md">
                {route.name}
            </Text>

            <ArrivalWindow routeId={routeId} arrival={route.arrival} perHour={totals.grand} />
            <TargetWindow route={route} />

            <Group justify="space-between" align="flex-end" mb={4}>
                <Title order={4}>{t("odTitle")}</Title>
                <Group gap={6}>
                    <Button variant="default" size="compact-xs" onClick={() => setAssistOpen(true)} disabled={stations.length < 2}>
                        {t("assistButton")}
                    </Button>
                    <Button variant="default" color="red" c="red" size="compact-xs" onClick={clearAll} disabled={!od || Object.keys(od).length === 0}>
                        {t("clearAll")}
                    </Button>
                </Group>
            </Group>
            <Text size="xs" c="dimmed" mb={4}>
                {t("odIntro")}
            </Text>
            <Text size="xs" c="dimmed" mb="xs">
                {t("odUnit")}
            </Text>

            {stations.length < 2 ? (
                <Text size="sm" c="red">
                    {t("noStations")}
                </Text>
            ) : (
                <div className="od-scroll">
                    <table className="od-table" ref={tableRef}>
                        <thead>
                            <tr>
                                <th className="od-corner">{t("corner")}</th>
                                {stations.map((to) => (
                                    <th key={to.id} className="od-col-head" title={to.name}>
                                        <span>{to.name}</span>
                                    </th>
                                ))}
                                <th className="od-total-head">{t("total")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stations.map((from, r) => (
                                <tr key={from.id}>
                                    <th className="od-row-head" title={from.name}>
                                        {from.name}
                                    </th>
                                    {stations.map((to, c) =>
                                        r === c ? (
                                            <td key={to.id} className="od-diagonal" />
                                        ) : (
                                            <td key={to.id} className={r < c ? "od-down" : "od-up"}>
                                                <OdCell
                                                    from={from.id}
                                                    to={to.id}
                                                    row={r}
                                                    col={c}
                                                    value={od?.[odKey(from.id, to.id)]}
                                                    label={t("cellLabel", { from: from.name, to: to.name })}
                                                    onCommit={commit}
                                                    onPaste={paste}
                                                    onKeyDown={onKeyDown}
                                                />
                                            </td>
                                        ),
                                    )}
                                    <td className="od-total">{fmt(totals.fromTotals[r])}</td>
                                </tr>
                            ))}
                            <tr>
                                <th className="od-row-head od-total-row">{t("total")}</th>
                                {stations.map((to, c) => (
                                    <td key={to.id} className="od-total od-total-row">
                                        {fmt(totals.toTotals[c])}
                                    </td>
                                ))}
                                <td className="od-total od-total-row">{fmt(totals.grand)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            <AnalysisResult route={route} />

            <OdAssistDialog open={assistOpen} onClose={() => setAssistOpen(false)} routeId={routeId} stations={route.stations} od={od} />
            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title={t("helpTitle")}>
                <HelpSection title={t("helpDoSection")}>
                    <HelpList items={tl("helpDoItems")} />
                </HelpSection>
                <HelpSection title={t("helpKeysSection")}>
                    <HelpShortcutTable rows={table("helpKeys")} />
                </HelpSection>
            </HelpDialog>
        </Container>
    );
}

export default AnalysisPage;

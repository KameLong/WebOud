import StationListPage from "./StationListPage.tsx";
import { useNavigate, useParams } from "react-router-dom";
import TrainTypeListPage from "./TrainTypeListPage.tsx";
import { useState, useSyncExternalStore } from "react";
import { getRoute, renameRoute, subscribe } from "../store/localStore.ts";
import { ActionIcon, Box, Button, Container, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { HelpDialog, HelpList, HelpSection, HelpShortcutTable } from "../components/HelpDialog.tsx";

export function RoutePage() {
    const urlParams = useParams<{ routeId: string }>();
    const routeId: number = Number(urlParams.routeId);
    const nav = useNavigate();
    const [helpOpen, setHelpOpen] = useState(false);

    const route = useSyncExternalStore(subscribe, () => getRoute(routeId));

    if (!route) {
        return (
            <Container size="md" py="md">
                路線が見つかりません。
                <Button variant="default" size="compact-sm" ml="xs" onClick={() => nav("/")}>
                    路線一覧へ戻る
                </Button>
            </Container>
        );
    }

    return (
        <Box style={{ overflow: "auto", height: "100%" }}>
            <Container size="md" pt="md" pb={72} px="sm">
                <Stack gap="lg">
                    <div>
                        <Group justify="space-between" wrap="nowrap" mb="xs">
                            <Button variant="default" size="compact-sm" onClick={() => nav("/")}>
                                ← 路線一覧へ
                            </Button>
                            <ActionIcon variant="light" radius="xl" onClick={() => setHelpOpen(true)} aria-label="ヘルプ" title="ヘルプ">
                                ？
                            </ActionIcon>
                        </Group>
                        <TextInput
                            value={route.name}
                            onChange={(e) => renameRoute(routeId, e.currentTarget.value)}
                            aria-label="路線名"
                            variant="unstyled"
                            styles={{ input: { fontSize: "1.5rem", fontWeight: 700, height: "auto", paddingInline: 4 } }}
                        />
                    </div>

                    <section>
                        <Title order={3} mb="xs">
                            駅編集
                        </Title>
                        <StationListPage routeId={routeId} />
                    </section>

                    <section>
                        <Title order={3} mb="xs">
                            種別編集
                        </Title>
                        <TrainTypeListPage routeId={routeId} />
                    </section>
                </Stack>
            </Container>

            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title="路線編集 - ヘルプ">
                <HelpSection title="このページでできること">
                    <HelpList
                        items={[
                            "路線名・駅名・種別名を変更する（その場の入力欄を直接編集）",
                            "駅の追加・挿入・削除・コピー＆貼り付け、着/番線/発の表示設定（下り・上り別）の変更",
                            "列車種別の追加・削除・コピー＆貼り付け、略称・色（丸い見本をクリックしてカラーピッカーで選択）・太字・線太・線種の設定",
                            "左のメニュー（スマホでは下部のメニューボタン）から、時刻表・ダイヤグラムの画面へ移動する",
                        ]}
                    />
                </HelpSection>
                <HelpSection title="駅一覧・列車種別一覧の操作">
                    <Text size="sm" c="dimmed" mb="xs">
                        一番下の緑色の行に名前を入力してEnterを押すと、一覧の末尾に新しい行が追加されます（追加すると入力欄は空に戻ります）。各行の左端の○をタップ（クリック）すると、その行を選択・解除できます。各行の右側のゴミ箱ボタンでその行を削除でき、駅と駅の間の「＋」ボタンでその位置に駅を挿入できます（「＋」は駅のみ。挿入する駅の名前は、緑色の行の入力欄に先に入力しておきます。空のままでは挿入できず、警告が表示されます）。駅名は空にできません。選択した行は、一覧上部の操作バー（全選択・コピー・貼り付け・削除・解除）でまとめて操作できます。
                    </Text>
                    <HelpShortcutTable
                        rows={[
                            ["○をクリック", "行の選択を切り替え（複数選択可）"],
                            ["Shift+○をクリック", "起点の行から範囲選択"],
                            ["入力欄で Esc", "選択モードに戻る（その行を選択）"],
                            ["↑ / ↓", "選択モード：選択行を1つ上/下に移動"],
                            ["Shift+↑ / Shift+↓", "選択モード：選択範囲を拡張"],
                            ["Space", "選択モード：カーソル行の選択を切り替え"],
                            ["Enter / F2 / 文字キー", "選択モード：カーソル行の名前の編集を開始"],
                            ["Ctrl+A", "選択モード：すべて選択"],
                            ["Ctrl+C / Ctrl+V", "選択モード：選択行をコピー / 貼り付け"],
                            ["Ctrl+Insert", "選択モード：カーソル位置の手前に行を1件挿入（駅は緑色の行に入力した名前で挿入。種別は空の行）"],
                            ["Delete / Backspace", "選択モード：選択行を削除（確認あり）"],
                            ["Esc", "選択モード：選択を解除"],
                        ]}
                    />
                </HelpSection>
                <HelpSection title="保存について">
                    <Text size="sm" c="dimmed">
                        駅名・種別名・チェックボックスなど、すべての変更は入力と同時に自動で保存されます（保存ボタンはありません）。
                    </Text>
                </HelpSection>
            </HelpDialog>
        </Box>
    );
}

import React, { useRef, useState, useSyncExternalStore } from "react";
import { ActionIcon, Alert, Button, FileButton, Group, Menu, Table, Text, TextInput, Title, Container } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
    createRoute,
    deleteRoute,
    duplicateRoute,
    exportAllAsJson,
    exportRouteAsJson,
    importAllFromJson,
    importRouteFromJson,
    listRoutes,
    subscribe,
} from "../store/localStore.ts";
import { createSampleRoute } from "../sampleData.ts";
import { HelpDialog, HelpList, HelpSection } from "../components/HelpDialog.tsx";

/**
 * テキストをファイルとしてダウンロードさせます。
 *
 * @param filename 保存するファイル名
 * @param text ファイルの内容（JSON）
 */
function downloadText(filename: string, text: string) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * ミリ秒のタイムスタンプを日本語表記の日時にします。
 *
 * @param ms UNIX時間(ミリ秒)
 */
function formatDate(ms: number) {
    return new Date(ms).toLocaleString("ja-JP");
}

export default function RouteListPage() {
    const nav = useNavigate();
    const routes = useSyncExternalStore(subscribe, listRoutes);
    const [newName, setNewName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const routeFileReset = useRef<() => void>(null);
    const allFileReset = useRef<() => void>(null);
    const [helpOpen, setHelpOpen] = useState(false);

    /**
     * 路線を新規作成して編集画面へ移動します。
     *
     * @param e フォームのsubmitイベント
     */
    function onCreate(e: React.FormEvent) {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;
        const created = createRoute(name);
        setNewName("");
        nav(`/route/${created.id}`);
    }

    /**
     * 確認のうえ路線を削除します。
     *
     * @param id 削除する路線ID
     * @param name 確認ダイアログに表示する路線名
     */
    function onDelete(id: number, name: string) {
        if (!confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) return;
        deleteRoute(id);
    }

    /**
     * 路線を複製します。
     *
     * @param id 複製元の路線ID
     */
    function onDuplicate(id: number) {
        duplicateRoute(id);
    }

    function onLoadSample() {
        const created = createSampleRoute();
        nav(`/route/${created.id}`);
    }

    /**
     * 路線をJSONファイルとして書き出します。
     *
     * @param id 書き出す路線ID
     * @param name ファイル名に使う路線名
     */
    function onExportRoute(id: number, name: string) {
        const json = exportRouteAsJson(id);
        if (!json) return;
        downloadText(`${name || "route"}.weboud.json`, json);
    }

    function onExportAll() {
        downloadText(`weboud-backup-${new Date().toISOString().slice(0, 10)}.json`, exportAllAsJson());
    }

    /**
     * JSONファイルから路線を追加します。
     *
     * @param file 選択されたJSONファイル
     */
    async function onImportRoute(file: File) {
        setError(null);
        try {
            const text = await file.text();
            importRouteFromJson(text);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            routeFileReset.current?.();
        }
    }

    /**
     * 確認のうえ、JSONファイルで全データを置き換えます。
     *
     * @param file 選択されたJSONファイル
     */
    async function onImportAll(file: File) {
        if (!confirm("既存の全データを置き換えます。よろしいですか？")) {
            allFileReset.current?.();
            return;
        }
        setError(null);
        try {
            const text = await file.text();
            importAllFromJson(text);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            allFileReset.current?.();
        }
    }

    return (
        <Container size="md" py="md" px="sm" style={{ overflow: "auto", height: "100%" }}>
            <Group justify="space-between" wrap="nowrap" mb="xs">
                <Title order={2}>路線一覧</Title>
                <ActionIcon variant="light" radius="xl" onClick={() => setHelpOpen(true)} aria-label="ヘルプ" title="ヘルプ">
                    ？
                </ActionIcon>
            </Group>
            <Text size="xs" c="dimmed" mb="sm">
                データはこの端末のブラウザ内（ローカルストレージ）にのみ保存されます。他の端末に移す場合は「エクスポート」でファイルを書き出し、その端末で「インポート」してください。
            </Text>

            <form onSubmit={onCreate}>
                <Group gap="xs" wrap="nowrap" mb="xs">
                    <TextInput
                        value={newName}
                        onChange={(e) => setNewName(e.currentTarget.value)}
                        placeholder="新しい路線名（例：山手線）"
                        style={{ flex: 1 }}
                        aria-label="新しい路線名"
                    />
                    <Button type="submit">＋ 新規作成</Button>
                </Group>
            </form>

            <Group gap="xs" mb="md">
                <Button variant="light" size="compact-sm" onClick={onLoadSample}>
                    サンプルダイヤを読み込む（神戸電鉄粟生線）
                </Button>
                <Button variant="default" size="compact-sm" onClick={onExportAll}>
                    全データをエクスポート
                </Button>
                <FileButton resetRef={allFileReset} accept="application/json" onChange={(file) => file && onImportAll(file)}>
                    {(props) => (
                        <Button variant="default" size="compact-sm" {...props}>
                            全データを復元（置換）
                        </Button>
                    )}
                </FileButton>
                <FileButton resetRef={routeFileReset} accept="application/json" onChange={(file) => file && onImportRoute(file)}>
                    {(props) => (
                        <Button variant="default" size="compact-sm" {...props}>
                            路線をインポート
                        </Button>
                    )}
                </FileButton>
            </Group>

            {error && (
                <Alert color="red" mb="sm" style={{ whiteSpace: "pre-wrap" }}>
                    {error}
                </Alert>
            )}

            {routes.length === 0 ? (
                <Text c="dimmed" ta="center" p="xl" style={{ border: "1px dashed var(--mantine-color-gray-4)", borderRadius: 8 }}>
                    路線がありません。上のフォームから新規作成してください。
                </Text>
            ) : (
                <Table verticalSpacing={6} horizontalSpacing="xs" highlightOnHover fz="sm">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>路線名</Table.Th>
                            <Table.Th>駅数</Table.Th>
                            <Table.Th visibleFrom="sm">種別数</Table.Th>
                            <Table.Th>列車数</Table.Th>
                            <Table.Th visibleFrom="sm">最終更新</Table.Th>
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {routes.map((r) => (
                            <Table.Tr key={r.id}>
                                <Table.Td fw={600} style={{ cursor: "pointer" }} onClick={() => nav(`/route/${r.id}`)}>
                                    {r.name}
                                </Table.Td>
                                <Table.Td>{r.stationCount}</Table.Td>
                                <Table.Td visibleFrom="sm">{r.trainTypeCount}</Table.Td>
                                <Table.Td>{r.tripCount}</Table.Td>
                                <Table.Td visibleFrom="sm">{formatDate(r.updatedAt)}</Table.Td>
                                <Table.Td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                                    <Group gap={4} justify="flex-end" wrap="nowrap" visibleFrom="sm">
                                        <Button variant="default" size="compact-xs" onClick={() => onExportRoute(r.id, r.name)}>
                                            書き出し
                                        </Button>
                                        <Button variant="default" size="compact-xs" onClick={() => onDuplicate(r.id)}>
                                            複製
                                        </Button>
                                        <Button variant="default" color="red" c="red" size="compact-xs" onClick={() => onDelete(r.id, r.name)}>
                                            削除
                                        </Button>
                                    </Group>
                                    <Menu position="bottom-end" withinPortal>
                                        <Menu.Target>
                                            <ActionIcon variant="subtle" color="gray" hiddenFrom="sm" aria-label="操作">
                                                ⋮
                                            </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Item onClick={() => onExportRoute(r.id, r.name)}>書き出し</Menu.Item>
                                            <Menu.Item onClick={() => onDuplicate(r.id)}>複製</Menu.Item>
                                            <Menu.Item color="red" onClick={() => onDelete(r.id, r.name)}>
                                                削除
                                            </Menu.Item>
                                        </Menu.Dropdown>
                                    </Menu>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}

            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title="路線一覧 - ヘルプ">
                <HelpSection title="このページでできること">
                    <HelpList
                        items={[
                            "新しい路線（ダイヤ）を名前を付けて作成する",
                            "サンプルダイヤ（神戸電鉄粟生線）を読み込んで試す",
                            "路線名をクリックして駅・列車種別・時刻表の編集画面へ移動する",
                            "路線を複製する／削除する（削除は確認あり、取り消せません）",
                            "路線単体、または全データをJSONファイルとして書き出す（バックアップ・他端末への移行用）",
                            "書き出したJSONファイルを読み込んで、路線を追加する、または全データを置き換える",
                        ]}
                    />
                </HelpSection>
                <HelpSection title="データの保存について">
                    <Text size="sm" c="dimmed">
                        データはこの端末のブラウザ内（localStorage）にのみ保存されます。サーバーには送信されません。端末やブラウザを変える場合は「全データをエクスポート」でファイルに書き出し、新しい環境で「全データを復元」してください。
                    </Text>
                </HelpSection>
            </HelpDialog>
        </Container>
    );
}

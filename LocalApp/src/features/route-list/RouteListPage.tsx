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
    importRoutesFromJson,
    isRouteNameTaken,
    listRoutes,
    subscribe,
} from "../../store/localStore.ts";
import { RouteRenameDialog } from "./RouteRenameDialog.tsx";
import { OudiaImportDialog } from "../oudia-import/OudiaImportDialog.tsx";
import { loadSampleRoute } from "../../store/sampleRoute.ts";
import { translate, useT } from "./messages.ts";
import { formatDateTime } from "../../shared/i18n/languages.ts";
import { HelpDialog, HelpList, HelpSection } from "../../shared/ui/HelpDialog.tsx";
import { getErrorMessage } from "../../shared/lib/errors.ts";

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
 * 同じ名前の路線を上書きしてよいかを、利用者に確認します。
 *
 * @param names 同じ名前の路線の路線名
 */
function confirmOverwrite(names: string[]): boolean {
    return confirm(translate().t("confirmOverwrite", { names: names.map((n) => `・${n}`).join("\n") }));
}

export default function RouteListPage() {
    const nav = useNavigate();
    const { t, tl, lang } = useT();
    const routes = useSyncExternalStore(subscribe, listRoutes);
    const [newName, setNewName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const routeFileReset = useRef<() => void>(null);
    const allFileReset = useRef<() => void>(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const [oudiaOpen, setOudiaOpen] = useState(false);
    /** 名前を変えている路線（nullなら変更ダイアログは閉じている） */
    const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);

    /**
     * 路線を新規作成して編集画面へ移動します。
     *
     * @param e フォームのsubmitイベント
     */
    function onCreate(e: React.FormEvent) {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;
        if (isRouteNameTaken(name)) {
            setError(t("nameTaken", { name }));
            return;
        }
        setError(null);
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
        if (!confirm(t("confirmDeleteRoute", { name }))) return;
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

    /** サンプルダイヤを新しい路線として読み込み、その路線の編集画面へ移動する */
    async function onLoadSample() {
        setError(null);
        try {
            const created = await loadSampleRoute(confirmOverwrite);
            if (created) nav(`/route/${created.id}`);
        } catch (e) {
            setError(getErrorMessage(e));
        }
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
     * JSONファイルから路線を追加します（路線のエクスポート・全データのエクスポートのどちらのファイルも読める）。
     * 同じ名前の路線があるときは、確認のうえ上書きします。
     *
     * @param file 選択されたJSONファイル
     */
    async function onImportRoute(file: File) {
        setError(null);
        try {
            const text = await file.text();
            importRoutesFromJson(text, confirmOverwrite);
        } catch (e) {
            setError(getErrorMessage(e));
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
        if (!confirm(t("confirmRestoreAll"))) {
            allFileReset.current?.();
            return;
        }
        setError(null);
        try {
            const text = await file.text();
            importAllFromJson(text);
        } catch (e) {
            setError(getErrorMessage(e));
        } finally {
            allFileReset.current?.();
        }
    }

    return (
        <Container size="md" py="md" px="sm" style={{ overflow: "auto", height: "100%" }}>
            <Group justify="space-between" wrap="nowrap" mb="xs">
                <Title order={2}>{t("title")}</Title>
                <Group gap="xs" wrap="nowrap">
                    <ActionIcon variant="light" radius="xl" onClick={() => nav("/settings")} aria-label={t("settings")} title={t("settings")}>
                        ⚙
                    </ActionIcon>
                    <ActionIcon variant="light" radius="xl" onClick={() => setHelpOpen(true)} aria-label={t("help")} title={t("help")}>
                        ？
                    </ActionIcon>
                </Group>
            </Group>
            <Text size="xs" c="dimmed" mb="sm">
                {t("storageNote")}
            </Text>

            <form onSubmit={onCreate}>
                <Group gap="xs" wrap="nowrap" mb="xs">
                    <TextInput
                        value={newName}
                        onChange={(e) => setNewName(e.currentTarget.value)}
                        placeholder={t("newNamePlaceholder")}
                        style={{ flex: 1 }}
                        aria-label={t("newNameLabel")}
                    />
                    <Button type="submit">{t("create")}</Button>
                </Group>
            </form>

            <Group gap="xs" mb="md">
                <Button variant="light" size="compact-sm" onClick={() => void onLoadSample()}>
                    {t("loadSample", { name: t("sampleName") })}
                </Button>
                <Button variant="light" size="compact-sm" onClick={() => setOudiaOpen(true)}>
                    {t("importOudia")}
                </Button>
                <Button variant="default" size="compact-sm" onClick={onExportAll}>
                    {t("exportAll")}
                </Button>
                <FileButton resetRef={allFileReset} accept="application/json" onChange={(file) => file && onImportAll(file)}>
                    {(props) => (
                        <Button variant="default" size="compact-sm" {...props}>
                            {t("restoreAll")}
                        </Button>
                    )}
                </FileButton>
                <FileButton resetRef={routeFileReset} accept="application/json" onChange={(file) => file && onImportRoute(file)}>
                    {(props) => (
                        <Button variant="default" size="compact-sm" {...props}>
                            {t("importRoute")}
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
                    {t("empty")}
                </Text>
            ) : (
                <Table verticalSpacing={6} horizontalSpacing="xs" highlightOnHover fz="sm">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>{t("colName")}</Table.Th>
                            <Table.Th>{t("colStations")}</Table.Th>
                            <Table.Th visibleFrom="sm">{t("colTypes")}</Table.Th>
                            <Table.Th>{t("colTrips")}</Table.Th>
                            <Table.Th visibleFrom="sm">{t("colUpdated")}</Table.Th>
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
                                <Table.Td visibleFrom="sm">{formatDateTime(lang, r.updatedAt)}</Table.Td>
                                <Table.Td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                                    <Group gap={4} justify="flex-end" wrap="nowrap" visibleFrom="sm">
                                        <Button variant="default" size="compact-xs" onClick={() => setRenaming({ id: r.id, name: r.name })}>
                                            {t("rename")}
                                        </Button>
                                        <Button variant="default" size="compact-xs" onClick={() => onExportRoute(r.id, r.name)}>
                                            {t("export")}
                                        </Button>
                                        <Button variant="default" size="compact-xs" onClick={() => onDuplicate(r.id)}>
                                            {t("duplicate")}
                                        </Button>
                                        <Button variant="default" color="red" c="red" size="compact-xs" onClick={() => onDelete(r.id, r.name)}>
                                            {t("remove")}
                                        </Button>
                                    </Group>
                                    <Menu position="bottom-end" withinPortal>
                                        <Menu.Target>
                                            <ActionIcon variant="subtle" color="gray" hiddenFrom="sm" aria-label={t("actions")}>
                                                ⋮
                                            </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Item onClick={() => setRenaming({ id: r.id, name: r.name })}>{t("rename")}</Menu.Item>
                                            <Menu.Item onClick={() => onExportRoute(r.id, r.name)}>{t("export")}</Menu.Item>
                                            <Menu.Item onClick={() => onDuplicate(r.id)}>{t("duplicate")}</Menu.Item>
                                            <Menu.Item color="red" onClick={() => onDelete(r.id, r.name)}>
                                                {t("remove")}
                                            </Menu.Item>
                                        </Menu.Dropdown>
                                    </Menu>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}

            <RouteRenameDialog route={renaming} onClose={() => setRenaming(null)} />
            <OudiaImportDialog open={oudiaOpen} onClose={() => setOudiaOpen(false)} />
            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title={t("helpTitle")}>
                <HelpSection title={t("helpDoSection")}>
                    <HelpList items={tl("helpDoItems", { name: t("sampleName") })} />
                </HelpSection>
                <HelpSection title={t("helpSaveSection")}>
                    <Text size="sm" c="dimmed">
                        {t("helpSaveNote")}
                    </Text>
                </HelpSection>
            </HelpDialog>
        </Container>
    );
}

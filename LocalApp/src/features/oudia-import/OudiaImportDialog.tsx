import { useT } from "./messages.ts";
import { useCommonT } from "../../shared/i18n/common.ts";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, FileButton, Group, Modal, NativeSelect, Stack, Text, TextInput } from "@mantine/core";
import { oudiaToRouteRecord, parseOudia, type ParsedOudia } from "./oudiaImport.ts";
import { addRoute } from "../../store/localStore.ts";
import { getErrorMessage } from "../../shared/lib/errors.ts";

/**
 * OuDiaファイル(.oud)を読み込み、新しい路線として取り込むダイアログです。
 * ファイルを選ぶと内容（駅数・列車種別数・ダイヤごとの列車数）を表示し、取り込むダイヤと路線名を選んで取り込みます。
 * 取り込んだ路線はこの端末のブラウザ内に保存され、その路線の編集画面へ移動します。
 *
 * @param props open:表示中か / onClose:閉じる処理
 */
export function OudiaImportDialog(props: { open: boolean; onClose: () => void }) {
    // 開くたびに本体を作り直し、前回の読み込み結果が残らないようにする
    if (!props.open) return null;
    return <OudiaImportBody onClose={props.onClose} />;
}

/**
 * ダイアログの本体。
 *
 * @param props onClose:閉じる処理
 */
function OudiaImportBody({ onClose }: { onClose: () => void }) {
    const nav = useNavigate();
    const { t } = useT();
    const c = useCommonT().t;
    const [fileName, setFileName] = useState("");
    const [parsed, setParsed] = useState<ParsedOudia | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [diagramIndex, setDiagramIndex] = useState(0);
    const [routeName, setRouteName] = useState("");
    const [url, setUrl] = useState("");
    const [loadingUrl, setLoadingUrl] = useState(false);

    /**
     * 選んだファイルを読み込んで内容を確認する
     *
     * @param file 選択されたOuDiaファイル
     */
    async function onPickFile(file: File | null) {
        if (!file) return;
        await loadBuffer(file.name, () => file.arrayBuffer());
    }

    /** URLを指定してOuDiaファイルをダウンロードし、内容を確認する */
    async function onLoadUrl() {
        const target = url.trim();
        if (!target) return;
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(target);
        } catch {
            setError(t("urlInvalid"));
            return;
        }
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            setError(t("urlScheme"));
            return;
        }
        setLoadingUrl(true);
        await loadBuffer(decodeURIComponent(parsedUrl.pathname.split("/").pop() || parsedUrl.hostname), async () => {
            let res: Response;
            try {
                res = await fetch(parsedUrl);
            } catch {
                throw new Error(t("urlNetwork"));
            }
            if (!res.ok) throw new Error(t("urlHttp", { status: res.status }));
            return res.arrayBuffer();
        });
        setLoadingUrl(false);
    }

    /**
     * ファイルの内容を取得して読み込み、内容を確認できる状態にする
     *
     * @param name 表示するファイル名
     * @param read 内容（バイト列）を取得する処理
     */
    async function loadBuffer(name: string, read: () => Promise<ArrayBuffer>) {
        setError(null);
        setParsed(null);
        setFileName(name);
        try {
            const result = parseOudia(await read());
            setParsed(result);
            setRouteName(result.summary.routeName);
            setDiagramIndex(0);
        } catch (e) {
            setError(getErrorMessage(e));
        }
    }

    /** 選んだダイヤを路線データに変換して保存し、その路線の編集画面を開く */
    function onImport() {
        if (!parsed) return;
        const name = routeName.trim() || parsed.summary.routeName;
        try {
            const route = addRoute((id) => oudiaToRouteRecord(parsed, diagramIndex, name, id));
            onClose();
            nav(`/route/${route.id}`);
        } catch (e) {
            // 同じ名前の路線がある場合など。ダイアログを閉じずに、路線名を直してもらう
            setError(getErrorMessage(e));
        }
    }

    const summary = parsed?.summary;
    return (
        <Modal opened onClose={onClose} title={t("title")} centered size="md" styles={{ title: { fontWeight: 700 } }}>
            <Stack gap="sm">
                <Text size="sm" c="dimmed">
                    {t("intro")}
                </Text>

                <Group gap="xs" wrap="nowrap">
                    <FileButton accept=".oud,.txt" onChange={onPickFile}>
                        {(p) => (
                            <Button variant="default" {...p}>
                                {t("pickFile")}
                            </Button>
                        )}
                    </FileButton>
                    <Text size="sm" truncate>
                        {fileName || t("noFile")}
                    </Text>
                </Group>

                <Group gap="xs" wrap="nowrap" align="flex-end">
                    <TextInput
                        label={t("urlLabel")}
                        placeholder="https://example.com/file.oud"
                        value={url}
                        onChange={(e) => setUrl(e.currentTarget.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") void onLoadUrl();
                        }}
                        style={{ flex: 1 }}
                    />
                    <Button variant="default" onClick={() => void onLoadUrl()} loading={loadingUrl} disabled={!url.trim()}>
                        {t("load")}
                    </Button>
                </Group>

                {error &&<Alert color="red">{error}</Alert>}

                {summary && (
                    <>
                        <Text size="sm">
                            {t("summary", { stations: summary.stationCount, types: summary.trainTypeCount, diagrams: summary.diagrams.length })}
                        </Text>
                        <TextInput label={t("routeName")} value={routeName} onChange={(e) => setRouteName(e.currentTarget.value)} />
                        {summary.diagrams.length > 0 ? (
                            <NativeSelect
                                label={t("diagramLabel")}
                                value={String(diagramIndex)}
                                onChange={(e) => setDiagramIndex(Number(e.currentTarget.value))}
                                data={summary.diagrams.map((d, i) => ({
                                    value: String(i),
                                    label: t("diagramOption", { name: d.name || t("diagramDefault", { n: i + 1 }), down: d.downCount, up: d.upCount }),
                                }))}
                            />
                        ) : (
                            <Text size="sm" c="dimmed">
                                {t("noDiagram")}
                            </Text>
                        )}
                        <Text size="xs" c="dimmed">
                            {t("oneDiagramNote")}
                        </Text>
                    </>
                )}

                <Group justify="flex-end" gap="xs">
                    <Button variant="default" onClick={onClose}>
                        {c("cancel")}
                    </Button>
                    <Button onClick={onImport} disabled={!parsed}>
                        {t("doImport")}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

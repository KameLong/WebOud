import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Accordion, Anchor, Button, Container, Group, Text, Title } from "@mantine/core";
import { getErrorMessage } from "../../shared/lib/errors.ts";
import { useT } from "./messages.ts";

/** 利用しているnpmパッケージ1件分のライセンス情報（scripts/generate-licenses.mjs が作る） */
type LicenseEntry = {
    name: string;
    version: string;
    license: string;
    url: string;
    text: string;
};

/**
 * 利用しているnpmパッケージのライセンス表記の画面です。設定画面から開きます。
 * ライセンス情報は大きいため、この画面を開いたときに初めて読み込みます。
 */
export default function LicensesPage() {
    const nav = useNavigate();
    const { t } = useT();
    const [entries, setEntries] = useState<LicenseEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        import("./licenses.json")
            .then((m) => {
                if (!cancelled) setEntries(m.default as LicenseEntry[]);
            })
            .catch((e) => {
                if (!cancelled) setError(getErrorMessage(e));
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <Container size="sm" py="md" px="sm" style={{ height: "100%", overflowY: "auto" }}>
            <Group justify="space-between" wrap="nowrap" mb="md">
                <Button variant="default" size="compact-sm" onClick={() => nav("/settings")}>
                    {"← " + t("backToSettings")}
                </Button>
                <Title order={2} size="h3">
                    {t("title")}
                </Title>
                <div style={{ width: 1 }} />
            </Group>

            <Text size="sm" mb="xs">
                {t("intro")}
            </Text>

            {error && (
                <Text size="sm" c="red">
                    {t("loadFailed")}（{error}）
                </Text>
            )}
            {!error && entries === null && (
                <Text size="sm" c="dimmed">
                    {t("loading")}
                </Text>
            )}
            {entries && (
                <>
                    <Text size="xs" c="dimmed" mb="xs">
                        {t("count", { n: entries.length })}
                    </Text>
                    <Accordion variant="separated" chevronPosition="left">
                        {entries.map((e) => (
                            <Accordion.Item key={`${e.name}@${e.version}`} value={`${e.name}@${e.version}`}>
                                <Accordion.Control>
                                    <Text size="sm" fw={600}>
                                        {e.name} <Text span size="xs" c="dimmed">{e.version}</Text>
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {e.license}
                                    </Text>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    {e.url && (
                                        <Text size="xs" mb="xs">
                                            {t("repository")}:{" "}
                                            <Anchor href={e.url} target="_blank" rel="noopener noreferrer" size="xs">
                                                {e.url}
                                            </Anchor>
                                        </Text>
                                    )}
                                    {e.text ? (
                                        <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{e.text}</pre>
                                    ) : (
                                        <Text size="xs" c="dimmed">
                                            {t("noText")}
                                        </Text>
                                    )}
                                </Accordion.Panel>
                            </Accordion.Item>
                        ))}
                    </Accordion>
                </>
            )}
        </Container>
    );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Checkbox, Container, Group, List, NativeSelect, Stack, Text, Textarea, TextInput, Title } from "@mantine/core";
import { useT } from "./messages.ts";
import { getErrorMessage } from "../../shared/lib/errors.ts";

/** 投稿の受付先URL。ビルド時に環境変数 VITE_FEEDBACK_ENDPOINT で指定する（未設定なら投稿できない） */
const ENDPOINT: string = import.meta.env.VITE_FEEDBACK_ENDPOINT ?? "";

const MAX_SUBJECT = 100;
const MAX_BODY = 3000;

type Category = "bug" | "question" | "request";

/**
 * 不具合の報告・質問・要望の投稿画面です。設定画面から開きます。
 * IPアドレスは受付先のサーバー側で記録します（この画面からは送りません）。
 */
export default function FeedbackPage() {
    const nav = useNavigate();
    const { t, tl } = useT();
    const [category, setCategory] = useState<Category>("bug");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const configured = ENDPOINT !== "";
    const canSubmit = configured && agreed && !sending && subject.trim() !== "" && body.trim() !== "";

    /** 入力内容を受付先へ送信する */
    async function submit() {
        if (!canSubmit) return;
        if (!navigator.onLine) {
            setError(t("offline"));
            return;
        }
        setSending(true);
        setError(null);
        setDone(false);
        try {
            const res = await fetch(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category, subject: subject.trim(), body: body.trim() }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setDone(true);
            setSubject("");
            setBody("");
            setAgreed(false);
        } catch (e) {
            setError(t("failure", { reason: getErrorMessage(e) }));
        } finally {
            setSending(false);
        }
    }

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

            <Text size="sm" mb="sm">
                {t("intro")}
            </Text>

            <Alert color="orange" variant="light" title={t("noticeTitle")} mb="md">
                <List size="sm" spacing={4}>
                    {tl("notices").map((n) => (
                        <List.Item key={n}>{n}</List.Item>
                    ))}
                </List>
            </Alert>

            {!configured && (
                <Alert color="gray" mb="md">
                    {t("notConfigured")}
                </Alert>
            )}

            <Stack gap="sm">
                <NativeSelect
                    label={t("category")}
                    value={category}
                    onChange={(e) => setCategory(e.currentTarget.value as Category)}
                    data={[
                        { value: "bug", label: t("categoryBug") },
                        { value: "question", label: t("categoryQuestion") },
                        { value: "request", label: t("categoryRequest") },
                    ]}
                />
                <TextInput
                    label={t("subject")}
                    placeholder={t("subjectPlaceholder")}
                    value={subject}
                    maxLength={MAX_SUBJECT}
                    onChange={(e) => setSubject(e.currentTarget.value)}
                />
                <Textarea
                    label={t("body")}
                    placeholder={t("bodyPlaceholder")}
                    value={body}
                    maxLength={MAX_BODY}
                    minRows={8}
                    autosize
                    onChange={(e) => setBody(e.currentTarget.value)}
                    description={t("counter", { n: body.length, max: MAX_BODY })}
                />
                <Checkbox checked={agreed} onChange={(e) => setAgreed(e.currentTarget.checked)} label={t("agree")} />
                {error && <Alert color="red">{error}</Alert>}
                {done && <Alert color="green">{t("success")}</Alert>}
                <Group>
                    <Button onClick={submit} disabled={!canSubmit} loading={sending}>
                        {sending ? t("submitting") : t("submit")}
                    </Button>
                </Group>
            </Stack>
        </Container>
    );
}

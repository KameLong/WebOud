import { useNavigate } from "react-router-dom";
import { Button, Container, Group, NativeSelect, NumberInput, Stack, Text, Title } from "@mantine/core";
import { useFontSize } from "../../shared/hooks/useFontSize.ts";
import { DEFAULT_FONT_SIZE, MAX_FONT_SIZE, MIN_FONT_SIZE, setFontSize, setLanguage } from "../../store/settings.ts";
import { useCommonT } from "../../shared/i18n/common.ts";
import { isLang, LANGUAGES } from "../../shared/i18n/languages.ts";
import { useT } from "./messages.ts";

/**
 * アプリ全体の設定画面です。変更は入力と同時に自動で保存されます（保存ボタンはありません）。
 */
export default function SettingsPage() {
    const nav = useNavigate();
    const fontSize = useFontSize();
    const { t, lang } = useT();
    const c = useCommonT().t;

    return (
        <Container size="xs" py="md" px="sm">
            <Group justify="space-between" wrap="nowrap" mb="md">
                <Button variant="default" size="compact-sm" onClick={() => nav("/")}>
                    {c("backToRoutes")}
                </Button>
                <Title order={2}>{t("title")}</Title>
                <div style={{ width: 1 }} />
            </Group>

            <Stack gap="xs">
                <Text fw={600} size="sm">
                    {t("fontSize")}
                </Text>
                <Group gap="xs" wrap="nowrap" align="flex-end">
                    <NumberInput
                        value={fontSize}
                        onChange={(v) => setFontSize(typeof v === "number" ? v : Number(v))}
                        min={MIN_FONT_SIZE}
                        max={MAX_FONT_SIZE}
                        step={1}
                        suffix=" px"
                        aria-label={t("fontSizeLabel")}
                        style={{ width: 140 }}
                    />
                    <Button variant="default" size="compact-sm" onClick={() => setFontSize(DEFAULT_FONT_SIZE)} disabled={fontSize === DEFAULT_FONT_SIZE}>
                        {t("resetFontSize", { size: DEFAULT_FONT_SIZE })}
                    </Button>
                </Group>
                <Text size="xs" c="dimmed">
                    {t("fontSizeHelp", { min: MIN_FONT_SIZE, max: MAX_FONT_SIZE })}
                </Text>
            </Stack>

            <Stack gap="xs" mt="lg">
                <Text fw={600} size="sm">
                    {t("language")}
                </Text>
                <NativeSelect
                    value={lang}
                    onChange={(e) => {
                        const v = e.currentTarget.value;
                        if (isLang(v)) setLanguage(v);
                    }}
                    data={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
                    aria-label={t("language")}
                    style={{ width: 240 }}
                />
                <Text size="xs" c="dimmed">
                    {t("languageHelp")}
                </Text>
            </Stack>
        </Container>
    );
}

import { useNavigate } from "react-router-dom";
import { Button, Container, Group, NumberInput, Stack, Text, Title } from "@mantine/core";
import { useFontSize } from "../hooks/useFontSize.ts";
import { DEFAULT_FONT_SIZE, MAX_FONT_SIZE, MIN_FONT_SIZE, setFontSize } from "../store/settings.ts";

/**
 * アプリ全体の設定画面です。変更は入力と同時に自動で保存されます（保存ボタンはありません）。
 */
export default function SettingsPage() {
    const nav = useNavigate();
    const fontSize = useFontSize();

    return (
        <Container size="xs" py="md" px="sm">
            <Group justify="space-between" wrap="nowrap" mb="md">
                <Button variant="default" size="compact-sm" onClick={() => nav("/")}>
                    ← 路線一覧へ
                </Button>
                <Title order={2}>設定</Title>
                <div style={{ width: 1 }} />
            </Group>

            <Stack gap="xs">
                <Text fw={600} size="sm">
                    全体の文字サイズ
                </Text>
                <Group gap="xs" wrap="nowrap" align="flex-end">
                    <NumberInput
                        value={fontSize}
                        onChange={(v) => setFontSize(typeof v === "number" ? v : Number(v))}
                        min={MIN_FONT_SIZE}
                        max={MAX_FONT_SIZE}
                        step={1}
                        suffix=" px"
                        aria-label="全体の文字サイズ(px)"
                        style={{ width: 140 }}
                    />
                    <Button variant="default" size="compact-sm" onClick={() => setFontSize(DEFAULT_FONT_SIZE)} disabled={fontSize === DEFAULT_FONT_SIZE}>
                        既定に戻す（{DEFAULT_FONT_SIZE}px）
                    </Button>
                </Group>
                <Text size="xs" c="dimmed">
                    時刻表グリッドなどの表示もこの文字サイズに合わせて拡大縮小します（{MIN_FONT_SIZE}〜{MAX_FONT_SIZE}pxの範囲）。変更は自動で保存され、すぐに反映されます。
                </Text>
            </Stack>
        </Container>
    );
}

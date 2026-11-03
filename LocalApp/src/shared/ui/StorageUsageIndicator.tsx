import { Group, Progress, Text } from "@mantine/core";
import { useStorageEstimate } from "../hooks/useStorageEstimate.ts";

/**
 * バイト数を読みやすい単位（B/KB/MB/GB）の文字列にします。
 *
 * @param bytes バイト数
 */
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes / 1024;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }
    return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

/**
 * ブラウザの保存容量の使用状況（使用量 / 上限の見積もり）を表示します。
 * 見積もりが取得できない環境（未対応ブラウザなど）では何も表示しません。
 *
 * @param label 表示ラベル（多言語対応のため呼び出し側から渡す）
 */
export function StorageUsageIndicator({ label }: { label: string }) {
    const estimate = useStorageEstimate();
    if (!estimate || estimate.quota <= 0) return null;

    const percent = (estimate.usage / estimate.quota) * 100;
    const percentText = percent < 0.1 ? "<0.1" : percent.toFixed(1);
    const color = percent > 90 ? "red" : percent > 70 ? "yellow" : "blue";

    return (
        <Group gap="xs" wrap="nowrap" mb="sm" align="center">
            <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                {label}: {formatBytes(estimate.usage)} / {formatBytes(estimate.quota)} ({percentText}%)
            </Text>
            <Progress value={Math.min(100, percent)} size="sm" color={color} style={{ flex: "1 1 120px", maxWidth: 200 }} />
        </Group>
    );
}

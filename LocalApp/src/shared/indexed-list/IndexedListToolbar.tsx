import { Button, Group, Text } from "@mantine/core";
import { useT } from "./messages.ts";

/**
 * 一覧の選択操作バー（PC・スマホ共通）。選択中の行に対する操作をここからも行える。
 *
 * @param props selectedCount:選択中の件数 / hasItems:行があるか / onSelectAll・onCopy・onPaste・onDelete・onClear:各ボタンの処理
 */
export function IndexedListToolbar(props: { selectedCount: number; hasItems: boolean; onSelectAll: () => void; onCopy: () => void; onPaste: () => void; onDelete: () => void; onClear: () => void }) {
    const { selectedCount, hasItems, onSelectAll, onCopy, onPaste, onDelete, onClear } = props;
    const { t } = useT();
    return (
        <div className="indexed-toolbar">
            <Group gap="xs" justify="space-between" wrap="wrap">
                <Text size="sm" fw={600}>
                    {selectedCount > 0 ? t("selectedCount", { n: selectedCount }) : t("noSelection")}
                </Text>
                <Group gap={4} wrap="wrap">
                    <Button size="compact-xs" variant="default" onClick={onSelectAll} disabled={!hasItems} title={t("selectAllTitle")}>
                        {t("selectAll")}
                    </Button>
                    <Button size="compact-xs" variant="default" onClick={onCopy} disabled={selectedCount === 0} title={t("copyTitle")}>
                        {t("copy")}
                    </Button>
                    <Button size="compact-xs" variant="default" onClick={onPaste} title={t("pasteTitle")}>
                        {t("paste")}
                    </Button>
                    <Button size="compact-xs" variant="default" color="red" c="red" onClick={onDelete} disabled={selectedCount === 0} title={t("removeTitle")}>
                        {t("remove")}
                    </Button>
                    <Button size="compact-xs" variant="subtle" color="gray" onClick={onClear} disabled={selectedCount === 0} title={t("clearTitle")}>
                        {t("clear")}
                    </Button>
                </Group>
            </Group>
            <Text className="indexed-hint" size="xs" c="dimmed">
                {t("hint")}
            </Text>
        </div>
    );
}

import { Button, Group, Text } from "@mantine/core";

/**
 * 一覧の選択操作バー（PC・スマホ共通）。選択中の行に対する操作をここからも行える。
 *
 * @param props selectedCount:選択中の件数 / hasItems:行があるか / onSelectAll・onCopy・onPaste・onDelete・onClear:各ボタンの処理
 */
export function IndexedListToolbar(props: { selectedCount: number; hasItems: boolean; onSelectAll: () => void; onCopy: () => void; onPaste: () => void; onDelete: () => void; onClear: () => void }) {
    const { selectedCount, hasItems, onSelectAll, onCopy, onPaste, onDelete, onClear } = props;
    return (
        <div className="indexed-toolbar">
            <Group gap="xs" justify="space-between" wrap="wrap">
                <Text size="sm" fw={600}>
                    {selectedCount > 0 ? `${selectedCount}件選択中` : "未選択"}
                </Text>
                <Group gap={4} wrap="wrap">
                    <Button size="compact-xs" variant="default" onClick={onSelectAll} disabled={!hasItems} title="すべて選択 (Ctrl+A)">
                        全選択
                    </Button>
                    <Button size="compact-xs" variant="default" onClick={onCopy} disabled={selectedCount === 0} title="コピー (Ctrl+C)">
                        コピー
                    </Button>
                    <Button size="compact-xs" variant="default" onClick={onPaste} title="貼り付け (Ctrl+V)">
                        貼り付け
                    </Button>
                    <Button size="compact-xs" variant="default" color="red" c="red" onClick={onDelete} disabled={selectedCount === 0} title="削除 (Delete)">
                        削除
                    </Button>
                    <Button size="compact-xs" variant="subtle" color="gray" onClick={onClear} disabled={selectedCount === 0} title="選択解除 (Esc)">
                        解除
                    </Button>
                </Group>
            </Group>
            <Text className="indexed-hint" size="xs" c="dimmed">
                左端の○で選択（Shift:範囲）／入力欄で Esc → 選択モード：↑↓ 移動、Shift+↑↓ 範囲、Space 選択、Ctrl+A/C/V、Delete、Enter/F2 で名前を編集
            </Text>
        </div>
    );
}

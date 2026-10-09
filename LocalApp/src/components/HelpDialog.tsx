import React from "react";
import { Box, List, Modal, Table, Text } from "@mantine/core";

/**
 * 各ページ共通のヘルプダイアログ。そのページでできる操作とショートカットキーを表示する。
 * 背景クリックまたはEscapeキーで閉じる。
 *
 * @param props open:表示中か / onClose:閉じる処理 / title:見出し / children:本文
 */
export function HelpDialog(props: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    const { open, onClose, title, children } = props;

    return (
        <Modal opened={open} onClose={onClose} title={title} centered size="md" styles={{ title: { fontWeight: 700 } }}>
            {children}
        </Modal>
    );
}

/**
 * ヘルプダイアログ内の見出し付きセクション
 *
 * @param props title:見出し / children:本文
 */
export function HelpSection(props: { title: string; children: React.ReactNode }) {
    return (
        <Box mb="md">
            <Text fw={700} size="sm" c="dimmed" mb={4}>
                {props.title}
            </Text>
            {props.children}
        </Box>
    );
}

/**
 * できることの箇条書きリスト
 *
 * @param props items:各項目の内容
 */
export function HelpList(props: { items: React.ReactNode[] }) {
    return (
        <List size="sm" spacing={4}>
            {props.items.map((item, i) => (
                <List.Item key={i}>{item}</List.Item>
            ))}
        </List>
    );
}

/**
 * キー操作一覧の表
 *
 * @param props rows:[キー, 説明]の配列
 */
export function HelpShortcutTable(props: { rows: [string, string][] }) {
    return (
        <Table verticalSpacing={4} horizontalSpacing="xs" fz="sm" withRowBorders>
            <Table.Tbody>
                {props.rows.map(([key, desc]) => (
                    <Table.Tr key={key}>
                        <Table.Td ff="monospace" fw={600} c="brand" style={{ whiteSpace: "nowrap", verticalAlign: "top" }}>
                            {key}
                        </Table.Td>
                        <Table.Td>{desc}</Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );
}

export const helpButtonStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    padding: 0,
    fontWeight: 700,
};

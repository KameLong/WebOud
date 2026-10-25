import { useState } from "react";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { isImeComposing } from "../../shared/lib/keyboard.ts";
import { isRouteNameTaken, renameRoute } from "../../store/localStore.ts";

/**
 * 路線名を変えるダイアログです。空の名前や、ほかの路線と同じ名前にはできません。開くたびに、入力欄を今の路線名から作り直します。
 *
 * @param props route:名前を変える路線（nullなら閉じている） / onClose:閉じる
 */
export function RouteRenameDialog(props: { route: { id: number; name: string } | null; onClose: () => void }) {
    if (!props.route) return null;
    return <RouteRenameBody key={props.route.id} route={props.route} onClose={props.onClose} />;
}

/**
 * ダイアログの本体。
 *
 * @param props route:名前を変える路線 / onClose:閉じる
 */
function RouteRenameBody({ route, onClose }: { route: { id: number; name: string }; onClose: () => void }) {
    const [name, setName] = useState(route.name);
    const trimmed = name.trim();
    const error = trimmed === "" ? "路線名を入力してください" : isRouteNameTaken(trimmed, route.id) ? `「${trimmed}」という名前の路線はすでにあります` : null;

    /** 路線名を変更して閉じる（名前が正しくないときは何もしない） */
    function save() {
        if (error) return;
        if (trimmed !== route.name) renameRoute(route.id, trimmed);
        onClose();
    }

    return (
        <Modal opened onClose={onClose} title="路線名の変更" centered size="sm" styles={{ title: { fontWeight: 700 } }}>
            <Stack gap="sm">
                <TextInput
                    data-autofocus
                    label="路線名"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    error={error}
                    onKeyDown={(e) => {
                        // 日本語の変換を確定するEnterで、変更を確定しない
                        if (e.key === "Enter" && !isImeComposing(e)) {
                            e.preventDefault();
                            save();
                        }
                    }}
                />
                <Group justify="flex-end" gap="xs">
                    <Button variant="default" onClick={onClose}>
                        キャンセル
                    </Button>
                    <Button onClick={save} disabled={!!error}>
                        変更
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

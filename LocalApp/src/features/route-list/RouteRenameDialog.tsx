import { useState } from "react";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { isImeComposing } from "../../shared/lib/keyboard.ts";
import { useT } from "./messages.ts";
import { useCommonT } from "../../shared/i18n/common.ts";
import { translate as translateStore } from "../../store/messages.ts";
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
    const { t } = useT();
    const c = useCommonT().t;
    const [name, setName] = useState(route.name);
    const trimmed = name.trim();
    const error = trimmed === "" ? t("renameEmpty") : isRouteNameTaken(trimmed, route.id) ? translateStore().t("duplicateName", { name: trimmed }) : null;

    /** 路線名を変更して閉じる（名前が正しくないときは何もしない） */
    function save() {
        if (error) return;
        if (trimmed !== route.name) renameRoute(route.id, trimmed);
        onClose();
    }

    return (
        <Modal opened onClose={onClose} title={t("renameTitle")} centered size="sm" styles={{ title: { fontWeight: 700 } }}>
            <Stack gap="sm">
                <TextInput
                    data-autofocus
                    label={t("renameLabel")}
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
                        {c("cancel")}
                    </Button>
                    <Button onClick={save} disabled={!!error}>
                        {c("change")}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

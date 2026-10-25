import { useT } from "./messages.ts";
import { useCommonT } from "../../shared/i18n/common.ts";
import StationListEditor from "./StationListEditor.tsx";
import { useNavigate, useParams } from "react-router-dom";
import TrainTypeListEditor from "./TrainTypeListEditor.tsx";
import { useState, useSyncExternalStore } from "react";
import { getRoute, isRouteNameTaken, renameRoute, subscribe } from "../../store/localStore.ts";
import { ActionIcon, Box, Button, Container, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { HelpDialog, HelpList, HelpSection, HelpShortcutTable } from "../../shared/ui/HelpDialog.tsx";

export function RoutePage() {
    const urlParams = useParams<{ routeId: string }>();
    const routeId: number = Number(urlParams.routeId);
    const nav = useNavigate();
    const [helpOpen, setHelpOpen] = useState(false);
    const { t, tl: t_list, table } = useT();
    const c = useCommonT().t;
    /** 編集中の路線名。nullのときは保存済みの路線名を表示する */
    const [nameDraft, setNameDraft] = useState<string | null>(null);

    const route = useSyncExternalStore(subscribe, () => getRoute(routeId));

    if (!route) {
        return (
            <Container size="md" py="md">
                {t("routeNotFound")}
                <Button variant="default" size="compact-sm" ml="xs" onClick={() => nav("/")}>
                    {t("backToList")}
                </Button>
            </Container>
        );
    }

    return (
        <Box style={{ overflow: "auto", height: "100%" }}>
            <Container size="md" pt="md" pb={72} px="sm">
                <Stack gap="lg">
                    <div>
                        <Group justify="space-between" wrap="nowrap" mb="xs">
                            <Button variant="default" size="compact-sm" onClick={() => nav("/")}>
                                {c("backToRoutes")}
                            </Button>
                            <ActionIcon variant="light" radius="xl" onClick={() => setHelpOpen(true)} aria-label={t("helpLabel")} title={t("helpLabel")}>
                                ？
                            </ActionIcon>
                        </Group>
                        <TextInput
                            value={nameDraft ?? route.name}
                            onChange={(e) => {
                                const v = e.currentTarget.value;
                                setNameDraft(v);
                                // 空の名前や、ほかの路線と同じ名前は保存しない（入力欄を離れたときに元の名前へ戻す）
                                if (v.trim() !== "" && !isRouteNameTaken(v.trim(), routeId)) renameRoute(routeId, v.trim());
                            }}
                            onBlur={() => setNameDraft(null)}
                            error={nameDraft !== null && nameDraft.trim() !== "" && isRouteNameTaken(nameDraft.trim(), routeId) ? t("routeNameTaken") : undefined}
                            aria-label={t("routeNameLabel")}
                            variant="unstyled"
                            styles={{ input: { fontSize: "1.5rem", fontWeight: 700, height: "auto", paddingInline: 4 } }}
                        />
                    </div>

                    <section>
                        <Title order={3} mb="xs">
                            {t("stationsHeading")}
                        </Title>
                        <StationListEditor routeId={routeId} />
                    </section>

                    <section>
                        <Title order={3} mb="xs">
                            {t("trainTypesHeading")}
                        </Title>
                        <TrainTypeListEditor routeId={routeId} />
                    </section>
                </Stack>
            </Container>

            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title={t("helpTitle")}>
                <HelpSection title={t("helpDoSection")}>
                    <HelpList items={t_list("helpDoItems")} />
                </HelpSection>
                <HelpSection title={t("helpListSection")}>
                    <Text size="sm" c="dimmed" mb="xs">
                        {t("helpListNote")}
                    </Text>
                    <HelpShortcutTable rows={table("helpShortcuts")} />
                </HelpSection>
                <HelpSection title={t("helpSaveSection")}>
                    <Text size="sm" c="dimmed">
                        {t("helpSaveNote")}
                    </Text>
                </HelpSection>
            </HelpDialog>
        </Box>
    );
}

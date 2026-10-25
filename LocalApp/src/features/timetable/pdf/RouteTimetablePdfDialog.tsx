import { useMemo, useState } from "react";
import { Alert, Button, Group, Modal, NumberInput, Stack, Text } from "@mantine/core";
import type { StationDto } from "../../../domain/dto.ts";
import { PdfOrientationControl } from "../../../shared/pdf/PdfOrientationControl.tsx";
import { useFontSize } from "../../../shared/hooks/useFontSize.ts";
import { planRouteTimetable, type PdfOrientation } from "./routeTimetablePlan.ts";
import { DEFAULT_FONT_SIZE, MAX_FONT_SIZE, MIN_FONT_SIZE, setFontSize } from "../../../store/settings.ts";
import { useT } from "../messages.ts";
import { useCommonT } from "../../../shared/i18n/common.ts";
import { useT as usePdfT } from "../../../shared/pdf/messages.ts";

/**
 * 路線時刻表をPDFにする前に、文字サイズと用紙の向きを決めるダイアログです。
 * PDFはA4サイズで、画面と同じ寸法を文字サイズに合わせて拡大縮小して描きます。A4に収まらないときは、
 * 文字サイズを小さくしてもらいます。ここで変える文字サイズは、設定画面の「全体の文字サイズ」と同じ設定です（画面の表示にも反映されます）。
 *
 * @param props open:表示中か / onClose:閉じる / stations:駅（その方向の走行順） / direct:0:下り 1:上り / tripCount:列車の本数 / busy:PDFを作成中か / onCreate:作成する（用紙の向きを渡す）
 */
export function RouteTimetablePdfDialog(props: {
    open: boolean;
    onClose: () => void;
    stations: StationDto[];
    direct: number;
    tripCount: number;
    busy: boolean;
    onCreate: (orientation: PdfOrientation) => void;
}) {
    // 開くたびに本体を作り直し、用紙の向きの選択を初期状態に戻す
    if (!props.open) return null;
    return <RouteTimetablePdfBody {...props} />;
}

/**
 * ダイアログの本体。
 *
 * @param props RouteTimetablePdfDialogと同じ
 */
function RouteTimetablePdfBody({ onClose, stations, direct, tripCount, busy, onCreate }: Parameters<typeof RouteTimetablePdfDialog>[0]) {
    const { t } = useT();
    const c = useCommonT().t;
    const pdfT = usePdfT();
    const fontSize = useFontSize();
    const [orientation, setOrientation] = useState<PdfOrientation>("landscape");
    const plan = useMemo(() => planRouteTimetable(stations, direct, tripCount, fontSize, orientation), [stations, direct, tripCount, fontSize, orientation]);
    const fits = plan.overflow.length === 0;

    return (
        <Modal opened onClose={onClose} title={t("dlgTitle")} centered size="md" styles={{ title: { fontWeight: 700 } }}>
            <Stack gap="sm">
                <Text size="sm" c="dimmed">
                    {t("dlgIntro")}
                </Text>

                <Group gap="xs" wrap="nowrap" align="flex-end">
                    <NumberInput
                        label={t("dlgFontSize")}
                        value={fontSize}
                        onChange={(v) => setFontSize(typeof v === "number" ? v : Number(v))}
                        min={MIN_FONT_SIZE}
                        max={MAX_FONT_SIZE}
                        step={1}
                        suffix=" px"
                        style={{ width: 140 }}
                    />
                    <Button variant="default" size="compact-sm" onClick={() => setFontSize(DEFAULT_FONT_SIZE)} disabled={fontSize === DEFAULT_FONT_SIZE}>
                        {t("dlgResetFont", { size: DEFAULT_FONT_SIZE })}
                    </Button>
                </Group>
                <Text size="xs" c="dimmed">
                    {t("dlgFontNote", { min: MIN_FONT_SIZE, max: MAX_FONT_SIZE })}
                </Text>

                <PdfOrientationControl value={orientation} onChange={setOrientation} />

                {fits ? (
                    <Text size="sm">
                        {t("dlgPagesA", { orientation: pdfT.t(orientation === "landscape" ? "landscapeShort" : "portraitShort") })}
                        <b>{t("dlgPagesCount", { n: plan.totalPages })}</b>
                        {t("dlgPagesB", { cols: plan.colPages, stations: plan.stationChunks.length })}
                    </Text>
                ) : (
                    <Alert color="red" title={t("dlgOverflowTitle")}>
                        {plan.overflow.join(c("sentenceJoin"))}{c("sentenceEnd")} {t("dlgOverflowTail")}
                    </Alert>
                )}

                <Group justify="flex-end" gap="xs">
                    <Button variant="default" onClick={onClose}>
                        {c("cancel")}
                    </Button>
                    <Button onClick={() => onCreate(orientation)} loading={busy} disabled={!fits}>
                        {t("dlgCreate")}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

import { useT } from "../messages.ts";
import { useCommonT } from "../../../shared/i18n/common.ts";
import { useT as usePdfT } from "../../../shared/pdf/messages.ts";
import { useMemo, useState } from "react";
import { Alert, Button, Group, Modal, NumberInput, Stack, Text } from "@mantine/core";
import { PdfOrientationControl } from "../../../shared/pdf/PdfOrientationControl.tsx";
import type { DiagramStation } from "../DiagramData.ts";
import { DEFAULT_HOURS_PER_PAGE, DEFAULT_MARGIN_MM, planDiagramPdf, type DiagramPdfOptions } from "./diagramPdfPlan.ts";
import type { PdfOrientation } from "../../timetable/pdf/routeTimetablePlan.ts";

/**
 * ダイヤグラムをPDFにする前に、用紙の向き・余白・1ページの時間・高さを決めるダイアログです。
 * 横は午前3時から翌午前3時までを、1ページに入れる時間（初期は3時間）ごとにページに分けます。高さが用紙に入らないときは縦にも分けます。
 * どのページにも駅名欄を付けます。
 *
 * @param props open:表示中か / onClose:閉じる / stations:ダイヤグラムの駅 / busy:PDFを作成中か / onCreate:作成する（設定を渡す）
 */
export function DiagramPdfDialog(props: { open: boolean; onClose: () => void; stations: DiagramStation[]; busy: boolean; onCreate: (options: DiagramPdfOptions) => void }) {
    // 開くたびに本体を作り直し、設定を初期状態に戻す
    if (!props.open) return null;
    return <DiagramPdfBody {...props} />;
}

/**
 * ダイアログの本体。
 *
 * @param props DiagramPdfDialogと同じ
 */
function DiagramPdfBody({ onClose, stations, busy, onCreate }: Parameters<typeof DiagramPdfDialog>[0]) {
    const { t } = useT();
    const c = useCommonT().t;
    const pdfT = usePdfT();
    const [orientation, setOrientation] = useState<PdfOrientation>("landscape");
    const [marginMm, setMarginMm] = useState<number>(DEFAULT_MARGIN_MM);
    const [hoursPerPage, setHoursPerPage] = useState<number>(DEFAULT_HOURS_PER_PAGE);
    // nullは「用紙の高さいっぱい」
    const [heightMm, setHeightMm] = useState<number | null>(null);

    const options = useMemo<DiagramPdfOptions>(() => ({ orientation, marginMm, hoursPerPage, heightMm }), [orientation, marginMm, hoursPerPage, heightMm]);
    const plan = useMemo(() => planDiagramPdf(stations, options), [stations, options]);
    const fits = plan.overflow.length === 0;

    return (
        <Modal opened onClose={onClose} title={t("dlgTitle")} centered size="md" styles={{ title: { fontWeight: 700 } }}>
            <Stack gap="sm">
                <Text size="sm" c="dimmed">
                    {t("dlgIntro")}
                </Text>

                <PdfOrientationControl value={orientation} onChange={setOrientation} />

                <Group gap="sm" align="flex-end" wrap="wrap">
                    <NumberInput label={t("margin")} value={marginMm} onChange={(v) => setMarginMm(Math.max(0, Number(v) || 0))} min={0} max={40} step={1} suffix=" mm" style={{ width: 110 }} />
                    <NumberInput
                        label={t("hoursPerPage")}
                        value={hoursPerPage}
                        onChange={(v) => setHoursPerPage(Math.min(24, Math.max(1, Math.round(Number(v) || DEFAULT_HOURS_PER_PAGE))))}
                        min={1}
                        max={24}
                        step={1}
                        suffix={t("hoursSuffix")}
                        style={{ width: 150 }}
                    />
                    <NumberInput
                        label={t("height")}
                        value={heightMm ?? plan.fitHeightMm}
                        onChange={(v) => setHeightMm(v === "" ? null : Math.max(20, Number(v) || 20))}
                        min={20}
                        step={10}
                        suffix=" mm"
                        style={{ width: 120 }}
                    />
                    <Button variant="default" size="compact-sm" onClick={() => setHeightMm(null)} disabled={heightMm == null}>
                        {t("fitPaper")}
                    </Button>
                </Group>
                <Text size="xs" c="dimmed">
                    {t("splitNote")}
                </Text>

                {fits ? (
                    <Text size="sm">
                        {t("pagesA", { orientation: pdfT.t(orientation === "landscape" ? "landscapeShort" : "portraitShort") })}
                        <b>{t("pagesCount", { n: plan.totalPages })}</b>
                        {t("pagesB", { x: plan.pagesX, y: plan.slices })}
                    </Text>
                ) : (
                    <Alert color="red" title={t("cannotMake")}>
                        {plan.overflow.join(c("sentenceJoin"))}{c("sentenceEnd")}
                    </Alert>
                )}

                <Group justify="flex-end" gap="xs">
                    <Button variant="default" onClick={onClose}>
                        {c("cancel")}
                    </Button>
                    <Button onClick={() => onCreate(options)} loading={busy} disabled={!fits}>
                        {t("create")}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

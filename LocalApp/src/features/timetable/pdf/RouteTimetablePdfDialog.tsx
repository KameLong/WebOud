import { useMemo, useState } from "react";
import { Alert, Button, Group, Modal, NumberInput, Stack, Text } from "@mantine/core";
import type { StationDto } from "../../../domain/dto.ts";
import { PdfOrientationControl } from "../../../shared/pdf/PdfOrientationControl.tsx";
import { useFontSize } from "../../../shared/hooks/useFontSize.ts";
import { planRouteTimetable, type PdfOrientation } from "./routeTimetablePlan.ts";
import { DEFAULT_FONT_SIZE, MAX_FONT_SIZE, MIN_FONT_SIZE, setFontSize } from "../../../store/settings.ts";

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
    const fontSize = useFontSize();
    const [orientation, setOrientation] = useState<PdfOrientation>("landscape");
    const plan = useMemo(() => planRouteTimetable(stations, direct, tripCount, fontSize, orientation), [stations, direct, tripCount, fontSize, orientation]);
    const fits = plan.overflow.length === 0;

    return (
        <Modal opened onClose={onClose} title="PDF出力（A4）" centered size="md" styles={{ title: { fontWeight: 700 } }}>
            <Stack gap="sm">
                <Text size="sm" c="dimmed">
                    この方向の時刻表を、A4用紙のPDFにします。画面と同じ寸法で描くので、文字サイズに合わせてページ数が変わります。
                </Text>

                <Group gap="xs" wrap="nowrap" align="flex-end">
                    <NumberInput
                        label="文字サイズ"
                        value={fontSize}
                        onChange={(v) => setFontSize(typeof v === "number" ? v : Number(v))}
                        min={MIN_FONT_SIZE}
                        max={MAX_FONT_SIZE}
                        step={1}
                        suffix=" px"
                        style={{ width: 140 }}
                    />
                    <Button variant="default" size="compact-sm" onClick={() => setFontSize(DEFAULT_FONT_SIZE)} disabled={fontSize === DEFAULT_FONT_SIZE}>
                        既定に戻す（{DEFAULT_FONT_SIZE}px）
                    </Button>
                </Group>
                <Text size="xs" c="dimmed">
                    設定画面の「全体の文字サイズ」と共通の設定です。変更すると、画面の表示にも反映されます（{MIN_FONT_SIZE}〜{MAX_FONT_SIZE}px）。
                </Text>

                <PdfOrientationControl value={orientation} onChange={setOrientation} />

                {fits ? (
                    <Text size="sm">
                        A4{orientation === "landscape" ? "横" : "縦"}で <b>{plan.totalPages} ページ</b>になります（列車の列 {plan.colPages} × 駅 {plan.stationChunks.length}）。どのページにも駅名欄を表示します。
                    </Text>
                ) : (
                    <Alert color="red" title="A4に収まらない部分があります">
                        {plan.overflow.join("。")}。文字サイズを小さくしてください。
                    </Alert>
                )}

                <Group justify="flex-end" gap="xs">
                    <Button variant="default" onClick={onClose}>
                        キャンセル
                    </Button>
                    <Button onClick={() => onCreate(orientation)} loading={busy} disabled={!fits}>
                        PDFを作成
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

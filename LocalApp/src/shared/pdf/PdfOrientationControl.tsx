import { useT } from "./messages.ts";
import { SegmentedControl, Text } from "@mantine/core";
import type { PdfOrientation } from "../../features/timetable/pdf/routeTimetablePlan.ts";

/**
 * PDFダイアログ共通の、用紙の向き（A4横・縦）の選択欄です。
 *
 * @param props value:選択中の向き / onChange:選択したとき
 */
export function PdfOrientationControl({ value, onChange }: { value: PdfOrientation; onChange: (value: PdfOrientation) => void }) {
    const { t } = useT();
    return (
        <div>
            <Text size="sm" fw={500} mb={4}>
                {t("orientation")}
            </Text>
            <SegmentedControl
                value={value}
                onChange={(v) => onChange(v as PdfOrientation)}
                data={[
                    { value: "landscape", label: t("landscape") },
                    { value: "portrait", label: t("portrait") },
                ]}
            />
        </div>
    );
}

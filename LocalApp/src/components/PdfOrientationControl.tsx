import { SegmentedControl, Text } from "@mantine/core";
import type { PdfOrientation } from "../pdf/routeTimetablePlan.ts";

/**
 * PDFダイアログ共通の、用紙の向き（A4横・縦）の選択欄です。
 *
 * @param props value:選択中の向き / onChange:選択したとき
 */
export function PdfOrientationControl({ value, onChange }: { value: PdfOrientation; onChange: (value: PdfOrientation) => void }) {
    return (
        <div>
            <Text size="sm" fw={500} mb={4}>
                用紙の向き
            </Text>
            <SegmentedControl
                value={value}
                onChange={(v) => onChange(v as PdfOrientation)}
                data={[
                    { value: "landscape", label: "A4 横" },
                    { value: "portrait", label: "A4 縦" },
                ]}
            />
        </div>
    );
}

import { translate, useT } from "./messages.ts";
import { commonT } from "../../shared/i18n/common.ts";
import { useNavigate, useParams } from "react-router-dom";
import { DiagramView } from "./DiagramView.tsx";
import { useTimetable } from "../../store/useTimetableData.ts";
import { useDiagramLines } from "./useDiagramLines.ts";
import { useMemo, useState } from "react";
import { HelpDialog, HelpList, HelpSection } from "../../shared/ui/HelpDialog.tsx";
import { helpButtonStyle } from "../../shared/ui/helpButtonStyle.ts";
import { DiagramPdfDialog } from "./pdf/DiagramPdfDialog.tsx";
import { usePdfExport } from "../../shared/pdf/usePdfExport.ts";
import { getRoute } from "../../store/localStore.ts";
import { downloadBytes, loadPdfFonts, subsetFontInBrowser } from "../../shared/pdf/pdfFonts.ts";
import type { DiagramPdfOptions } from "./pdf/diagramPdfPlan.ts";

export function RouteDiagramPage() {
    const params = useParams<{ routeId: string }>();
    const routeId = Number(params.routeId ?? 0);
    const navigate = useNavigate();
    const [helpOpen, setHelpOpen] = useState(false);
    const [pdfOpen, setPdfOpen] = useState(false);
    const { t, tl } = useT();
    const pdf = usePdfExport();

    // 上り・下り両方の列車をまとめて表示するため、方向で絞らずに取得する
    const timetable = useTimetable(routeId);
    const stations = useMemo(() => [...timetable.stations].sort((a, b) => a.index - b.index), [timetable.stations]);
    const allTrips = useMemo(() => timetable.trips.filter((t) => t.id !== -1), [timetable.trips]);
    const diagramData = useDiagramLines(stations, timetable.trainTypes, allTrips);

    const exportPdf = (options: DiagramPdfOptions) =>
        pdf.run(async () => {
            // PDFライブラリは大きいので、PDF出力を押したときに初めて読み込む
            const { buildDiagramPdf } = await import("./pdf/diagramPdf.ts");
            const fonts = await loadPdfFonts();
            const routeName = getRoute(routeId)?.name ?? commonT().t("routeFallbackName");
            const bytes = await buildDiagramPdf({ routeName, stations: diagramData.diaStations, downLines: diagramData.downLines, upLines: diagramData.upLines, options }, fonts, subsetFontInBrowser);
            downloadBytes(bytes, `${routeName}_${translate().t("pdfFileSuffix")}.pdf`);
            setPdfOpen(false);
        });

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 10 }}>
                <button onClick={() => navigate(`/route/${routeId}`)}>{t("backToEdit")}</button>
                <button onClick={() => setPdfOpen(true)} style={{ marginLeft: "auto" }}>
                    {t("pdfButton")}
                </button>
                <button onClick={() => setHelpOpen(true)} style={{ ...helpButtonStyle }} title={t("help")}>
                    ？
                </button>
            </div>
            {pdf.error && <div style={{ padding: "0 10px", color: "crimson" }}>{t("pdfFailed", { message: pdf.error })}</div>}
            <DiagramPdfDialog open={pdfOpen} onClose={() => setPdfOpen(false)} stations={diagramData.diaStations} busy={pdf.busy} onCreate={(o) => void exportPdf(o)} />
            <div style={{ flex: 1, overflow: "hidden" }}>
                <DiagramView routeStations={diagramData.diaStations} upLines={diagramData.upLines} downLines={diagramData.downLines} />
            </div>
            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title={t("helpTitle")}>
                <HelpSection title={t("helpDoSection")}>
                    <HelpList items={tl("helpDoItems")} />
                </HelpSection>
                <HelpSection title={t("helpViewSection")}>
                    <HelpList items={tl("helpViewItems")} />
                </HelpSection>
            </HelpDialog>
        </div>
    );
}

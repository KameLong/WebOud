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
            const routeName = getRoute(routeId)?.name ?? "路線";
            const bytes = await buildDiagramPdf({ routeName, stations: diagramData.diaStations, downLines: diagramData.downLines, upLines: diagramData.upLines, options }, fonts, subsetFontInBrowser);
            downloadBytes(bytes, `${routeName}_ダイヤグラム.pdf`);
            setPdfOpen(false);
        });

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 10 }}>
                <button onClick={() => navigate(`/route/${routeId}`)}>← 路線編集へ</button>
                <button onClick={() => setPdfOpen(true)} style={{ marginLeft: "auto" }}>
                    PDF出力
                </button>
                <button onClick={() => setHelpOpen(true)} style={{ ...helpButtonStyle }} title="ヘルプ">
                    ？
                </button>
            </div>
            {pdf.error && <div style={{ padding: "0 10px", color: "crimson" }}>PDFを作成できませんでした：{pdf.error}</div>}
            <DiagramPdfDialog open={pdfOpen} onClose={() => setPdfOpen(false)} stations={diagramData.diaStations} busy={pdf.busy} onCreate={(o) => void exportPdf(o)} />
            <div style={{ flex: 1, overflow: "hidden" }}>
                <DiagramView routeStations={diagramData.diaStations} upLines={diagramData.upLines} downLines={diagramData.downLines} />
            </div>
            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title="ダイヤグラム - ヘルプ">
                <HelpSection title="このページでできること">
                    <HelpList
                        items={[
                            "登録されている下り・上りすべての列車の運行ダイヤを時刻表ダイヤグラムとして表示する（編集はできません）",
                            "「PDF出力」ボタンで、A4のPDFにする（余白・1ページの時間・高さを指定でき、どのページにも駅名欄が付く）",
                            "左のメニュー（スマホでは下部のメニューボタン）から、時刻表の編集画面へ移動する",
                        ]}
                    />
                </HelpSection>
                <HelpSection title="表示操作">
                    <HelpList
                        items={[
                            "スクロール（マウスホイール／スクロールバー）：表示位置を上下左右に移動",
                            "Ctrlキーを押しながらホイールを上下：縦方向（駅の間隔）を拡大縮小",
                            "Ctrlキーを押しながら横方向のホイール入力（トラックパッドの横スワイプなど）：横方向（時間軸）を拡大縮小",
                            "タッチ操作：1本指のスワイプで表示位置を移動",
                            "タッチ操作（2本指のピンチ）：指の間隔が横に広いときは時間軸、縦に広いときは駅軸を拡大縮小",
                        ]}
                    />
                </HelpSection>
            </HelpDialog>
        </div>
    );
}

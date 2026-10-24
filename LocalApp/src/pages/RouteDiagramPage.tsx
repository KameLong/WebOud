import { useNavigate, useParams } from "react-router-dom";
import { DiagramView } from "../diagram/DiagramView.tsx";
import { useTimetableData } from "../hooks/useTimetableData.ts";
import { useDiagramViewHook2 } from "../diagram/diagramHook.ts";
import { getTimetable } from "../store/timetableApi.ts";
import { useMemo, useState } from "react";
import { HelpDialog, HelpList, HelpSection, helpButtonStyle } from "../components/HelpDialog.tsx";
import { DiagramPdfDialog } from "../components/DiagramPdfDialog.tsx";
import { getRoute } from "../store/localStore.ts";
import { downloadBytes, loadPdfFonts, subsetFontInBrowser } from "../pdf/pdfFonts.ts";
import type { DiagramPdfOptions } from "../pdf/diagramPdfPlan.ts";

export function RouteDiagramPage() {
    const params = useParams<{ routeId: string }>();
    const routeId = Number(params.routeId ?? 0);
    const navigate = useNavigate();
    const [helpOpen, setHelpOpen] = useState(false);
    const [pdfOpen, setPdfOpen] = useState(false);
    const [pdfBusy, setPdfBusy] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);

    // 上り・下り両方の列車をまとめて表示するため、方向フィルタなしで取得
    const { stations, traintypes, loading, error } = useTimetableData(routeId, 0);
    const allTrips = useMemo(() => getTimetable(routeId).trips.filter((t) => t.id !== -1), [routeId, stations, traintypes]);
    const diagramData = useDiagramViewHook2(stations, traintypes, allTrips);

    const exportPdf = async (options: DiagramPdfOptions) => {
        if (pdfBusy) return;
        setPdfBusy(true);
        setPdfError(null);
        try {
            // PDFライブラリは大きいので、PDF出力を押したときに初めて読み込む
            const { buildDiagramPdf } = await import("../pdf/diagramPdf.ts");
            const fonts = await loadPdfFonts();
            const routeName = getRoute(routeId)?.name ?? "路線";
            const bytes = await buildDiagramPdf({ routeName, stations: diagramData.diaStations, downLines: diagramData.downLines, upLines: diagramData.upLines, options }, fonts, subsetFontInBrowser);
            downloadBytes(bytes, `${routeName}_ダイヤグラム.pdf`);
            setPdfOpen(false);
        } catch (e) {
            setPdfError(e instanceof Error ? e.message : String(e));
        } finally {
            setPdfBusy(false);
        }
    };

    if (loading) return <div style={{ padding: 12 }}>loading...</div>;
    if (error) return <div style={{ padding: 12, color: "crimson" }}>{error}</div>;

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
            {pdfError && <div style={{ padding: "0 10px", color: "crimson" }}>PDFを作成できませんでした：{pdfError}</div>}
            <DiagramPdfDialog open={pdfOpen} onClose={() => setPdfOpen(false)} stations={diagramData.diaStations} busy={pdfBusy} onCreate={(o) => void exportPdf(o)} />
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

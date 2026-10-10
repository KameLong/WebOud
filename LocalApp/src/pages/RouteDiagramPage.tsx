import { useNavigate, useParams } from "react-router-dom";
import { DiagramView } from "../diagram/DiagramView.tsx";
import { useTimetableData } from "../hooks/useTimetableData.ts";
import { useDiagramViewHook2 } from "../diagram/diagramHook.ts";
import { getTimetable } from "../store/timetableApi.ts";
import { useMemo, useState } from "react";
import { HelpDialog, HelpList, HelpSection, helpButtonStyle } from "../components/HelpDialog.tsx";

export function RouteDiagramPage() {
    const params = useParams<{ routeId: string }>();
    const routeId = Number(params.routeId ?? 0);
    const navigate = useNavigate();
    const [helpOpen, setHelpOpen] = useState(false);

    // 上り・下り両方の列車をまとめて表示するため、方向フィルタなしで取得
    const { stations, traintypes, loading, error } = useTimetableData(routeId, 0);
    const allTrips = useMemo(() => getTimetable(routeId).trips.filter((t) => t.id !== -1), [routeId, stations, traintypes]);
    const diagramData = useDiagramViewHook2(stations, traintypes, allTrips);

    if (loading) return <div style={{ padding: 12 }}>loading...</div>;
    if (error) return <div style={{ padding: 12, color: "crimson" }}>{error}</div>;

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 10 }}>
                <button onClick={() => navigate(`/route/${routeId}`)}>← 路線編集へ</button>
                <button onClick={() => setHelpOpen(true)} style={{ ...helpButtonStyle, marginLeft: "auto" }} title="ヘルプ">
                    ？
                </button>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
                <DiagramView routeStations={diagramData.diaStations} upLines={diagramData.upLines} downLines={diagramData.downLines} />
            </div>
            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title="ダイヤグラム - ヘルプ">
                <HelpSection title="このページでできること">
                    <HelpList
                        items={[
                            "登録されている下り・上りすべての列車の運行ダイヤを時刻表ダイヤグラムとして表示する（編集はできません）",
                            "左のメニュー（スマホでは下部のメニューボタン）から、時刻表の編集画面へ移動する",
                        ]}
                    />
                </HelpSection>
                <HelpSection title="表示操作">
                    <HelpList
                        items={[
                            "スクロール（マウスホイール／スクロールバー）：表示位置を上下左右に移動",
                            "Ctrlキーを押しながらマウスホイール：縦方向（時間軸）・横方向（駅軸）に拡大縮小",
                            "タッチ操作（2本指）：ピンチで拡大縮小、スワイプで表示位置を移動",
                        ]}
                    />
                </HelpSection>
            </HelpDialog>
        </div>
    );
}

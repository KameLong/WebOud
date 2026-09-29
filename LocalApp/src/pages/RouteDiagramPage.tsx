import { useNavigate, useParams } from "react-router-dom";
import { DiagramView } from "../diagram/DiagramView.tsx";
import { useTimetableData } from "../hooks/useTimetableData.ts";
import { useDiagramViewHook2 } from "../diagram/diagramHook.ts";
import { getTimetable } from "../store/timetableApi.ts";
import { useMemo } from "react";

export function RouteDiagramPage() {
    const params = useParams<{ routeId: string }>();
    const routeId = Number(params.routeId ?? 0);
    const navigate = useNavigate();

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
                <button onClick={() => navigate(`/route/${routeId}/timetable/0`)}>下り時刻表</button>
                <button onClick={() => navigate(`/route/${routeId}/timetable/1`)}>上り時刻表</button>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
                <DiagramView routeStations={diagramData.diaStations} upLines={diagramData.upLines} downLines={diagramData.downLines} />
            </div>
        </div>
    );
}

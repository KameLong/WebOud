import StationListPage from "./StationListPage.tsx";
import { useNavigate, useParams } from "react-router-dom";
import TrainTypeListPage from "./TrainTypeListPage.tsx";
import { useSyncExternalStore } from "react";
import { getRoute, renameRoute, subscribe } from "../store/localStore.ts";

export function RoutePage() {
    const urlParams = useParams<{ routeId: string }>();
    const routeId: number = Number(urlParams.routeId);
    const nav = useNavigate();

    const route = useSyncExternalStore(subscribe, () => getRoute(routeId));

    if (!route) {
        return (
            <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
                路線が見つかりません。
                <button onClick={() => nav("/")} style={{ marginLeft: 8 }}>
                    路線一覧へ戻る
                </button>
            </div>
        );
    }

    return (
        <div style={{ overflow: "auto", height: "100%" }}>
            <div style={{ maxWidth: 1000, margin: "24px auto", padding: "16px 16px 0" }}>
                <button onClick={() => nav("/")}>← 路線一覧へ</button>
                <h1 style={{ marginBottom: 4 }}>
                    <input
                        value={route.name}
                        onChange={(e) => renameRoute(routeId, e.target.value)}
                        style={{ fontSize: "1.5rem", fontWeight: 700, border: "1px solid transparent", padding: 4, width: "100%", boxSizing: "border-box" }}
                    />
                </h1>
            </div>

            <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
                <h2>駅編集</h2>
                <StationListPage routeId={routeId} />
            </div>
            <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
                <h2>種別編集</h2>
                <TrainTypeListPage routeId={routeId} />
            </div>
            <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16, display: "flex", gap: 12 }}>
                <button onClick={() => nav(`/route/${routeId}/timetable/0`)}>下り時刻表</button>
                <button onClick={() => nav(`/route/${routeId}/timetable/1`)}>上り時刻表</button>
                <button onClick={() => nav(`/route/${routeId}/diagram`)}>ダイヤグラム</button>
            </div>
        </div>
    );
}

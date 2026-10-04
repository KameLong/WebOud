import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { listRoutes, subscribe } from "../store/localStore.ts";

type ActivePage = "edit" | "down" | "up" | "diagram" | null;

/** 現在のURLから、アクティブな路線IDと表示中のページ種別を判定する */
function parseActive(pathname: string): { routeId: number | null; page: ActivePage } {
    const m = pathname.match(/^\/route\/(\d+)(?:\/timetable\/(\d+)|\/diagram)?\/?$/);
    if (!m) return { routeId: null, page: null };
    const routeId = Number(m[1]);
    if (pathname.endsWith("/diagram")) return { routeId, page: "diagram" };
    if (m[2] != null) return { routeId, page: m[2] === "1" ? "up" : "down" };
    return { routeId, page: "edit" };
}

/**
 * PCレイアウト用の左サイドバー。全路線をツリーのルートとして表示し、
 * 各路線行の▶/▼で開閉する(複数の路線を同時に開いておける)。
 * 現在表示中の路線は自動的に開いた状態になる。
 */
export function RouteTreeSidebar() {
    const nav = useNavigate();
    const location = useLocation();
    const routes = useSyncExternalStore(subscribe, listRoutes);
    const { routeId: activeRouteId, page: activePage } = parseActive(location.pathname);

    const [openIds, setOpenIds] = useState<Set<number>>(() => new Set(activeRouteId != null ? [activeRouteId] : []));

    // 表示中の路線は常に展開しておく
    useEffect(() => {
        if (activeRouteId == null) return;
        setOpenIds((prev) => (prev.has(activeRouteId) ? prev : new Set(prev).add(activeRouteId)));
    }, [activeRouteId]);

    function toggle(id: number) {
        setOpenIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    return (
        <div
            className="route-tree-sidebar"
            style={{
                width: 220,
                flexShrink: 0,
                height: "100%",
                overflowY: "auto",
                borderRight: "1px solid #ddd",
                background: "#fafafa",
                boxSizing: "border-box",
            }}
        >
            <div
                onClick={() => nav("/")}
                style={{ padding: "10px 12px", borderBottom: "1px solid #ddd", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#0f5b8a" }}
            >
                ← 路線一覧
            </div>

            <div style={{ padding: "4px 0" }}>
                {routes.map((r) => {
                    const isOpen = openIds.has(r.id);
                    const isActiveRoute = activeRouteId === r.id;

                    return (
                        <div key={r.id}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "6px 8px",
                                    fontWeight: isActiveRoute ? 700 : 400,
                                }}
                            >
                                <span
                                    onClick={() => toggle(r.id)}
                                    style={{ width: 16, textAlign: "center", color: "#666", cursor: "pointer", userSelect: "none" }}
                                >
                                    {isOpen ? "▼" : "▶"}
                                </span>
                                <span
                                    onClick={() => nav(`/route/${r.id}`)}
                                    title={r.name}
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        cursor: "pointer",
                                        background: isActiveRoute && activePage === "edit" ? "#e6f2ff" : undefined,
                                    }}
                                >
                                    {r.name}
                                </span>
                            </div>

                            {isOpen && (
                                <div>
                                    <SidebarItem label="路線編集" active={isActiveRoute && activePage === "edit"} onClick={() => nav(`/route/${r.id}`)} />
                                    <SidebarItem label="下り時刻表" active={isActiveRoute && activePage === "down"} onClick={() => nav(`/route/${r.id}/timetable/0`)} />
                                    <SidebarItem label="上り時刻表" active={isActiveRoute && activePage === "up"} onClick={() => nav(`/route/${r.id}/timetable/1`)} />
                                    <SidebarItem label="ダイヤグラム" active={isActiveRoute && activePage === "diagram"} onClick={() => nav(`/route/${r.id}/diagram`)} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SidebarItem(props: { label: string; active: boolean; onClick: () => void }) {
    return (
        <div
            onClick={props.onClick}
            style={{
                padding: "6px 8px 6px 32px",
                cursor: "pointer",
                fontSize: 13,
                background: props.active ? "#e6f2ff" : undefined,
                fontWeight: props.active ? 700 : 400,
            }}
        >
            {props.label}
        </div>
    );
}

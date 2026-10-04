import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { listRoutes, subscribe } from "../store/localStore.ts";

type ActivePage = "edit" | "down" | "up" | "diagram" | null;

/**
 * 現在のURLから、アクティブな路線IDと表示中のページ種別を判定する
 *
 * @param pathname 現在のURLパス
 */
function parseActive(pathname: string): { routeId: number | null; page: ActivePage } {
    const m = pathname.match(/^\/route\/(\d+)(?:\/timetable\/(\d+)|\/diagram)?\/?$/);
    if (!m) return { routeId: null, page: null };
    const routeId = Number(m[1]);
    if (pathname.endsWith("/diagram")) return { routeId, page: "diagram" };
    if (m[2] != null) return { routeId, page: m[2] === "1" ? "up" : "down" };
    return { routeId, page: "edit" };
}

/**
 * 全路線をツリーのルートとして表示する一覧本体。PC版の常設サイドバーと
 * スマホ版のボトムシートの両方から共有する(onNavigateは画面遷移後に
 * シートを閉じるなど、呼び出し側固有の後処理のために呼ばれる)。
 * 各路線行の▶/▼で開閉する(複数の路線を同時に開いておける)。
 * 現在表示中の路線は自動的に開いた状態になる。
 *
 * @param props onNavigate:遷移後の後処理（ボトムシートを閉じる等）
 */
export function RouteTreeList(props: { onNavigate?: () => void }) {
    const { onNavigate } = props;
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

    /**
     * 路線の開閉を切り替えます。
     *
     * @param id 開閉する路線ID
     */
    function toggle(id: number) {
        setOpenIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    /**
     * 指定パスへ遷移し、onNavigateを呼びます。
     *
     * @param path 遷移先のパス
     */
    function go(path: string) {
        nav(path);
        onNavigate?.();
    }

    return (
        <>
            <div
                onClick={() => go("/")}
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
                                    onClick={() => go(`/route/${r.id}`)}
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
                                    <TreeItem label="路線編集" active={isActiveRoute && activePage === "edit"} onClick={() => go(`/route/${r.id}`)} />
                                    <TreeItem label="下り時刻表" active={isActiveRoute && activePage === "down"} onClick={() => go(`/route/${r.id}/timetable/0`)} />
                                    <TreeItem label="上り時刻表" active={isActiveRoute && activePage === "up"} onClick={() => go(`/route/${r.id}/timetable/1`)} />
                                    <TreeItem label="ダイヤグラム" active={isActiveRoute && activePage === "diagram"} onClick={() => go(`/route/${r.id}/diagram`)} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

/**
 * ツリーの1項目を描画します。
 *
 * @param props label:表示名 / active:現在のページか / onClick:クリック時の処理
 */
function TreeItem(props: { label: string; active: boolean; onClick: () => void }) {
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

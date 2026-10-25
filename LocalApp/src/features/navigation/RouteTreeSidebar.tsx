import { RouteTreeList } from "./RouteTreeList.tsx";

/** PCレイアウト用の左サイドバー。常設の路線ツリー(RouteTreeList)を表示する。 */
export function RouteTreeSidebar() {
    return (
        <div
            className="route-tree-sidebar"
            style={{
                width: 180,
                flexShrink: 0,
                height: "100%",
                overflowY: "auto",
                borderRight: "1px solid #ddd",
                background: "#fafafa",
                boxSizing: "border-box",
            }}
        >
            <RouteTreeList />
        </div>
    );
}

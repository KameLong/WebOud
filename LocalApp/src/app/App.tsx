import "./App.css";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import RouteListPage from "../features/route-list/RouteListPage.tsx";
import SettingsPage from "../features/settings/SettingsPage.tsx";
import { RoutePage } from "../features/route-edit/RoutePage.tsx";
import RouteTimetablePage from "../features/timetable/RouteTimetablePage.tsx";
import { RouteDiagramPage } from "../features/diagram/RouteDiagramPage.tsx";
import { StationTimetablePage } from "../features/station-timetable/StationTimetablePage.tsx";
import AnalysisPage from "../features/analysis/AnalysisPage.tsx";
import { RouteTreeSidebar } from "../features/navigation/RouteTreeSidebar.tsx";
import { MobileRouteMenu } from "../features/navigation/MobileRouteMenu.tsx";

/** レイアウト：PC幅では左に路線ツリー、スマホ幅では下部のボトムシートメニューを表示する */
function RouteLayout() {
    return (
        <div style={{ display: "flex", height: "100%" }}>
            <RouteTreeSidebar />
            <div style={{ flex: 1, minWidth: 0, height: "100%", overflow: "hidden" }}>
                <Outlet />
            </div>
            <MobileRouteMenu />
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<RouteListPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route element={<RouteLayout />}>
                    <Route path="/route/:routeId" element={<RoutePage />} />
                    <Route path="/route/:routeId/timetable/:direct" element={<RouteTimetablePage />} />
                    <Route path="/route/:routeId/diagram" element={<RouteDiagramPage />} />
                    <Route path="/route/:routeId/station/:stationId" element={<StationTimetablePage />} />
                    <Route path="/route/:routeId/analysis" element={<AnalysisPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;

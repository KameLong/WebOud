import "./App.css";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import RouteListPage from "./pages/RouteListPage.tsx";
import { RoutePage } from "./pages/RoutePage.tsx";
import RouteTimetablePage from "./pages/RouteTimetablePage.tsx";
import { RouteDiagramPage } from "./pages/RouteDiagramPage.tsx";
import { RouteTreeSidebar } from "./components/RouteTreeSidebar.tsx";
import { MobileRouteMenu } from "./components/MobileRouteMenu.tsx";

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
                <Route element={<RouteLayout />}>
                    <Route path="/route/:routeId" element={<RoutePage />} />
                    <Route path="/route/:routeId/timetable/:direct" element={<RouteTimetablePage />} />
                    <Route path="/route/:routeId/diagram" element={<RouteDiagramPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;

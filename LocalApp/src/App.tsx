import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import RouteListPage from "./pages/RouteListPage.tsx";
import { RoutePage } from "./pages/RoutePage.tsx";
import RouteTimetablePage from "./pages/RouteTimetablePage.tsx";
import { RouteDiagramPage } from "./pages/RouteDiagramPage.tsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<RouteListPage />} />
                <Route path="/route/:routeId" element={<RoutePage />} />
                <Route path="/route/:routeId/timetable/:direct" element={<RouteTimetablePage />} />
                <Route path="/route/:routeId/diagram" element={<RouteDiagramPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;

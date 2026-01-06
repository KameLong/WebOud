import './App.css'
import {BrowserRouter, Route, Routes} from "react-router-dom";
import StationListPage from "./Page/StationList.tsx";
import TrainTypeListPage from "./Page/TrainTypeList.tsx";
import RouteTimetablePage from "./RouteTimeTable/RouteTimetablePage.tsx";
import RouteListPage from "./Route/RouteListPage.tsx";
import RouteCreatePage from "./Route/RouteCreatePage.tsx";
import {RoutePage} from "./Route/RoutePage.tsx";

function App() {

  return (
      <BrowserRouter>
        <Routes>
            <Route path="/" element={<RouteListPage />} />
            <Route path="/route/:routeID" element={<RoutePage />} />

            <Route path="/routes/new" element={<RouteCreatePage />} />
            <Route path="/timetable/:routeID/:direct" element={<RouteTimetablePage />} />
            <Route path="/stationList/" element={<StationListPage routeId={1}/>} />
            <Route path="/trainTypeList/" element={<TrainTypeListPage routeId={1}/>} />
        </Routes>
      </BrowserRouter>
  )
}

export default App

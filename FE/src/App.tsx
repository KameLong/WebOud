import './App.css'
import {BrowserRouter, Route, Routes} from "react-router-dom";
import StationListPage from "./Page/StationList.tsx";
import TrainTypeListPage from "./Page/TrainTypeList.tsx";
import {Test} from "./Page/Test.tsx";
import RouteTimetablePage from "./RouteTimeTable/RouteTimetablePage.tsx";

function App() {

  return (
      <BrowserRouter>
        <Routes>
            <Route path="/" element={<Test />} />
          <Route path="timetable/" element={<RouteTimetablePage />} />
            <Route path="stationList/" element={<StationListPage routeId={1}/>} />
            <Route path="trainTypeList/" element={<TrainTypeListPage routeId={1}/>} />
        </Routes>
      </BrowserRouter>
  )
}

export default App

import React from "react";
import StationListPage from "../Page/StationList.tsx";
import {useNavigate,  useParams} from "react-router-dom";
import TrainTypeListPage from "../Page/TrainTypeList.tsx";

export function RoutePage(){
    const urlParams = useParams<{ routeID: string }>()
    const routeID:number=Number(urlParams.routeID);
    const nav = useNavigate();
    return(
        <div style={{overflow:"auto",height:'100%'}}>
        <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
            <h2>
                駅編集
            </h2>
            <StationListPage routeId={routeID}/>
        </div>
            <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
                <h2>
                    種別編集
                </h2>
                <TrainTypeListPage routeId={routeID}/>
            </div>
            <div>
                <a onClick={()=>{
                    nav(`/timetable/${routeID}/0`);
                }}>下り時刻表</a>

            </div>

        </div>
    )
}
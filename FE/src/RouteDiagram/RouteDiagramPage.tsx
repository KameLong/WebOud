
import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from "react-router-dom";
import {DiagramView} from "./DiagramView.tsx";
import type {DiagramStation} from "./DiagramData.ts";
import type {DiagramLine} from "./DiagramCanvas.ts";



interface DiagramPageProps {
    webOuDia:WebOuDia;
}

export interface WebOuDia{
    // snackbar:useSnackbarProps;

    AppTitle: string;
    setAppTitle(value: string): void;

    showDeleteIcon:boolean;
    setShowDeleteIcon(value: boolean): void;
    showSaveIcon:boolean;
    setShowSaveIcon(value: boolean): void;

    showBottomIcon:boolean;
    setShowBottomIcon(value: boolean): void;

    menuOpen:boolean;
    setMenuOpen(value: boolean): void;


    webOuDiaEvent:EventTarget;

    // diaData: {[key:number]:LineFile};
    // setDiaData: React.Dispatch<React.SetStateAction<{[key:number]:LineFile}>>;
    // getEditLineFile:(line:number)=>EditLineFileReturn;
}

function useWebOuDia():WebOuDia{
    const [AppTitle, setAppTitle] = useState("WebDia");
    // const snackbar=useSnackbar();
    const [menuOpen, setMenuOpen] = useState(false);
    // const lineFiles=editLineFile();

    const [showDeleteIcon, setShowDeleteIcon] = useState(false);
    const [showSaveIcon, setShowSaveIcon] = useState(true);
    const [showBottomIcon, setShowBottomIcon] = useState(false);

    const [webOuDiaEvent] = useState(new EventTarget())


    return {AppTitle, setAppTitle,
        // snackbar,
        showDeleteIcon, setShowDeleteIcon,
        showSaveIcon, setShowSaveIcon,
        showBottomIcon,setShowBottomIcon,
        webOuDiaEvent: webOuDiaEvent,
        // diaData: lineFiles.lineFiles, setDiaData: lineFiles.setLineFiles,
        // getEditLineFile: lineFiles.getEditLineFile,
        menuOpen, setMenuOpen
    };
}

export function RouteDiagramPage({webOuDia}:DiagramPageProps) {
    const params = useParams<{ lineID: string,diaIdx:string }>();
    const lineID = Number.parseInt(params.lineID??"0");
    const diaIdx = Number.parseInt(params.diaIdx??"0");
    // const {diaStations, downLines, upLines} = useDiagramViewHook2(webOuDia.diaData[lineID],diaIdx);
    const navigate=useNavigate();
    useEffect(()=>{
        // webOuDia.setAppTitle("ダイヤグラム "+webOuDia.diaData[lineID].diagram[diaIdx].name);
        const onDownTimeTableButton=()=>{
            navigate(`/timetable/${lineID}/${diaIdx}/${0}`);
        }
        const onUpTimeTableButton=()=>{
            navigate(`/timetable/${lineID}/${diaIdx}/${1}`);
        }
        const onDiagramButton=()=>{
            navigate(`/diagram/${lineID}/${diaIdx}`);
        }
        webOuDia.setShowBottomIcon(true);
        webOuDia.webOuDiaEvent.addEventListener("onDownTimeTableButtonClicked",onDownTimeTableButton);
        webOuDia.webOuDiaEvent.addEventListener("onUpTimeTableButtonClicked",onUpTimeTableButton);
        webOuDia.webOuDiaEvent.addEventListener("onDiagramButtonClicked",onDiagramButton);
        return ()=>{
            webOuDia.webOuDiaEvent.removeEventListener("onDownTimeTableButtonClicked",onDownTimeTableButton);
            webOuDia.webOuDiaEvent.removeEventListener("onUpTimeTableButtonClicked",onUpTimeTableButton);
            webOuDia.webOuDiaEvent.removeEventListener("onDiagramButtonClicked",onDiagramButton);
            webOuDia.setShowBottomIcon(false);
        }
    })
    const diaStations:DiagramStation[]=[];
    const upLines:DiagramLine[]=[];
    const downLines:DiagramLine[]=[];


    return (
        <>
            <div style={{height:'100%',
                overflow:'hidden'}}>
                <DiagramView
                    routeStations={diaStations}
                    upLines={upLines}
                    downLines={downLines}
                ></DiagramView>
            </div>
        </>


    );
}
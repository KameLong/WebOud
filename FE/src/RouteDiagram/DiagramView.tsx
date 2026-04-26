import React, {useCallback, useEffect, useRef, useState} from 'react';
import {DiagramData, DiagramStation, DiagramTrip} from "./DiagramData";
import {
    StationTime
} from "../DiaData/DiaData";
import {DiagramCanvas, DiagramLine, DiagramTransformC, Point} from "./DiagramCanvas";


const fontSize=10;

const transform:DiagramTransform={
    x:0,
    y:0,
    xScale:0.1,
    yScale:0.4
}
const zoomX:Gesture={
    isDrag:false,
    sPos:[0,0],
    mPos:[0,0],
    transform:transform
}
const zoomY:Gesture={
    isDrag:false,
    sPos:[0,0],
    mPos:[0,0],
    transform:transform
}
interface DiagramViewProps{
    routeStations:DiagramStation[];
    downLines:DiagramLine[];
    upLines:DiagramLine[];

}
export function DiagramView({routeStations, downLines, upLines}:DiagramViewProps) {

    const SCALE:number=window.devicePixelRatio;
    const [diagramCanvas,setDiagramCanvas]=useState<DiagramCanvas>(new DiagramCanvas(undefined));
    const [diaRect,setDiaRect]=useState<DiagramRect>({
        yStart:0,
        yEnd:0,
        xStart:3600*3,
        xEnd:3600*27
    });

    function Ypos(diagramRect:DiagramRect){
        const windowHeight=window.innerHeight*SCALE;
        const newY=Math.min(transform.y,-(windowHeight-50)/transform.yScale/SCALE+diagramRect.yEnd);
        if(newY<0){
            return 0;
        }
        return newY;
    }
    useEffect(() => {
        if(routeStations.length===0){
            return;
        }
        setDiaRect(prevState => {
            return {
                xStart: prevState.xStart,
                xEnd: prevState.xEnd,
                yStart: routeStations[0].stationTime,
                yEnd: routeStations.slice(-1)[0].stationTime
            }
        })
    }, [routeStations]);

    useEffect(() => {
        const canvas=(document.getElementById("canvas") as  HTMLCanvasElement);
        if(canvas===null||canvas===undefined){
            return;
        }
        canvas.width=canvas.clientWidth*SCALE;
        canvas.height=canvas.clientHeight*SCALE;
        const diagramCanvas= new DiagramCanvas(canvas);
        if(!diagramCanvas.ctx){
            return;
        }
        diagramCanvas.transform=new DiagramTransformC(transform.x,transform.y,transform.xScale,transform.yScale,SCALE);
        console.log("diagramCanvas");
        setDiagramCanvas(diagramCanvas);
    }, []);

    useEffect(() => {
        diagramCanvas.diaRect=diaRect;
        requestAnimationFrame(()=>render(new DiagramTransformC(transform.x,transform.y,transform.xScale,transform.yScale,SCALE)));
    }, [diagramCanvas,diaRect]);


    const render = useCallback(
        (transform:DiagramTransformC) => {
            diagramCanvas.Clear();
            diagramCanvas.transform=transform;
            diagramCanvas.DrawVerticalAxis(4);
            diagramCanvas.DrawStationAxis(routeStations);
            diagramCanvas.DrawTrips(downLines);
            diagramCanvas.DrawTrips(upLines);
            diagramCanvas.DrawTimeHeader(4);
            diagramCanvas.DrawStations(routeStations);
        }, [diagramCanvas,downLines,upLines,routeStations]
    );

    const ref=useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const onTouchStart=(e:TouchEvent):void=>{
            if(e.touches.length>=2){
                zoomX.isDrag=Math.abs(e.touches[0].clientX-e.touches[1].clientX)>100;
                zoomX.transform={...transform}
                zoomX.sPos=[e.touches[0].clientX,e.touches[1].clientX];
                zoomX.mPos=[e.touches[0].clientX,e.touches[1].clientX];

                zoomY.isDrag=Math.abs(e.touches[0].clientY-e.touches[1].clientY)>100;
                zoomY.transform={...transform}
                zoomY.sPos=[e.touches[0].clientY,e.touches[1].clientY];
                zoomY.mPos=[e.touches[0].clientY,e.touches[1].clientY];
                e.preventDefault();
            }
        };
        const onTouchMove=(e:TouchEvent)=>{
            if(e.touches.length>=2) {
                e.preventDefault();
                requestAnimationFrame(() => {
                    const nowPos1 = {x: e.touches[0].clientX, y: e.touches[0].clientY};
                    const nowPos2 = {x: e.touches[1].clientX, y: e.touches[1].clientY};
                    if(zoomX.isDrag){
                        if (Math.abs(nowPos2.x - nowPos1.x) >= 100) {
                            const prevTransform = zoomX.transform;
                            const scaleX = Math.abs(prevTransform.xScale * (nowPos1.x - nowPos2.x) / (zoomX.sPos[0] - zoomX.sPos[1]));
                            const x = (prevTransform.xScale / scaleX) * (prevTransform.x + (zoomX.sPos[0] + zoomX.sPos[1]) / 2);
                            transform.xScale = scaleX;
                            transform.x = x;
                        }
                    }else{
                        if(Math.abs(e.touches[0].clientX-e.touches[1].clientX)>100){
                            zoomX.isDrag=true;
                            zoomX.transform={...transform}
                            zoomX.sPos=[e.touches[0].clientX,e.touches[1].clientX];
                            zoomX.mPos=[e.touches[0].clientX,e.touches[1].clientX];
                        }
                    }
                    if(zoomY.isDrag){
                        if (Math.abs(nowPos2.y - nowPos1.y) >= 100) {
                            const prevTransform = zoomY.transform;
                            const scaleY = Math.abs(prevTransform.yScale * (nowPos1.y - nowPos2.y) / (zoomY.sPos[0] - zoomY.sPos[1]));
                            const y = (prevTransform.yScale / scaleY) * (prevTransform.y + (zoomY.sPos[0] + zoomY.sPos[1]) / 2);
                            transform.yScale = scaleY;
                            transform.y = y;
                        }
                    }else{
                        if(Math.abs(e.touches[0].clientY-e.touches[1].clientY)>100){
                            zoomY.isDrag=true;
                            zoomY.transform={...transform}
                            zoomY.sPos=[e.touches[0].clientY,e.touches[1].clientY];
                            zoomY.mPos=[e.touches[0].clientY,e.touches[1].clientY];
                        }
                    }

                    const x1 = -nowPos1.x + transform.xScale / zoomX.transform.xScale * (zoomX.sPos[0] + zoomX.transform.x);
                    const x2 = -nowPos2.x + transform.xScale / zoomX.transform.xScale * (zoomX.sPos[1] + zoomX.transform.x);
                    const y1 = -nowPos1.y + transform.yScale / zoomY.transform.yScale * (zoomY.sPos[0] + zoomY.transform.y);
                    const y2 = -nowPos2.y + transform.yScale / zoomY.transform.yScale * (zoomY.sPos[1] + zoomY.transform.y);
                    const x = (x1 + x2) / 2;
                    const y = (y1 + y2) / 2;
                    transform.x = x;
                    transform.y = y;

                    transform.y=Ypos(diaRect);
                    ref.current?.scrollTo(transform.x, transform.y);

                    document.getElementById("dummy")!.style.width = (24 * 3600 * transform.xScale+80) + "px";
                    document.getElementById("dummy")!.style.height = (diaRect.yEnd * transform.yScale+300) + "px";

                    requestAnimationFrame(()=>render(new DiagramTransformC(transform.x,transform.y,transform.xScale,transform.yScale,SCALE)));

                });
            }
        };
        const onMouseWheel=(e:WheelEvent)=>{
            if(e.ctrlKey){
                if(e.deltaY>0){
                    //マウスを置いてある場所を中心に拡大
                    const y=e.clientY-ref.current.getBoundingClientRect().y;
                    transform.yScale*=1.1;
                    transform.y=(transform.y+y)*1.1-y;
                    ref.current?.scrollTo(transform.x, transform.y);
                    requestAnimationFrame(()=>render(new DiagramTransformC(transform.x,transform.y,transform.xScale,transform.yScale,SCALE)));
                }
                if(e.deltaY<0){
                    transform.yScale/=1.1;
                    const y=e.clientY-ref.current.getBoundingClientRect().y;
                    transform.y=(transform.y+y)/1.1-y;
                    ref.current?.scrollTo(transform.x, transform.y);
                    requestAnimationFrame(()=>render(new DiagramTransformC(transform.x,transform.y,transform.xScale,transform.yScale,SCALE)));
                }
                if(e.deltaX>0){
                    const x=e.clientX-ref.current.getBoundingClientRect().x;
                    transform.x=(transform.x+x)*1.1-x;
                    transform.xScale*=1.1;
                    ref.current?.scrollTo(transform.x, transform.y);
                    requestAnimationFrame(()=>render(new DiagramTransformC(transform.x,transform.y,transform.xScale,transform.yScale,SCALE)));
                }
                if(e.deltaX<0){
                    transform.xScale/=1.1;
                    const x=e.clientX-ref.current.getBoundingClientRect().x;
                    transform.x=(transform.x+x)/1.1-x;
                    ref.current?.scrollTo(transform.x, transform.y);

                    requestAnimationFrame(()=>render(new DiagramTransformC(transform.x,transform.y,transform.xScale,transform.yScale,SCALE)));
                }
                e.preventDefault();

            }
        }


        ref.current?.addEventListener('touchstart',onTouchStart);
        ref.current?.addEventListener('touchmove',onTouchMove);
        ref.current?.addEventListener('wheel',onMouseWheel);
        return () => {
            ref.current?.removeEventListener('touchstart',onTouchStart);
            ref.current?.removeEventListener('touchmove',onTouchMove);
            ref.current?.removeEventListener('wheel',onMouseWheel);
        };
    }, [diaRect]);
    useEffect(() => {
        const resizeEvent=()=>{
            const canvas=(document.getElementById("canvas") as  HTMLCanvasElement);
            if(canvas===null||canvas===undefined){
                return;
            }
            canvas.width=canvas.clientWidth*SCALE;
            canvas.height=canvas.clientHeight*SCALE;
            requestAnimationFrame(()=>render(new DiagramTransformC(transform.x,transform.y,transform.xScale,transform.yScale,SCALE)));
        }
        window.addEventListener('resize', resizeEvent);
        return ()=>{
            window.removeEventListener('resize',resizeEvent);
        }
    }, [render]);
    useEffect(() => {
        if(!ref.current){
            return;
        }
        ref.current.onscroll = (e) => {
            const target=e.target as HTMLDivElement;
            transform.x=(target.scrollLeft);
            transform.y=(target.scrollTop);
            requestAnimationFrame(()=>render(new DiagramTransformC(transform.x,transform.y,transform.xScale,transform.yScale,SCALE)));
        }
        requestAnimationFrame(()=>render(new DiagramTransformC(transform.x,transform.y,transform.xScale,transform.yScale,SCALE)));


    }, [render]);





    console.log(transform.xScale);
    return (
        <div ref={ref}
    style={{background:'white',position: 'relative', height: '100%', overflowX: "auto", overflowY: "auto"}}
>
    <canvas
        id="canvas" style={{position: 'fixed',pointerEvents: 'none', width: '100%', height: '100%', overflowY: 'hidden'}}
>
    </canvas>
    <div id="dummy" style={{
        width: (24 * 3600) * transform.xScale+80,
            height: transform.yScale * diaRect.yEnd+300
    }}>

    </div>
    {/*<BottomMenu companyID={companyID} routeID={routeID} routeInfo={routeInfo}/>*/}

    </div>

);
}



const hasTime=(stopTime:StationTime)=>{
    return stopTime.depTime>=0||stopTime.ariTime>=0;
}

interface DiagramTransform{
    x:number;
    y:number;
    xScale:number;
    yScale:number;
}
interface Gesture{
    isDrag:boolean;
    sPos:number[];
    mPos:number[];
    transform:DiagramTransform;
}
interface DiagramRect{
    xStart:number;
    xEnd:number;
    yStart:number;
    yEnd:number;
}
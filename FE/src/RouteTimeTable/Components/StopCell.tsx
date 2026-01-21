import type {Cursor, Part} from "../domain/types.ts";
import type {StationDto} from "../../server/DTO/StationDTO.ts";
import {ARR_BORDER_BOTTOM_WIDTH, cellHeight, decodeShowStyleDown, LINE_HEIGHT, timeInt2Str} from "../domain/utils.ts";
import type {StopTimeDto} from "../../server/DTO/StopTimeDTO.ts";

function depTimeStr(stopTime:StopTimeDto,showArr:boolean,showDep:boolean,showPass:boolean):string{
    if(!stopTime){
        return "‥";
    }
    if(stopTime.stopType==0){
        return "‥";
    }
    if(stopTime.stopType==3){
        return "║";
    }
    if(stopTime.stopType==2&&!showPass){
        return "⇂";
    }

    let useTime=stopTime.depTime;
    if(useTime<0&&!showArr){
        useTime=stopTime.ariTime;
    }
    if(useTime<0){
        return "〇";
    }
    return timeInt2Str(useTime,false);

}

function ariTimeStr(stopTime:StopTimeDto,showArr:boolean,showDep:boolean,showPass:boolean):string{
    if(!stopTime){
        return "‥";
    }

    if(stopTime.stopType===0){
        return "‥";
    }
    if(stopTime.stopType===3){
        return "║";
    }
    if(stopTime.stopType===2&&!showPass){
        return "⇂";
    }

    let useTime=stopTime.ariTime;
    if(useTime<0&&!showDep){
        useTime=stopTime.depTime;
    }
    if(useTime<0){
        return "〇";
    }
    return timeInt2Str(useTime,false);

}

function contStr( buf: string, lastTime: number ):string{
    if(lastTime<0){
        return buf.padEnd(4,"-");
    }
    const hh=Math.floor(lastTime/3600)%24;
    console.log(hh);
    return hh+buf.padEnd(2,"-");
}
export function StopCell(props: {
    r: number;
    c: number;
    cursor: Cursor; // 全体カーソル
    station: StationDto;
    stopTime:StopTimeDto;
    cont: { buf: string, lastTime: number ,enabled: boolean }
}){
    const { r, c,  cursor, station,stopTime,cont} = props;
    const ROW_H=cellHeight(station.showStyle);
    const inThisCell = cursor.r === r && cursor.c === c;
    const isPartSelected = (part: Part) => inThisCell && cursor.part === part;

    const partStyle = ( selected: boolean): React.CSSProperties => ({
        lineHeight:LINE_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxSizing: "border-box",
        outline: selected ? "1px dashed #333" : "1px solid transparent",
        backgroundColor: selected && cont.enabled ? "#eef8ff" : "white",
        outlineOffset: -1,
        // mixBlendMode:"difference"
    });
    const s = decodeShowStyleDown(station.showStyle);
    const showArrBottomBorder=s.showArr&&s.showDep;
    return (
        <div
            style={{
                height: ROW_H,
                display: "flex",
                flexDirection: "column",
                background: 'white',
                userSelect: "none",
                boxSizing: "border-box",
                fontFamily: 'DiaPro',
            }}
        >
            {s.showArr && (
                <div data-r={r}
                     data-c={c}
                     data-part="arr"
                     style={{ ...partStyle(isPartSelected("arr")),...(showArrBottomBorder?{borderBottom:`${ARR_BORDER_BOTTOM_WIDTH}px solid black`}:{}) }}>
                    {ariTimeStr(stopTime,s.showArr,s.showDep,false)}
                </div>
            )}
            {s.showTrack && (
                <div
                    data-r={r}
                    data-c={c}
                    data-part="track"
                    style={{ ...partStyle( isPartSelected("track"))}}>
                    {"" }
                </div>
            )}

            { s.showDep && (
                <div data-r={r} data-c={c} data-part="dep"
                     style={{ ...partStyle(isPartSelected("dep")) }}>
                    {isPartSelected("dep") && cont.enabled
                        ? contStr(cont.buf,cont.lastTime)
                        : depTimeStr(stopTime, s.showArr, s.showDep, false)}
                </div>
            )}
        </div>
    );
}

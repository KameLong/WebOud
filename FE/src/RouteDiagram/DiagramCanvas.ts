import type {DiagramStation} from "./DiagramData.ts";

export interface Point{
    x:number;
    y:number;
}
export interface DiagramLine{
    color:string;
    number:string;
    points:Point[];
}


export class DiagramTransformC{
    x:number;
    y:number;
    xScale:number;
    yScale:number;
    diagramStartTime:number=3600*3;
    SCALE:number=1;
    constructor(x:number,y:number,xScale:number,yScale:number,SCALE:number){
        this.x=x;
        this.y=y;
        this.xScale=xScale;
        this.yScale=yScale;
        this.SCALE=SCALE;
    }
    public getCanvasX(x:number):number{
        return ((x-this.diagramStartTime)*this.xScale-this.x)*this.SCALE+80*this.SCALE;
    }
    public getCanvasY(y:number):number{
        return ((y)*this.yScale-this.y)*this.SCALE+30*this.SCALE;
    }

}

export class DiagramCanvas{
    public ctx:CanvasRenderingContext2D|undefined=undefined;
    public transform:DiagramTransformC=new DiagramTransformC(0,0,1,1,1);
    public diaRect:{xStart:number,yStart:number,xEnd:number,yEnd:number}={xStart:0,yStart:0,xEnd:0,yEnd:0};

    public fontSize:number=12;
    constructor(canvas:HTMLCanvasElement|undefined){
        if(canvas===undefined){

            return;
        }
        this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        this.ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    Clear(){
        if(this.ctx===undefined){
            return;
        }
        this.ctx.clearRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);

    }
    DrawLine(x1:number,y1:number,x2:number,y2:number,width:number,color:string){
        if(this.ctx===undefined){
            return;
        }
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth=width*this.transform.SCALE;
        this.ctx.moveTo(this.transform.getCanvasX(x1), this.transform.getCanvasY(y1));
        this.ctx.lineTo(this.transform.getCanvasX(x2), this.transform.getCanvasY(y2));
        this.ctx.stroke();
    }
    _DrawLine(x1:number,y1:number,x2:number,y2:number,width:number,color:string){
        if(this.ctx===undefined){
            return;
        }
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth=width*this.transform.SCALE;
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }
    DrawText(text:string,x:number,y:number) {
        if(this.ctx===undefined){
            return;
        }
        this.ctx.font = `${this.fontSize*this.transform.SCALE}px sans-serif`;
        this.ctx.fillText(text,this.transform.getCanvasX(x),this.transform.getCanvasY(y));
    }
    DrawText_(text:string,x:number,y:number) {
        if(this.ctx===undefined){
            return;
        }
        this.ctx.font = `${this.fontSize*this.transform.SCALE}px sans-serif`;
        this.ctx.fillText(text,x,y);
    }

    DrawTimeHeader(verticalAxis:number){
        if(this.ctx===undefined){
            return;
        }
        this.ctx.clearRect(0,0,86400*this.transform.SCALE*this.transform.xScale,1.8*this.fontSize*this.transform.SCALE);

        const drawHourMinText=(hour:number,min:number)=>{
            this.DrawText_(`${hour}:${min.toString().padStart(2,'0')}`,
                this.transform.getCanvasX((hour*3600+min*60+86400-this.transform.diagramStartTime)%86400+this.transform.diagramStartTime),
                this.fontSize*this.transform.SCALE*1.2);

        }
        //時間軸表示に合わせて描画する内容を切り替える
        //隣の文字との間隔が狭くなる時は一部の表示を無くすことで文字がかぶらないようにする
        this.ctx.fillStyle = "#888";
        switch(verticalAxis) {
            case 0:
                //1時間単位の表記
                for (let i = 0; i < 24; i++) {
                    this.DrawText(i.toString(), (i * 3600+86400-this.transform.diagramStartTime)%86400+this.transform.diagramStartTime,
                        -(this.fontSize*this.transform.SCALE));
                }
                break;
            case 2:
                //20分単位の表記
                if (this.fontSize * 5 < 20 * 60 * this.transform.xScale) {
                    for (let i = 0; i < 24; i++) {
                        drawHourMinText(i,0);
                        drawHourMinText(i,20);
                        drawHourMinText(i,40);
                    }
                } else {
                    for (let i = 0; i < 24; i++) {
                        this.DrawText(i.toString(), (i * 3600+86400-this.transform.diagramStartTime)%86400+this.transform.diagramStartTime,
                            -(this.fontSize*this.transform.SCALE));
                    }
                }
                break;
            case 3:
                //15分 45分
                if (this.fontSize * 5 < 15 * 60 * this.transform.xScale) {
                    for (let i = 0; i < 24; i++) {
                        drawHourMinText(i,15);
                        drawHourMinText(i,45);
                    }
                }
            case 1:
                if (this.fontSize * 5 < 30 * 60 * this.transform.xScale) {
                    for (let i = 0; i < 24; i++) {
                        drawHourMinText(i,0);
                        drawHourMinText(i,30);
                    }
                } else {
                    for (let i = 0; i < 24; i++) {
                        this.DrawText(i.toString(), (i * 3600+86400-this.transform.diagramStartTime)%86400+this.transform.diagramStartTime,
                            -(this.fontSize*this.transform.SCALE));
                    }
                }
                break;
            case 7:
                if (this.fontSize * 5 < 5 * 60 * this.transform.xScale) {
                    for (let i = 0; i < 24; i++) {
                        drawHourMinText(i,5);
                        drawHourMinText(i,15);
                        drawHourMinText(i,25);
                        drawHourMinText(i,35);
                        drawHourMinText(i,45);
                        drawHourMinText(i,55);
                    }
                }
            case 6:
            case 5:
            case 4:
                if (this.fontSize * 5 < 10 * 60 * this.transform.xScale) {
                    for (let i = 0; i < 24; i++) {
                        drawHourMinText(i,10);
                        drawHourMinText(i,20);
                        drawHourMinText(i,40);
                        drawHourMinText(i,50);
                    }
                }
                if (this.fontSize * 5 < 30 * 60 * this.transform.xScale) {
                    for (let i = 0; i < 24; i++) {
                        drawHourMinText(i,0);
                        drawHourMinText(i,30);
                    }
                } else {
                    for (let i = 0; i < 24; i++) {
                        this.DrawText(i.toString(), (i * 3600+86400-this.transform.diagramStartTime)%86400+this.transform.diagramStartTime, -50);
                    }
                }
                break;
        }
        this.ctx.fillStyle = "#000";

    }

    DrawVerticalAxis(verticalAxis:number){
        const DrawBoldLine=(time:number)=>{
            this.DrawLine((time-this.transform.diagramStartTime+86400)%86400+this.transform.diagramStartTime,this.diaRect.yStart,(time-this.transform.diagramStartTime+86400)%86400+this.transform.diagramStartTime,this.diaRect.yEnd,2,"#AAA");
        }
        const DrawMainLine=(time:number)=>{
            this.DrawLine((time-this.transform.diagramStartTime+86400)%86400+this.transform.diagramStartTime,this.diaRect.yStart,(time-this.transform.diagramStartTime+86400)%86400+this.transform.diagramStartTime,this.diaRect.yEnd,1,"#AAA");
        }
        const DrawSubLine=(time:number)=>{
            this.DrawLine((time-this.transform.diagramStartTime+86400)%86400+this.transform.diagramStartTime,this.diaRect.yStart,(time-this.transform.diagramStartTime+86400)%86400+this.transform.diagramStartTime,this.diaRect.yEnd,0.5,"#AAA");
        }
        switch (verticalAxis){
            case 1:
                for (let i = 0; i < 24; i++) {
                    //30分ごとの目盛
                    DrawMainLine(i*3600+1800);
                }
                break;
            case 2:
                //20分ごとの目盛
                for (let i = 0; i < 24; i++) {
                    DrawMainLine(i*3600+1200);
                    DrawMainLine(i*3600+2400);
                }
                break;
            case 3:
                //15分ごとの目盛
                for (let i = 0; i < 24; i++) {
                    DrawMainLine(i*3600+900);
                    DrawMainLine(i*3600+1800);
                    DrawMainLine(i*3600+2700);
                }
                break;
            case 4:
                //10分ごとの目盛
                for (let i = 0; i < 24; i++) {
                    DrawSubLine(i*3600+600);
                    DrawSubLine(i*3600+1200);
                    DrawSubLine(i*3600+2400);
                    DrawSubLine(i*3600+3000);
                }
                for (let i = 0; i < 24; i++) {
                    DrawMainLine(i*3600+1800);
                }
                break;
        }
        for (let i = 0; i < 24; i++) {
            DrawBoldLine(i*3600);
        }
    }
    DrawStationAxis(stations:DiagramStation[]){
        for (let i = 0; i < stations.length; i++) {
            let width=1;
            // if(stations[i].station.isMajor){
            //     width=2;
            // }
            if(i===0||i===stations.length-1){
                width=2;
            }
            this.DrawLine(this.transform.diagramStartTime,stations[i].stationTime,this.transform.diagramStartTime+86400,stations[i].stationTime,1,"##808080");
        }
    }
    DrawTrips(trips:DiagramLine[]){
        if(this.ctx===undefined){
            return;
        }
        trips.forEach(item=>{
            if(item.points.length<2){
                return;
            }

            if(this.ctx===undefined){
                return;
            }
            this.ctx.beginPath();
            this.ctx.strokeStyle = item.color;
            this.ctx.lineWidth = this.transform.SCALE;
            this.ctx.moveTo(this.transform.getCanvasX(item.points[0].x), this.transform.getCanvasY(item.points[0].y));
            for(let i=1;i<item.points.length;i++){
                this.ctx.lineTo(this.transform.getCanvasX(item.points[i].x), this.transform.getCanvasY(item.points[i].y));
            }
            this.ctx.stroke();
            const numberText=item.number;
            this.ctx.save();
            this.ctx.translate(this.transform.getCanvasX(item.points[0].x), this.transform.getCanvasY(item.points[0].y));
            this.ctx.rotate(Math.atan2((item.points[1].y-item.points[0].y)*this.transform.yScale,(item.points[1].x-item.points[0].x)*this.transform.xScale));
            this.ctx.fillText(numberText,0,0);
            this.ctx.restore();
        });
    }
    DrawStations(routeStations:DiagramStation[]){
        if(this.ctx===undefined){
            return;
        }
        const stationViewWidth=80*this.transform.SCALE;
        this.ctx.beginPath();
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.rect(0, 0, stationViewWidth, this.ctx.canvas.height);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.strokeStyle = "#303030";
        this.ctx.lineWidth =2;
        this.ctx.moveTo(stationViewWidth, this.transform.getCanvasY(this.diaRect.yStart));
        this.ctx.lineTo(stationViewWidth, this.transform.getCanvasY(this.diaRect.yEnd));
        this.ctx.stroke();

        for(const station of routeStations){
            let width=1;
            // if(station.station.isMajor){
            //     width=2;
            // }
            if(routeStations[0]===station||routeStations.slice(-1)[0]===station){
                width=2;
            }

            this._DrawLine(0,this.transform.getCanvasY(station.stationTime),stationViewWidth,this.transform.getCanvasY(station.stationTime),width,"#808080");
            this.ctx.font = `${this.fontSize*this.transform.SCALE}px sans-serif`;
            this.ctx.fillStyle = "#000";
            this.ctx.fillText(station.station.name,5,this.transform.getCanvasY(station.stationTime)-10);
        }
    }

}
import type { DiagramStation } from "./DiagramData.ts";

export interface Point {
    x: number;
    y: number;
}
export interface DiagramLine {
    color: string;
    /** 列車種別が「線太」のとき、運行線を太く描く */
    bold: boolean;
    number: string;
    points: Point[];
}

/** 「線太」の運行線の太さ（通常は1。SCALE倍して描画する） */
const BOLD_LINE_WIDTH = 2.5;

export class DiagramTransformC {
    x: number;
    y: number;
    xScale: number;
    yScale: number;
    diagramStartTime: number = 3600 * 3;
    SCALE: number = 1;
    /**
     * 座標変換の設定を作ります。
     *
     * @param x 横スクロール量
     * @param y 縦スクロール量
     * @param xScale 横方向の拡大率
     * @param yScale 縦方向の拡大率
     * @param SCALE devicePixelRatio
     */
    constructor(x: number, y: number, xScale: number, yScale: number, SCALE: number) {
        this.x = x;
        this.y = y;
        this.xScale = xScale;
        this.yScale = yScale;
        this.SCALE = SCALE;
    }
    /**
     * ダイヤ上の時刻(秒)をキャンバスのX座標(px)に変換します。
     *
     * @param x 0:00からの秒
     */
    public getCanvasX(x: number): number {
        return (x - this.diagramStartTime) * this.xScale * this.SCALE - this.x * this.SCALE + 80 * this.SCALE;
    }
    /**
     * ダイヤ上の縦位置（駅間の累積秒）をキャンバスのY座標(px)に変換します。
     *
     * @param y 駅の縦位置
     */
    public getCanvasY(y: number): number {
        return y * this.yScale * this.SCALE - this.y * this.SCALE + 30 * this.SCALE;
    }
}

export class DiagramCanvas {
    public ctx: CanvasRenderingContext2D | undefined = undefined;
    public transform: DiagramTransformC = new DiagramTransformC(0, 0, 1, 1, 1);
    public diaRect: { xStart: number; yStart: number; xEnd: number; yEnd: number } = { xStart: 0, yStart: 0, xEnd: 0, yEnd: 0 };

    public fontSize: number = 12;
    /**
     * キャンバスの2Dコンテキストを取得して全面を消去します。
     *
     * @param canvas 描画先。undefinedなら何も描画しない空の状態にする
     */
    constructor(canvas: HTMLCanvasElement | undefined) {
        if (canvas === undefined) {
            return;
        }
        this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    Clear() {
        if (this.ctx === undefined) {
            return;
        }
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
    /**
     * ダイヤ座標系で線を引きます。
     *
     * @param x1 始点の時刻(秒)
     * @param y1 始点の縦位置
     * @param x2 終点の時刻(秒)
     * @param y2 終点の縦位置
     * @param width 線の太さ（SCALE倍して描画）
     * @param color 線の色
     */
    DrawLine(x1: number, y1: number, x2: number, y2: number, width: number, color: string) {
        if (this.ctx === undefined) {
            return;
        }
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width * this.transform.SCALE;
        this.ctx.moveTo(this.transform.getCanvasX(x1), this.transform.getCanvasY(y1));
        this.ctx.lineTo(this.transform.getCanvasX(x2), this.transform.getCanvasY(y2));
        this.ctx.stroke();
    }
    /**
     * キャンバス座標(px)でそのまま線を引きます。
     *
     * @param x1 始点X
     * @param y1 始点Y
     * @param x2 終点X
     * @param y2 終点Y
     * @param width 線の太さ
     * @param color 線の色
     */
    _DrawLine(x1: number, y1: number, x2: number, y2: number, width: number, color: string) {
        if (this.ctx === undefined) {
            return;
        }
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width * this.transform.SCALE;
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }
    /**
     * ダイヤ座標系で文字を描きます。
     *
     * @param text 描画する文字列
     * @param x 時刻(秒)
     * @param y 縦位置
     */
    DrawText(text: string, x: number, y: number) {
        if (this.ctx === undefined) {
            return;
        }
        this.ctx.font = `${this.fontSize * this.transform.SCALE}px sans-serif`;
        this.ctx.fillText(text, this.transform.getCanvasX(x), this.transform.getCanvasY(y));
    }
    /**
     * キャンバス座標(px)で文字を描きます。
     *
     * @param text 描画する文字列
     * @param x X座標
     * @param y Y座標
     */
    DrawText_(text: string, x: number, y: number) {
        if (this.ctx === undefined) {
            return;
        }
        this.ctx.font = `${this.fontSize * this.transform.SCALE}px sans-serif`;
        this.ctx.fillText(text, x, y);
    }

    /**
     * 上部の時刻ラベルを描きます。拡大率に応じて表示する刻みを間引きます。
     *
     * @param verticalAxis 縦線の刻みの種別（0:1時間 1:30分 2:20分 3:15分 4〜:10分 7:5分）
     */
    DrawTimeHeader(verticalAxis: number) {
        if (this.ctx === undefined) {
            return;
        }
        this.ctx.clearRect(0, 0, 86400 * this.transform.SCALE * this.transform.xScale, 1.8 * this.fontSize * this.transform.SCALE);

        /**
         * 指定した時・分のラベルを描きます。
         *
         * @param hour 時
         * @param min 分
         */
        const drawHourMinText = (hour: number, min: number) => {
            this.DrawText_(
                `${hour}:${min.toString().padStart(2, "0")}`,
                this.transform.getCanvasX(((hour * 3600 + min * 60 + 86400 - this.transform.diagramStartTime) % 86400) + this.transform.diagramStartTime),
                this.fontSize * this.transform.SCALE * 1.2
            );
        };

        const draw30MinBlock = () => {
            if (this.fontSize * 5 < 30 * 60 * this.transform.xScale) {
                for (let i = 0; i < 24; i++) {
                    drawHourMinText(i, 0);
                    drawHourMinText(i, 30);
                }
            } else {
                for (let i = 0; i < 24; i++) {
                    this.DrawText(
                        i.toString(),
                        ((i * 3600 + 86400 - this.transform.diagramStartTime) % 86400) + this.transform.diagramStartTime,
                        -(this.fontSize * this.transform.SCALE)
                    );
                }
            }
        };
        const draw10MinBlock = () => {
            if (this.fontSize * 5 < 10 * 60 * this.transform.xScale) {
                for (let i = 0; i < 24; i++) {
                    drawHourMinText(i, 10);
                    drawHourMinText(i, 20);
                    drawHourMinText(i, 40);
                    drawHourMinText(i, 50);
                }
            }
            if (this.fontSize * 5 < 30 * 60 * this.transform.xScale) {
                for (let i = 0; i < 24; i++) {
                    drawHourMinText(i, 0);
                    drawHourMinText(i, 30);
                }
            } else {
                for (let i = 0; i < 24; i++) {
                    this.DrawText(i.toString(), ((i * 3600 + 86400 - this.transform.diagramStartTime) % 86400) + this.transform.diagramStartTime, -50);
                }
            }
        };

        //時間軸表示に合わせて描画する内容を切り替える
        //隣の文字との間隔が狭くなる時は一部の表示を無くすことで文字がかぶらないようにする
        this.ctx.fillStyle = "#888";
        switch (verticalAxis) {
            case 0:
                //1時間単位の表記
                for (let i = 0; i < 24; i++) {
                    this.DrawText(
                        i.toString(),
                        ((i * 3600 + 86400 - this.transform.diagramStartTime) % 86400) + this.transform.diagramStartTime,
                        -(this.fontSize * this.transform.SCALE)
                    );
                }
                break;
            case 2:
                //20分単位の表記
                if (this.fontSize * 5 < 20 * 60 * this.transform.xScale) {
                    for (let i = 0; i < 24; i++) {
                        drawHourMinText(i, 0);
                        drawHourMinText(i, 20);
                        drawHourMinText(i, 40);
                    }
                } else {
                    for (let i = 0; i < 24; i++) {
                        this.DrawText(
                            i.toString(),
                            ((i * 3600 + 86400 - this.transform.diagramStartTime) % 86400) + this.transform.diagramStartTime,
                            -(this.fontSize * this.transform.SCALE)
                        );
                    }
                }
                break;
            case 3:
                //15分 45分
                if (this.fontSize * 5 < 15 * 60 * this.transform.xScale) {
                    for (let i = 0; i < 24; i++) {
                        drawHourMinText(i, 15);
                        drawHourMinText(i, 45);
                    }
                }
                draw30MinBlock();
                break;
            case 1:
                draw30MinBlock();
                break;
            case 7:
                if (this.fontSize * 5 < 5 * 60 * this.transform.xScale) {
                    for (let i = 0; i < 24; i++) {
                        drawHourMinText(i, 5);
                        drawHourMinText(i, 15);
                        drawHourMinText(i, 25);
                        drawHourMinText(i, 35);
                        drawHourMinText(i, 45);
                        drawHourMinText(i, 55);
                    }
                }
                draw10MinBlock();
                break;
            case 6:
            case 5:
            case 4:
                draw10MinBlock();
                break;
        }
        this.ctx.fillStyle = "#000";
    }

    /**
     * 時刻の縦線を描きます。
     *
     * @param verticalAxis 縦線の刻みの種別（DrawTimeHeaderと同じ）
     */
    DrawVerticalAxis(verticalAxis: number) {
        /**
         * 太い縦線（1時間ごと）を描きます。
         *
         * @param time 時刻(秒)
         */
        const DrawBoldLine = (time: number) => {
            this.DrawLine(
                ((time - this.transform.diagramStartTime + 86400) % 86400) + this.transform.diagramStartTime,
                this.diaRect.yStart,
                ((time - this.transform.diagramStartTime + 86400) % 86400) + this.transform.diagramStartTime,
                this.diaRect.yEnd,
                2,
                "#AAA"
            );
        };
        /**
         * 通常の縦線を描きます。
         *
         * @param time 時刻(秒)
         */
        const DrawMainLine = (time: number) => {
            this.DrawLine(
                ((time - this.transform.diagramStartTime + 86400) % 86400) + this.transform.diagramStartTime,
                this.diaRect.yStart,
                ((time - this.transform.diagramStartTime + 86400) % 86400) + this.transform.diagramStartTime,
                this.diaRect.yEnd,
                1,
                "#AAA"
            );
        };
        /**
         * 細い縦線（補助線）を描きます。
         *
         * @param time 時刻(秒)
         */
        const DrawSubLine = (time: number) => {
            this.DrawLine(
                ((time - this.transform.diagramStartTime + 86400) % 86400) + this.transform.diagramStartTime,
                this.diaRect.yStart,
                ((time - this.transform.diagramStartTime + 86400) % 86400) + this.transform.diagramStartTime,
                this.diaRect.yEnd,
                0.5,
                "#AAA"
            );
        };
        switch (verticalAxis) {
            case 1:
                for (let i = 0; i < 24; i++) {
                    DrawMainLine(i * 3600 + 1800);
                }
                break;
            case 2:
                for (let i = 0; i < 24; i++) {
                    DrawMainLine(i * 3600 + 1200);
                    DrawMainLine(i * 3600 + 2400);
                }
                break;
            case 3:
                for (let i = 0; i < 24; i++) {
                    DrawMainLine(i * 3600 + 900);
                    DrawMainLine(i * 3600 + 1800);
                    DrawMainLine(i * 3600 + 2700);
                }
                break;
            case 4:
                for (let i = 0; i < 24; i++) {
                    DrawSubLine(i * 3600 + 600);
                    DrawSubLine(i * 3600 + 1200);
                    DrawSubLine(i * 3600 + 2400);
                    DrawSubLine(i * 3600 + 3000);
                }
                for (let i = 0; i < 24; i++) {
                    DrawMainLine(i * 3600 + 1800);
                }
                break;
        }
        for (let i = 0; i < 24; i++) {
            DrawBoldLine(i * 3600);
        }
    }
    /**
     * 駅ごとの横線を描きます。
     *
     * @param stations 縦位置つきの駅一覧
     */
    DrawStationAxis(stations: DiagramStation[]) {
        for (let i = 0; i < stations.length; i++) {
            this.DrawLine(this.transform.diagramStartTime, stations[i].stationTime, this.transform.diagramStartTime + 86400, stations[i].stationTime, 1, "#808080");
        }
    }
    /**
     * 列車の運行線と列車番号を描きます。
     *
     * @param trips 描画する運行線（2点未満は無視）
     */
    DrawTrips(trips: DiagramLine[]) {
        if (this.ctx === undefined) {
            return;
        }
        trips.forEach((item) => {
            if (item.points.length < 2) {
                return;
            }

            if (this.ctx === undefined) {
                return;
            }
            this.ctx.beginPath();
            this.ctx.strokeStyle = item.color;
            this.ctx.lineWidth = (item.bold ? BOLD_LINE_WIDTH : 1) * this.transform.SCALE;
            this.ctx.moveTo(this.transform.getCanvasX(item.points[0].x), this.transform.getCanvasY(item.points[0].y));
            for (let i = 1; i < item.points.length; i++) {
                this.ctx.lineTo(this.transform.getCanvasX(item.points[i].x), this.transform.getCanvasY(item.points[i].y));
            }
            this.ctx.stroke();
            // 列車番号は、駅間（縦位置が変わる区間）の最初の線に沿って、その傾きに合わせて描く。
            // 始発駅に着・発の両方の時刻があると最初の区間は水平（同じ駅内）になるため、それを飛ばす。
            let seg = item.points.findIndex((p, i) => i + 1 < item.points.length && item.points[i + 1].y !== p.y);
            if (seg < 0) seg = 0;
            const x0 = this.transform.getCanvasX(item.points[seg].x);
            const y0 = this.transform.getCanvasY(item.points[seg].y);
            const x1 = this.transform.getCanvasX(item.points[seg + 1].x);
            const y1 = this.transform.getCanvasY(item.points[seg + 1].y);
            this.ctx.save();
            this.ctx.fillStyle = item.color;
            this.ctx.translate(x0, y0);
            this.ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
            // 線に重ならないよう、線の少し上（回転後の座標で上側）に描く
            this.ctx.fillText(item.number, 2 * this.transform.SCALE, -2 * this.transform.SCALE);
            this.ctx.restore();
        });
    }
    /**
     * 左側の駅名欄を描きます。
     *
     * @param routeStations 縦位置つきの駅一覧（先頭・末尾は太線）
     */
    DrawStations(routeStations: DiagramStation[]) {
        if (this.ctx === undefined) {
            return;
        }
        const stationViewWidth = 80 * this.transform.SCALE;
        this.ctx.beginPath();
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.rect(0, 0, stationViewWidth, this.ctx.canvas.height);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.strokeStyle = "#303030";
        this.ctx.lineWidth = 2;
        this.ctx.moveTo(stationViewWidth, this.transform.getCanvasY(this.diaRect.yStart));
        this.ctx.lineTo(stationViewWidth, this.transform.getCanvasY(this.diaRect.yEnd));
        this.ctx.stroke();

        for (const station of routeStations) {
            let width = 1;
            if (routeStations[0] === station || routeStations.slice(-1)[0] === station) {
                width = 2;
            }

            this._DrawLine(0, this.transform.getCanvasY(station.stationTime), stationViewWidth, this.transform.getCanvasY(station.stationTime), width, "#808080");
            this.ctx.font = `${this.fontSize * this.transform.SCALE}px sans-serif`;
            this.ctx.fillStyle = "#000";
            // 駅名が表示枠を超える場合は、はみ出さないよう横幅を詰めて描画する
            const nameMaxWidth = stationViewWidth - 10 * this.transform.SCALE;
            this.ctx.fillText(station.station.name, 5, this.transform.getCanvasY(station.stationTime) - 10, nameMaxWidth);
        }
    }
}

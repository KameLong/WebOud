export type TrainTypeDto = {
    id: number;
    name: string;
    routeID: number;
    index: number;
    shortName: string;
    color: string;        // "#RRGGBB" 推奨
    fontBold: boolean;
    lineBold: boolean;
    lineStyle: number;   // 0:実線 1:破線 2:点線 ...など
};
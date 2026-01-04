export type StopTimeDto= {
    id:number,
    tripID:number,
    stationID:number,
    depTime:number,
    ariTime:number,
    stopType:number,
    stop:number
};
export type StopTimeCreateDto= {
    tripID:number,
    stationID:number,
    depTime:number,
    ariTime:number,
    stopType:number,
    stop:number
};
export type StopTimeUpdateDto= {
    tripID:number,
    stationID:number,
    depTime:number,
    ariTime:number,
    stopType:number,
    stop:number
};

// 編集UI向け：tripId + stationId で保存（既存があれば更新、無ければ作成）

export type StopTimeUpsertDto= {
    tripID:number,
    stationID:number,
    depTime:number,
    ariTime:number,
    stopType:number,
    stop:number
};





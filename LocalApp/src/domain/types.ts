export type ShowStyle = {
    showArr: boolean;
    showDep: boolean;
    showTrack: boolean;
};

export type Part = "arr" | "track" | "dep";

export type Cursor = { r: number; c: number; part: Part };
export type KeyLike = {
    key: string;
    /** 物理キー位置(レイアウト非依存)。macOSではAlt(Option)押下時にkeyが特殊文字に化けるため、Alt併用のショートカット判定にはこちらを使う */
    code: string;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    preventDefault: () => void;
    nativeEvent: KeyboardEvent;
};


export type ShowStyle = {
    showArr: boolean;
    showDep: boolean;
    showTrack: boolean;
};

export type Part = "arr" | "track" | "dep";

export type Cursor = { r: number; c: number; part: Part };
export type KeyLike = {
    key: string;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    preventDefault: () => void;
    nativeEvent:KeyboardEvent,

};
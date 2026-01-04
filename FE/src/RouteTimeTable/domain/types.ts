
export type ShowStyle = {
    showArr: boolean;
    showDep: boolean;
    showTrack: boolean;
};

export type Part = "arr" | "track" | "dep";

export type Cursor = { r: number; c: number; part: Part };

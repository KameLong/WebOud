import type { RouteRecord, RouteSummary, StoreState } from "./types.ts";

const STORAGE_KEY = "weboud.localapp.routes.v1";

function defaultState(): StoreState {
    return { version: 1, nextRouteId: 1, routes: [] };
}

function loadState(): StoreState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw) as unknown;
        if (
            !parsed ||
            typeof parsed !== "object" ||
            !Array.isArray((parsed as StoreState).routes) ||
            typeof (parsed as StoreState).nextRouteId !== "number"
        ) {
            return defaultState();
        }
        return parsed as StoreState;
    } catch (e) {
        console.error("failed to load local data", e);
        return defaultState();
    }
}

let state: StoreState = loadState();
const listeners = new Set<() => void>();

function emit() {
    for (const l of listeners) l();
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("failed to save to localStorage", e);
    }
    emit();
}

function setState(next: StoreState) {
    state = next;
    persist();
}

export function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getState() {
    return state;
}

// useSyncExternalStore requires getSnapshot to return a stable reference when
// nothing changed, so the derived summary list is cached per state instance.
let summaryCacheState: StoreState | null = null;
let summaryCache: RouteSummary[] = [];

export function listRoutes(): RouteSummary[] {
    if (summaryCacheState === state) return summaryCache;

    summaryCache = state.routes
        .map((r) => ({
            id: r.id,
            name: r.name,
            updatedAt: r.updatedAt,
            stationCount: r.stations.length,
            trainTypeCount: r.trainTypes.length,
            tripCount: r.trips.length,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    summaryCacheState = state;
    return summaryCache;
}

export function getRoute(id: number): RouteRecord | undefined {
    return state.routes.find((r) => r.id === id);
}

export function createRoute(name: string): RouteRecord {
    const id = state.nextRouteId;
    const route: RouteRecord = {
        id,
        name,
        updatedAt: Date.now(),
        counters: { station: 1, trainType: 1, trip: 1, stopTime: 1 },
        stations: [],
        trainTypes: [],
        trips: [],
    };
    setState({ ...state, nextRouteId: id + 1, routes: [...state.routes, route] });
    return route;
}

export function renameRoute(id: number, name: string) {
    setState({
        ...state,
        routes: state.routes.map((r) => (r.id === id ? { ...r, name, updatedAt: Date.now() } : r)),
    });
}

export function deleteRoute(id: number) {
    setState({ ...state, routes: state.routes.filter((r) => r.id !== id) });
}

export function duplicateRoute(id: number): RouteRecord | undefined {
    const src = getRoute(id);
    if (!src) return undefined;
    const newId = state.nextRouteId;
    const copy: RouteRecord = {
        ...src,
        id: newId,
        name: `${src.name} のコピー`,
        updatedAt: Date.now(),
    };
    setState({ ...state, nextRouteId: newId + 1, routes: [...state.routes, copy] });
    return copy;
}

export function updateRoute(id: number, updater: (r: RouteRecord) => RouteRecord) {
    setState({
        ...state,
        routes: state.routes.map((r) => (r.id === id ? { ...updater(r), updatedAt: Date.now() } : r)),
    });
}

export function exportAllAsJson(): string {
    return JSON.stringify(state, null, 2);
}

export function exportRouteAsJson(id: number): string | undefined {
    const route = getRoute(id);
    if (!route) return undefined;
    return JSON.stringify(route, null, 2);
}

function isRouteRecord(v: unknown): v is RouteRecord {
    if (!v || typeof v !== "object") return false;
    const r = v as RouteRecord;
    return typeof r.id === "number" && typeof r.name === "string" && Array.isArray(r.stations) && Array.isArray(r.trainTypes) && Array.isArray(r.trips);
}

/** 全データのJSONを読み込み、既存データを置き換えます */
export function importAllFromJson(json: string) {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as StoreState).routes)) {
        throw new Error("不正なファイル形式です");
    }
    setState(parsed as StoreState);
}

/** 1路線分のJSONを読み込み、新しい路線として追加します */
export function importRouteFromJson(json: string): RouteRecord {
    const parsed = JSON.parse(json) as unknown;
    if (!isRouteRecord(parsed)) {
        throw new Error("不正なファイル形式です");
    }
    const newId = state.nextRouteId;
    const imported: RouteRecord = { ...parsed, id: newId, updatedAt: Date.now() };
    setState({ ...state, nextRouteId: newId + 1, routes: [...state.routes, imported] });
    return imported;
}

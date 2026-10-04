import type { RouteRecord, RouteSummary, StoreState } from "./types.ts";

const STORAGE_KEY = "weboud.localapp.routes.v1";

function defaultState(): StoreState {
    return { version: 1, nextRouteId: 1, routes: [] };
}

/**
 * localStorage等から読んだ値が保存データの形式かを判定します。
 *
 * @param v 検査する値
 */
function isValidStoreState(v: unknown): v is StoreState {
    return !!v && typeof v === "object" && Array.isArray((v as StoreState).routes) && typeof (v as StoreState).nextRouteId === "number";
}

function loadState(): StoreState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw) as unknown;
        return isValidStoreState(parsed) ? parsed : defaultState();
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

/**
 * 状態を差し替えて保存し、購読者へ通知します。
 *
 * @param next 新しい状態
 */
function setState(next: StoreState) {
    state = next;
    persist();
}

/**
 * 他のタブ/ウィンドウでの変更をこのタブへ反映する（最後に保存した方が勝つ）。
 * `storage`イベントは変更元のタブでは発火しないため、他タブの更新のみを拾う。
 */
if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
        if (event.key !== STORAGE_KEY) return;

        if (event.newValue == null) {
            state = defaultState();
            emit();
            return;
        }

        try {
            const parsed = JSON.parse(event.newValue) as unknown;
            if (isValidStoreState(parsed)) {
                state = parsed;
                emit();
            }
        } catch (e) {
            console.error("failed to sync state from another tab/window", e);
        }
    });
}

/**
 * ストアの変更通知を購読します（useSyncExternalStore用）。
 *
 * @param listener 変更時に呼ばれるコールバック
 */
export function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
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

/**
 * 指定IDの路線を返します。
 *
 * @param id 路線ID
 */
export function getRoute(id: number): RouteRecord | undefined {
    return state.routes.find((r) => r.id === id);
}

/**
 * 空の路線を作成します。
 *
 * @param name 路線名
 */
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

/**
 * 路線名を変更します。
 *
 * @param id 対象の路線ID
 * @param name 新しい路線名
 */
export function renameRoute(id: number, name: string) {
    setState({
        ...state,
        routes: state.routes.map((r) => (r.id === id ? { ...r, name, updatedAt: Date.now() } : r)),
    });
}

/**
 * 路線を削除します。
 *
 * @param id 削除する路線ID
 */
export function deleteRoute(id: number) {
    setState({ ...state, routes: state.routes.filter((r) => r.id !== id) });
}

/**
 * 路線を複製します（元の路線が無ければundefined）。
 *
 * @param id 複製元の路線ID
 */
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

/**
 * 指定路線を更新関数で書き換え、更新日時を現在時刻にします。
 *
 * @param id 対象の路線ID
 * @param updater 現在の路線を受け取り、新しい路線を返す純粋関数
 */
export function updateRoute(id: number, updater: (r: RouteRecord) => RouteRecord) {
    setState({
        ...state,
        routes: state.routes.map((r) => (r.id === id ? { ...updater(r), updatedAt: Date.now() } : r)),
    });
}

export function exportAllAsJson(): string {
    return JSON.stringify(state, null, 2);
}

/**
 * 1路線分をJSON文字列にします。
 *
 * @param id 書き出す路線ID
 */
export function exportRouteAsJson(id: number): string | undefined {
    const route = getRoute(id);
    if (!route) return undefined;
    return JSON.stringify(route, null, 2);
}

/**
 * 値が1路線分のデータ形式かを判定します。
 *
 * @param v 検査する値
 */
function isRouteRecord(v: unknown): v is RouteRecord {
    if (!v || typeof v !== "object") return false;
    const r = v as RouteRecord;
    return typeof r.id === "number" && typeof r.name === "string" && Array.isArray(r.stations) && Array.isArray(r.trainTypes) && Array.isArray(r.trips);
}

/**
 * 全データのJSONを読み込み、既存データを置き換えます
 *
 * @param json exportAllAsJsonで書き出したJSON文字列
 */
export function importAllFromJson(json: string) {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as StoreState).routes)) {
        throw new Error("不正なファイル形式です");
    }
    setState(parsed as StoreState);
}

/**
 * 1路線分のJSONを読み込み、新しい路線として追加します
 *
 * @param json exportRouteAsJsonで書き出したJSON文字列
 */
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

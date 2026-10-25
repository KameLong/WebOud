import type { RouteRecord, RouteSummary, StoreState } from "./types.ts";
import { DEFAULT_TRAIN_TYPE } from "../domain/defaults.ts";

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

/**
 * 列車種別が1つも無い路線に、標準の列車種別を追加して返します（種別がある路線はそのまま返す）。
 *
 * @param route 対象の路線
 */
export function withDefaultTrainType(route: RouteRecord): RouteRecord {
    if (route.trainTypes.length > 0) return route;
    const id = route.counters.trainType;
    return {
        ...route,
        counters: { ...route.counters, trainType: id + 1 },
        trainTypes: [{ ...DEFAULT_TRAIN_TYPE, id, routeID: route.id, index: 0 }],
    };
}

function loadState(): StoreState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw) as unknown;
        if (!isValidStoreState(parsed)) return defaultState();
        // 以前のデータで種別が空の路線にも、標準の種別を補う
        return { ...parsed, routes: parsed.routes.map(withDefaultTrainType) };
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
 * 同じ名前の路線があるかを返します（路線名は路線を区別する名前として使う）。
 *
 * @param name 調べる路線名
 * @param exceptId この路線は調べない（自分自身の名前を変えるとき）
 */
export function isRouteNameTaken(name: string, exceptId?: number): boolean {
    return state.routes.some((r) => r.name === name && r.id !== exceptId);
}

/**
 * 同じ名前の路線があるときのエラー。
 *
 * @param name 重複した路線名
 */
function duplicateNameError(name: string): Error {
    return new Error(`「${name}」という名前の路線はすでにあります`);
}

/**
 * 空の路線を作成します。同じ名前の路線があるときはエラーにします。
 *
 * @param name 路線名
 * @param addDefaultTrainType trueなら標準の列車種別(普通)を最初から追加する
 */
export function createRoute(name: string, addDefaultTrainType = true): RouteRecord {
    if (isRouteNameTaken(name)) throw duplicateNameError(name);
    const id = state.nextRouteId;
    const base: RouteRecord = {
        id,
        name,
        updatedAt: Date.now(),
        counters: { station: 1, trainType: 1, trip: 1, stopTime: 1 },
        stations: [],
        trainTypes: [],
        trips: [],
    };
    const route = addDefaultTrainType ? withDefaultTrainType(base) : base;
    setState({ ...state, nextRouteId: id + 1, routes: [...state.routes, route] });
    return route;
}

/**
 * 路線名を変更します。同じ名前の別の路線があるときはエラーにします。
 *
 * @param id 対象の路線ID
 * @param name 新しい路線名
 */
export function renameRoute(id: number, name: string) {
    if (isRouteNameTaken(name, id)) throw duplicateNameError(name);
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
    // 「○○ のコピー」がすでにあるときは、「○○ のコピー 2」「…3」と番号を付ける
    const base = `${src.name} のコピー`;
    let name = base;
    for (let n = 2; isRouteNameTaken(name); n++) name = `${base} ${n}`;
    const copy: RouteRecord = {
        ...src,
        id: newId,
        name,
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
    setState({ ...(parsed as StoreState), routes: (parsed as StoreState).routes.map(withDefaultTrainType) });
}

/**
 * 新しい路線を追加して保存します（OuDiaの取り込みなど、外部のデータから路線を作るとき用）。
 * 列車種別が空なら標準の種別を補います。
 *
 * @param build 新しい路線のIDを受け取り、そのIDを持つ路線データを返す関数
 */
export function addRoute(build: (id: number) => RouteRecord): RouteRecord {
    const newId = state.nextRouteId;
    const built = build(newId);
    if (isRouteNameTaken(built.name)) throw duplicateNameError(built.name);
    const route = withDefaultTrainType({ ...built, id: newId, updatedAt: Date.now() });
    setState({ ...state, nextRouteId: newId + 1, routes: [...state.routes, route] });
    return route;
}

/**
 * 路線のデータを、指定の路線IDのものにします（駅・種別・列車が持つ路線IDも合わせる）。
 *
 * @param route 取り込む路線
 * @param id 新しい路線ID
 */
function withRouteId(route: RouteRecord, id: number): RouteRecord {
    return {
        ...route,
        id,
        updatedAt: Date.now(),
        stations: route.stations.map((x) => ({ ...x, routeID: id })),
        trainTypes: route.trainTypes.map((x) => ({ ...x, routeID: id })),
        trips: route.trips.map((x) => ({ ...x, routeID: id })),
    };
}

/**
 * 取り込むJSONから路線を取り出します。「路線のエクスポート」（1路線分）と「全データのエクスポート」（全路線）の
 * どちらの形式も読めます。同じ名前の路線が複数あるときは、後のものだけを取り込みます。
 *
 * @param json JSON文字列
 */
function parseImportedRoutes(json: string): RouteRecord[] {
    const parsed = JSON.parse(json) as unknown;
    const list: unknown[] = isValidStoreState(parsed) ? parsed.routes : [parsed];
    if (list.length === 0 || !list.every(isRouteRecord)) throw new Error("不正なファイル形式です");
    const byName = new Map<string, RouteRecord>();
    for (const r of list) byName.set(r.name, r);
    return [...byName.values()];
}

/**
 * 路線のJSON（1路線分・全データのどちらの形式でも可）を読み込み、路線として追加します。
 * 路線名が同じ路線がすでにあるときは、confirmOverwriteで確認し、了承されたら中身を置き換えます（路線IDは変わらない）。
 * 了承されなければ、何も取り込みません。
 *
 * @param json exportRouteAsJson / exportAllAsJson で書き出したJSON文字列
 * @param confirmOverwrite 同じ名前の路線があるとき、その路線名の一覧を受け取り、上書きしてよいかを返す関数
 * @returns 取り込んだ路線。取り込みを取りやめたときはnull
 */
export function importRoutesFromJson(json: string, confirmOverwrite: (names: string[]) => boolean): RouteRecord[] | null {
    const incoming = parseImportedRoutes(json);
    const conflicts = incoming.filter((r) => isRouteNameTaken(r.name)).map((r) => r.name);
    if (conflicts.length > 0 && !confirmOverwrite(conflicts)) return null;

    let nextId = state.nextRouteId;
    const routes = [...state.routes];
    const imported = incoming.map((r) => {
        const index = routes.findIndex((x) => x.name === r.name);
        const route = withDefaultTrainType(withRouteId(r, index >= 0 ? routes[index].id : nextId++));
        if (index >= 0) routes[index] = route;
        else routes.push(route);
        return route;
    });
    setState({ ...state, nextRouteId: nextId, routes });
    return imported;
}

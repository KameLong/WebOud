/**
 * アプリのデータ（路線一覧・設定）を保存する、素朴なキー・バリュー形式のIndexedDBラッパーです。
 * 1つのデータベースに1つのストア(kv)だけを持ち、各ストアのJSON全体を1つの値として保存します
 * （localStorageの使い方をそのままIndexedDBに移したもの。1つの値あたりの容量上限がlocalStorageより
 * 大幅に大きいため、保存容量の上限を気にしなくて済むようにする移行です）。
 */

const DB_NAME = "webdia-db";
const DB_VERSION = 1;
const STORE_NAME = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * データベース接続を開きます（一度開いたら使い回します）。IndexedDBが使えない環境ではエラーを投げます。
 */
function openDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    if (typeof indexedDB === "undefined") {
        return Promise.reject(new Error("IndexedDB is not available in this environment"));
    }
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("failed to open IndexedDB"));
        req.onblocked = () => reject(new Error("IndexedDB open blocked (another tab holds an older version)"));
    });
    return dbPromise;
}

/**
 * IDBRequestをPromiseにします。
 *
 * @param req 対象のリクエスト
 */
function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
    });
}

/**
 * 指定キーの値を読み込みます（無ければundefined）。
 *
 * @param key 読み込むキー
 */
export async function idbGet<T>(key: string): Promise<T | undefined> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const value = await requestToPromise<T | undefined>(tx.objectStore(STORE_NAME).get(key));
    return value;
}

/**
 * 指定キーに値を保存します。
 *
 * @param key 保存先のキー
 * @param value 保存する値（構造化複製できる値ならそのまま渡せる。JSON化は不要）
 */
export async function idbSet(key: string, value: unknown): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
        tx.onabort = () => reject(tx.error ?? new Error("IndexedDB write aborted"));
    });
}

/**
 * 指定キーを削除します。
 *
 * @param key 削除するキー
 */
export async function idbDelete(key: string): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
    });
}

/**
 * 短時間に何度も呼ばれても書き込みをまとめる「まとめ書き」ライターを作ります。
 * scheduleを呼ぶたびにタイマーを延長し、一定時間呼ばれなかったら、その時点の最新の値を1回だけ書き込みます。
 * ページを閉じる・隠すときはflushで即座に書き込みます（延長中のタイマーを待たず、取りこぼしを防ぐ）。
 *
 * @param key 書き込み先のキー
 * @param getValue 書き込む時点の最新の値を返す関数
 * @param onError 書き込みに失敗したときの処理
 * @param delayMs まとめる間隔(ms)
 * @param onWritten 書き込みが実際に完了した直後に呼ばれる（他タブへの通知はこの後に行う）
 */
export function createDebouncedWriter(key: string, getValue: () => unknown, onError: (e: unknown) => void, delayMs = 400, onWritten?: () => void) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    // 同じキーへの書き込みが重ならないよう直列化する
    let writeChain: Promise<void> = Promise.resolve();

    function doWrite() {
        const value = getValue();
        writeChain = writeChain
            .then(() => idbSet(key, value))
            .then(() => onWritten?.())
            .catch(onError);
    }

    return {
        /** 書き込みを予約します（delayMs以内に再度呼ばれると延長されます） */
        schedule() {
            if (timer !== null) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                doWrite();
            }, delayMs);
        },
        /** 予約中の書き込みがあれば、待たずに今すぐ書き込みます */
        flush() {
            if (timer === null) return;
            clearTimeout(timer);
            timer = null;
            doWrite();
        },
    };
}

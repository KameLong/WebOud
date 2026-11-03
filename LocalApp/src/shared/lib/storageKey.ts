/**
 * ブラウザのストレージ容量超過エラーか（ブラウザによってnameやcodeの表現が異なるため両方見る）。
 *
 * @param e 判定する値
 */
function isQuotaExceededError(e: unknown): boolean {
    return e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22);
}

/**
 * 保存先のキーを変えたときに、古いキーのデータを新しいキーへ引き継ぎます（新しいキーにまだ何も無いときだけ）。
 * 古いキーのデータは消しません。
 * ただし、新旧2つ分のデータを同時に保存する余地が無い場合（容量超過エラー）は、
 * 読み取り済みの内容を保ったまま古いキーを削除してから新しいキーに書き直します。
 *
 * @param oldKey 古いキー
 * @param newKey 新しいキー
 */
export function migrateStorageKey(oldKey: string, newKey: string) {
    try {
        if (localStorage.getItem(newKey) !== null) return;
        const old = localStorage.getItem(oldKey);
        if (old === null) return;
        try {
            localStorage.setItem(newKey, old);
        } catch (e) {
            if (!isQuotaExceededError(e)) throw e;
            localStorage.removeItem(oldKey);
            localStorage.setItem(newKey, old);
        }
    } catch (e) {
        console.error("failed to migrate local data", e);
    }
}

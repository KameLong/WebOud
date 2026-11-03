/**
 * 保存先のキーを変えたときに、古いキーのデータを新しいキーへ引き継ぎます（新しいキーにまだ何も無いときだけ）。
 * 古いキーのデータは消しません。
 *
 * @param oldKey 古いキー
 * @param newKey 新しいキー
 */
export function migrateStorageKey(oldKey: string, newKey: string) {
    try {
        if (localStorage.getItem(newKey) !== null) return;
        const old = localStorage.getItem(oldKey);
        if (old !== null) localStorage.setItem(newKey, old);
    } catch (e) {
        console.error("failed to migrate local data", e);
    }
}

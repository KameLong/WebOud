import { useRef } from "react";

/** この一覧の形式のデータであることを示す目印（他のデータと取り違えないため） */
const CLIPBOARD_KIND = "indexed-list-v1";

/**
 * 一覧の行をコピー＆ペーストするためのクリップボードです。システムのクリップボードに書き込み、
 * 読み書きできない環境（許可されていない場合など）では、このフックが持つ内部のコピーを使います。
 */
export function useListClipboard<TClip>() {
    /** システムのクリップボードが使えないときの代わり */
    const fallback = useRef<TClip[] | null>(null);

    return {
        /**
         * コピーした行を保存します。
         *
         * @param items コピーする行
         */
        async write(items: TClip[]) {
            fallback.current = items;
            try {
                await navigator.clipboard.writeText(JSON.stringify({ kind: CLIPBOARD_KIND, items }));
            } catch (ex) {
                console.warn(ex);
            }
        },
        /** コピーした行を取り出します。システムのクリップボードに、この一覧の形式のデータが無ければ、内部のコピーを返します。 */
        async read(): Promise<TClip[] | null> {
            try {
                const parsed = JSON.parse(await navigator.clipboard.readText());
                if (parsed?.kind === CLIPBOARD_KIND && Array.isArray(parsed.items)) return parsed.items;
            } catch (ex) {
                console.warn(ex);
            }
            return fallback.current;
        },
    };
}

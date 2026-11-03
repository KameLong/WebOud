import { useEffect, useState } from "react";

export type StorageEstimate = {
    /** 現在使用中のバイト数 */
    usage: number;
    /** このオリジンが使える上限のバイト数（ブラウザのベストエフォートな見積もり） */
    quota: number;
};

/**
 * ブラウザのストレージ使用量・上限の見積もり（navigator.storage.estimate）を返します。
 * 取得できない環境（対応していないブラウザ、プライベートブラウジングなど）ではnullを返します。
 * 保存のたびに呼ぶと重いため、起動時と再度見えるようになったとき（タブ切り替え等）にだけ取得し直します。
 */
export function useStorageEstimate(): StorageEstimate | null {
    const [estimate, setEstimate] = useState<StorageEstimate | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function refresh() {
            if (!navigator.storage?.estimate) return;
            try {
                const { usage, quota } = await navigator.storage.estimate();
                if (!cancelled && typeof usage === "number" && typeof quota === "number") {
                    setEstimate({ usage, quota });
                }
            } catch (e) {
                console.error("failed to get storage estimate", e);
            }
        }

        void refresh();

        function onVisibilityChange() {
            if (document.visibilityState === "visible") void refresh();
        }
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    return estimate;
}

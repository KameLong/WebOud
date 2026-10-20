import { useSyncExternalStore } from "react";
import { getFontSize, subscribe } from "../store/settings.ts";

/**
 * 設定画面で変更できる、全体の文字サイズ(px)を返します（変更時に再描画されます）。
 */
export function useFontSize(): number {
    return useSyncExternalStore(subscribe, getFontSize);
}

import { useState } from "react";
import { getErrorMessage } from "../lib/errors.ts";

/**
 * PDFを作成する非同期処理の、作成中・エラーの状態をまとめて扱います。作成中に再度呼ばれたときは何もしません。
 * 1つの画面に複数の出力ボタンがあるときは、run の key で、どれを作成中か区別できます。
 */
export function usePdfExport() {
    /** 作成中の出力のkey。nullなら作成していない */
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * 処理を実行します。失敗したときは、メッセージを error に入れます。
     *
     * @param task PDFを作って保存する処理
     * @param key 何の出力かを区別する名前（出力ボタンが1つなら省略してよい）
     */
    const run = async (task: () => Promise<void>, key = "pdf") => {
        if (busyKey !== null) return;
        setBusyKey(key);
        setError(null);
        try {
            await task();
        } catch (e) {
            setError(getErrorMessage(e));
        } finally {
            setBusyKey(null);
        }
    };

    return { busy: busyKey !== null, busyKey, error, run };
}

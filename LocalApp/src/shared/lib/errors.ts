/**
 * 例外オブジェクトから表示用メッセージを取り出します。
 *
 * @param error catchで受け取った値。Errorならmessage、それ以外は文字列化して返す
 */
export function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
}

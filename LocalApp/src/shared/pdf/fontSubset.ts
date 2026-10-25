import { translate } from "./messages.ts";
/** フォントのうち、指定した文字だけを残した小さなフォントを作る関数 */
export type FontSubsetter = (font: Uint8Array, text: string) => Promise<Uint8Array>;

/** harfbuzz(WebAssembly)のエクスポート（使うものだけ。型は緩く扱う） */
type Hb = {
    memory: WebAssembly.Memory;
    _initialize: () => void;
    malloc: (size: number) => number;
    free: (ptr: number) => void;
    hb_subset_input_create_or_fail: () => number;
    hb_subset_input_destroy: (input: number) => void;
    hb_subset_input_set: (input: number, kind: number) => number;
    hb_subset_input_unicode_set: (input: number) => number;
    hb_subset_input_get_flags: (input: number) => number;
    hb_subset_input_set_flags: (input: number, flags: number) => void;
    hb_set_clear: (set: number) => void;
    hb_set_invert: (set: number) => void;
    hb_set_add: (set: number, value: number) => void;
    hb_blob_create: (data: number, length: number, mode: number, userData: number, destroy: number) => number;
    hb_blob_destroy: (blob: number) => void;
    hb_blob_get_data: (blob: number, length: number) => number;
    hb_blob_get_length: (blob: number) => number;
    hb_face_create: (blob: number, index: number) => number;
    hb_face_destroy: (face: number) => void;
    hb_face_reference_blob: (face: number) => number;
    hb_subset_or_fail: (face: number, input: number) => number;
};

const HB_MEMORY_MODE_WRITABLE = 2;
const HB_SUBSET_SETS_LAYOUT_FEATURE_TAG = 6;
const HB_SUBSET_FLAGS_NO_HINTING = 0x1;

/**
 * harfbuzz(WebAssembly)でフォントを必要な文字だけに絞る関数を作ります。
 * pdf-lib(fontkit)自身のサブセット化は、BIZ UDゴシックなどで文字が欠けてしまうため、代わりにこちらで絞ってから、絞り済みのフォントをそのまま埋め込みます。
 *
 * @param loadWasm harfbuzz-subset.wasmの中身を返す関数（ブラウザではfetch、Nodeではファイル読み込み）
 */
export function createFontSubsetter(loadWasm: () => Promise<ArrayBuffer | Uint8Array>): FontSubsetter {
    let hbPromise: Promise<Hb> | null = null;
    const loadHb = () => {
        hbPromise ??= (async () => {
            const bytes = await loadWasm();
            const { instance } = await WebAssembly.instantiate(bytes as BufferSource);
            const hb = instance.exports as unknown as Hb;
            hb._initialize();
            return hb;
        })();
        return hbPromise;
    };

    return async (font, text) => {
        const hb = await loadHb();
        // wasmのメモリは伸びると以前のviewが無効になるため、使うたびに新しく取る
        const heap = () => new Uint8Array(hb.memory.buffer);

        const input = hb.hb_subset_input_create_or_fail();
        if (input === 0) throw new Error(translate().t("subsetStartFailed"));

        const fontPtr = hb.malloc(font.byteLength);
        heap().set(font, fontPtr);
        const blob = hb.hb_blob_create(fontPtr, font.byteLength, HB_MEMORY_MODE_WRITABLE, 0, 0);
        const face = hb.hb_face_create(blob, 0);
        hb.hb_blob_destroy(blob);

        // レイアウト用の機能(GSUB/GPOS)は、すべて残す
        const features = hb.hb_subset_input_set(input, HB_SUBSET_SETS_LAYOUT_FEATURE_TAG);
        hb.hb_set_clear(features);
        hb.hb_set_invert(features);
        hb.hb_subset_input_set_flags(input, hb.hb_subset_input_get_flags(input) | HB_SUBSET_FLAGS_NO_HINTING);

        const unicodes = hb.hb_subset_input_unicode_set(input);
        for (const ch of text) hb.hb_set_add(unicodes, ch.codePointAt(0)!);

        let subset = 0;
        try {
            subset = hb.hb_subset_or_fail(face, input);
        } finally {
            hb.hb_subset_input_destroy(input);
        }
        if (subset === 0) {
            hb.hb_face_destroy(face);
            hb.free(fontPtr);
            throw new Error(translate().t("subsetFailed"));
        }

        const result = hb.hb_face_reference_blob(subset);
        const offset = hb.hb_blob_get_data(result, 0);
        const length = hb.hb_blob_get_length(result);
        const out = new Uint8Array(heap().subarray(offset, offset + length)); // コピーを取る
        hb.hb_blob_destroy(result);
        hb.hb_face_destroy(subset);
        hb.hb_face_destroy(face);
        hb.free(fontPtr);
        if (out.length === 0) throw new Error(translate().t("subsetEmpty"));
        return out;
    };
}

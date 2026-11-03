/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** 不具合報告・質問の投稿の受付先URL（未設定なら投稿できない） */
    readonly VITE_FEEDBACK_ENDPOINT?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

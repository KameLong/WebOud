# WebOud Local

OuDia（運行ダイヤ作成ソフト）のWeb版を、バックエンド不要・ブラウザのローカルストレージのみで
動作するPWAとして実装したものです。React + TypeScript + Vite製。

## 特徴

- サーバー通信なし。全データは端末のブラウザ内（localStorage）に保存されます。
- PWA対応（インストール可能・オフラインでアプリ本体を起動可能）。
- 路線ごとに 駅・列車種別・時刻表（上り/下り）・ダイヤグラム を編集できます。
- 路線データはJSONファイルとしてエクスポート/インポートでき、端末間の移行やバックアップに使えます。
- 表示言語は 日本語・English・繁體中文（台灣）。ブラウザの言語設定では切り替えず、設定画面の「表示言語」で選びます（初期値は日本語）。PDFも、選んだ言語で出力します。

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # 本番ビルド（PWAアセット込み）
npm run lint     # oxlint
```

## ソースの構成

機能ごとにフォルダを分け、複数の機能で使うものだけを `shared` に置いています。

```
src/
  main.tsx            エントリ
  app/                アプリ全体（ルーティング・テーマ・全体CSS）
  domain/             画面に依存しないデータの型と計算（駅の表示形式・時刻・列車・色など）
  store/              localStorageへの保存、路線データの操作API、データ取得フック、サンプルダイヤの読み込み（`public/sample/sample.weboud.json`）
  shared/
    lib/              エラー処理・キー入力・直列実行キュー
    ui/               ヘルプ・ゴミ箱アイコン・均等割付の文字など共通の部品
    hooks/            文字サイズ・スマホ判定
    indexed-list/     駅一覧・種別一覧の共通部品（選択・コピー&ペースト・キー操作）
    pdf/              PDF出力の共通部分（フォント・描画ヘルパー・状態管理）
  features/
    route-list/       路線一覧（トップ）
    route-edit/       路線編集（駅一覧・列車種別一覧）
    timetable/        路線時刻表（グリッド編集・PDF出力）
    station-timetable/ 駅時刻表（PDF出力）
    diagram/          ダイヤグラム（PDF出力）
    oudia-import/     OuDiaファイルの取り込み
    navigation/       メニュー（路線ツリー・スマホ用メニュー）
    settings/         設定
```

## 多言語対応（日本語・English・繁體中文）

- 画面の文言は、機能ごとの `messages.ts`（例: `src/features/timetable/messages.ts`）に、3言語ぶんをまとめて書きます。
  `defineMessages({ ja, en, "zh-TW" })` で定義すると、どれかの言語にキーが足りないとき、型エラーになります。
- 画面の中では `const { t } = useT()`（言語を切り替えると再描画）、画面の外（保存データの操作・PDFの作成）では `translate().t(...)` で文言を取り出します。
  文言の中の `{名前}` は、第2引数で置き換えます。複数の言語で使う文言（キャンセル・着/発など）は `src/shared/i18n/common.ts` にあります。
- 表示言語は設定（`store/settings.ts`）に保存し、ブラウザの言語設定では切り替えません。新しい言語を足すには、`shared/i18n/languages.ts` に言語を足し、各 `messages.ts` にその言語の文言を足します。
- PDFの本文フォントは、日本語・English が BIZ UDゴシック、繁體中文が Noto Sans TC（無い文字は BIZ UDゴシックで補う）です（`public/pdf-font/`）。
  繁體中文のフォントは、繁體中文でPDFを初めて作るときだけ読み込みます（約7MB。以降はオフラインでも使えます）。
- 路線のデータ（駅名・列車名など）は翻訳しません。

## データの保存場所

`localStorage` キー `weboud.localapp.routes.v1` に、全路線データがJSONとして保存されます。
ブラウザのデータを消去すると失われるため、重要なデータは適宜「全データをエクスポート」で
バックアップしてください。

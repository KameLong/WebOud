# WebOud Local

OuDia（運行ダイヤ作成ソフト）のWeb版を、バックエンド不要・ブラウザのローカルストレージのみで
動作するPWAとして実装したものです。React + TypeScript + Vite製。

## 特徴

- サーバー通信なし。全データは端末のブラウザ内（localStorage）に保存されます。
- PWA対応（インストール可能・オフラインでアプリ本体を起動可能）。
- 路線ごとに 駅・列車種別・時刻表（上り/下り）・ダイヤグラム を編集できます。
- 路線データはJSONファイルとしてエクスポート/インポートでき、端末間の移行やバックアップに使えます。

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
  store/              localStorageへの保存、路線データの操作API、データ取得フック、サンプルダイヤ
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

## データの保存場所

`localStorage` キー `weboud.localapp.routes.v1` に、全路線データがJSONとして保存されます。
ブラウザのデータを消去すると失われるため、重要なデータは適宜「全データをエクスポート」で
バックアップしてください。

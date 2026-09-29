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

## データの保存場所

`localStorage` キー `weboud.localapp.routes.v1` に、全路線データがJSONとして保存されます。
ブラウザのデータを消去すると失われるため、重要なデータは適宜「全データをエクスポート」で
バックアップしてください。

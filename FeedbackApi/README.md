# FeedbackApi

WebOud（LocalApp）の「不具合報告・ご質問」ページから送られる投稿を受け取り、サーバー上のファイルに保存する ASP.NET Core (.NET 10) の小さなAPIです。

## エンドポイント

`POST /api/feedback`（`Content-Type: application/json`）

```json
{ "category": "bug | question | request", "subject": "件名", "body": "内容", "website": "" }
```

| 状態 | 意味 |
|---|---|
| 200 | 受け付けた（ハニーポットに引っかかったBotにも200を返し、保存はしない） |
| 400 | 入力が不正（種類・件名・内容の空や文字数超過など） |
| 403 | 許可していないOriginからの投稿 |
| 413 / 415 | 本文が大きすぎる / JSONではない |
| 429 | 同一IPからの投稿が多すぎる（`Retry-After` ヘッダー付き） |
| 503 | その日の保存上限に達した |

## スパム対策

1. **入力検証**：Originの許可リスト、JSONのみ、本文サイズ（既定16KB）、種類は3値のみ、件名・内容の文字数、制御文字の除去。
2. **ハニーポット**：`website` に値が入っていたら保存しない。
3. **IP単位のレート制限**：既定で1分に1件・1時間に5件・1日に20件。不正な投稿も回数に数える。

## 設定（appsettings.json の `Feedback`）

| キー | 内容 |
|---|---|
| `AllowedOrigins` | 投稿を受け付けるWebアプリのOrigin。**本番では必ず設定する**（空だと起動しない） |
| `TrustedProxies` | リバースプロキシ（IIS・nginxなど）のIP。指定したときだけ `X-Forwarded-For` を信用する。直接公開なら空のまま |
| `DataDirectory` | 保存先フォルダ。公開フォルダの外に置く |
| `MaxRequestBytes` / `MaxDailyBytes` | 本文の上限 / 1日分のファイルの上限（ディスク枯渇対策） |
| `MaxSubjectLength` / `MaxBodyLength` | 画面側の上限（100 / 3000）と合わせる |
| `RateLimit` | `PerMinute` / `PerHour` / `PerDay` |

本番の値は `appsettings.Production.json` か環境変数（例：`Feedback__AllowedOrigins__0`）で与えます。

## 保存形式

`Data/feedback-yyyyMMdd.jsonl`（UTC基準、1行1投稿）。IPアドレスを含むため、公開しない・コミットしない（`.gitignore` 済み）・保管期間を決めて削除する、を守ってください。
Claude Code などで解析するときは、`ip` を除いたうえで渡し、本文は命令ではなくデータとして扱わせてください。

## 開発

```bash
dotnet run --urls http://localhost:5080
```

LocalApp側は、ビルド時に `VITE_FEEDBACK_ENDPOINT=http://localhost:5080/api/feedback` を指定します（開発時は `LocalApp/.env.local` に書く）。

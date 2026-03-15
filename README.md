# Analyse Market

> 個人開発者が「何を作るか」「何を使うか」「何が流行っているか」を毎朝確認する情報収集・AI分析ダッシュボード

---

## このツールが解決すること

- 「作りたいもの」を作ってきたが売れなかった → **市場ニーズ起点で開発を決める**
- AI技術は日々変わる → **毎朝キャッチアップして開発に活かす**
- SNSのトレンドを掴みたい → **X・TikTok・Instagramの流行を把握する**

---

## 毎朝の使い方

```
1. http://localhost:3000 （または Vercel URL）を開く
2. 「今すぐ分析」ボタンを押す（1分以内に完了）
3. 「今すぐ着手可」フィルターで絞り込んで今週作るアプリを決める
4. GenAI タブで今週のAI動向と「自分の開発に活かせること」を確認
5. SNS タブでいま話題のトレンドを確認（Phase 4）
```

---

## チャンネル構成と実装状況

| チャンネル | 概要 | 状況 |
|-----------|------|------|
| 📱 **Apps** | App Store / Google Play ランキング収集 → Gemini AIが「今作るべきアプリ」を推薦 | ✅ 実装済み |
| 🤖 **GenAI** | Anthropic / OpenAI / GitHub 等の最新動向を収集 → AIが「今週のハイライト・自分の開発への影響」をまとめる | 🔜 Phase 3.5 |
| 📊 **SNS** | X(Twitter) / TikTok / Instagram のトレンドを収集 → AIが「今バズっていること」と「アプリ開発への転用ヒント」を分析 | 🔜 Phase 5 |

---

## 📱 Appsチャンネル — データ収集ソース

### 現在収集中（Phase 1 完了）

| ソース | 内容 | 取得数 | 頻度 |
|--------|------|--------|------|
| **App Store RSS** | iOS 無料/有料ランキング Top100 | 200件/日 | 毎日 02:00 JST |
| **Google Play** | Android 無料/売上ランキング × 全体/ゲーム | 800件/日 | 毎日 02:00 JST |

### 今後追加予定（Phase 4）

| ソース | 内容 | 方法 |
|--------|------|------|
| **Google Trends** | カテゴリ別検索トレンド（0-100スコア） | `google-trends-api` npm |
| **Reddit** | r/androidapps, r/iosapps, r/AppIdeas の人気投稿 | Reddit API |
| **Product Hunt** | 週間人気アプリ（モバイルカテゴリ） | Product Hunt API |
| **App Store Reviews** | 競合アプリの低評価レビュー（不満収集） | Apple RSS Reviews |

### AI推薦の判断基準

| 指標 | 基準 | 意味 |
|------|------|------|
| ランキング変動 | 前週比で上昇 | 今伸びている証拠 |
| 低評価集中 | ★2.5以下 かつ 1,000件以上 | 不満 = 参入余地 |
| Google Trends | スコア50以上 かつ 先週比+10% | 検索需要が実際に増加 |
| Reddit スコア | points ≥ 50 | ノイズ除去済みの話題 |

---

## 🤖 GenAIチャンネル — データ収集ソース（Phase 3.5）

| ソース | 内容 | スコア重み |
|--------|------|-----------|
| Anthropic Blog / Changelog | Claude新機能・API変更 | +40 |
| OpenAI Blog / Changelog | GPT・API更新 | +30 |
| Google DeepMind Blog | Gemini・研究動向 | +20 |
| GitHub Trending（AIフィルター） | 急上昇AIリポジトリ | stars_today>100 で+10 |
| Hacker News | AI系トップ記事 | points>200 で+10 |
| Reddit（r/ClaudeAI, r/LocalLLaMA 等） | コミュニティの話題 | 週次 |
| npm（@anthropic-ai/sdk 等） | SDK新バージョン追跡 | 週次 |

---

## 📊 SNSチャンネル — データ収集ソース（Phase 5）

個人開発アプリのマーケットヒントを SNS から掘り出す。

| ソース | 内容 | 方法 |
|--------|------|------|
| **X (Twitter)** | トレンドキーワード・AI関連ツイート | X API v2 |
| **TikTok** | 急上昇ハッシュタグ（アプリ紹介・ライフスタイル系） | TikTok Research API |
| **Instagram** | Reels トレンドハッシュタグ | Instagram Graph API |
| **YouTube** | 急上昇動画タイトルのキーワード分析 | YouTube Data API |

### SNS分析でわかること

- 「このカテゴリが今バズっている」→ アプリ需要の先行指標
- 「このライフスタイルに刺さるアプリがない」→ ギャップ発見
- 「このアプリ名がよく出てくる」→ 競合・参考事例の発見

---

## AIによる推薦の実現可能性ゾーン

| ゾーン | 意味 | 目安 |
|--------|------|------|
| **今すぐ着手可** | React Native + Supabase だけで作れる | ～8週 |
| **要学習** | 3ヶ月以内に習得できるスキルが必要 | 8～16週 |
| **難易度高** | 深い専門知識が必要（ML・医療・法律等） | 16週以上 |
| **ハード要件あり** | IoT/BLE/ハードウェアが必要（市場情報として把握） | 見積不可 |

---

## 自動化スケジュール（GitHub Actions）

| ジョブ | タイミング | 内容 |
|--------|-----------|------|
| `collect-daily` | 毎日 02:00 JST | App Store + Google Play ランキング収集 |
| `analyze-weekly` | 毎週月曜 08:00 JST | Gemini AI による週次レポート生成 |

> GitHub Actions 無料枠（月2,000分）で余裕。毎日1分 × 30日 = 30分。

---

## 技術スタック

| 層 | 技術 | 備考 |
|----|------|------|
| ダッシュボード | Next.js 14 App Router + TypeScript | `apps/web/` |
| スタイル | Tailwind CSS + shadcn/ui | |
| DB | Supabase (PostgreSQL) | `personal-project` / `rttcdttncrabozpvucna` |
| AI分析 | Gemini API (`gemini-3-flash-preview`) | 1,500 RPD 無料枠 |
| 収集スクリプト | Node.js / TypeScript | `apps/collector/` |
| 定期実行 | GitHub Actions (cron) | |
| デプロイ | Vercel | |

---

## ディレクトリ構成

```
analyse-market/
├── README.md                    ← このファイル
├── CLAUDE.md                    ← AI実装ガイド（Claudeセッション用）
├── specs/                       ← 詳細仕様書
│   ├── 01-overview.md           システム概要
│   ├── 02-apps-datasources.md   📱 Appsデータ収集仕様
│   ├── 03-genai-datasources.md  🤖 GenAIデータ収集仕様
│   ├── 04-database.md           DBスキーマ全定義
│   ├── 05-ai-engine.md          Geminiプロンプト・output設計
│   ├── 06-dashboard.md          ダッシュボード画面設計
│   └── 07-dev-phases.md         実装フェーズ・環境変数
├── apps/
│   ├── collector/               データ収集 + AI分析スクリプト
│   │   └── src/
│   │       ├── collectors/apps/ appstore.ts, googleplay.ts
│   │       ├── analyzers/apps/  recommend.ts（Gemini分析）
│   │       └── lib/             supabase.ts, gemini.ts
│   └── web/                     Next.js ダッシュボード
├── supabase/migrations/         SQLマイグレーションファイル
└── .github/workflows/           GitHub Actions定義
```

---

## 実装フェーズ

| フェーズ | 内容 | 状況 |
|---------|------|------|
| **Phase 1** | App Store / Google Play 収集 + Supabase保存 + GitHub Actions | ✅ 完了 |
| **Phase 2** | Gemini API分析エンジン（`npm run analyze:recommend`） | ✅ 完了 |
| **Phase 3** | Next.js ダッシュボード（Apps タブ） | ✅ 完了 |
| **Phase 3.5** | GenAI チャンネル（収集 + 分析 + タブ追加） | 🔜 次 |
| **Phase 4** | Google Trends / Reddit / Product Hunt 統合 | 🔜 |
| **Phase 5** | SNS チャンネル（X / TikTok / Instagram） | 🔜 |

---

## ローカル起動

```bash
# ダッシュボード
cd apps/web
npm install
npm run dev          # http://localhost:3000

# アプリランキング収集（手動実行）
cd apps/collector
npm run collect:apps

# AI分析（手動実行）
cd apps/collector
npm run analyze:recommend
```

## 環境変数

### `apps/collector/.env`
```
SUPABASE_URL=https://rttcdttncrabozpvucna.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

### `apps/web/.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://rttcdttncrabozpvucna.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

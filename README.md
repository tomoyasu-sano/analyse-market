# Analyse Market

> 個人開発者が「何を作るか」「何を使うか」を毎朝確認する情報収集・AI分析ダッシュボード

---

## このツールが解決すること

- 「作りたいもの」を作ってきたが売れなかった → **市場ニーズ起点で開発を決める**
- AI技術は日々変わる → **毎朝キャッチアップして開発に活かす**

---

## 毎朝の使い方

```
1. http://localhost:3001（または Vercel URL）を開く
2. 「今すぐ分析」ボタンを押す（Apps タブ or GenAI タブ）
3. 「今週のサマリー」ボタンを押して今週全体を1画面で確認
4. Apps タブ → 「今すぐ着手可」フィルターで今週作るアプリを決める
5. GenAI タブ → 今週のAI動向と「明日やること」を確認
```

---

## チャンネル構成

| チャンネル | 概要 | 状況 |
|-----------|------|------|
| **Apps** | App Store / Google Play ランキング + Google Trends → 「今作るべきアプリ5件」を推薦 | ✅ 実装済み |
| **GenAI** | Anthropic / OpenAI / Google / GitHub / HN / Reddit / PH / npm → 「今週のAI動向・明日やること」 | ✅ 実装済み |
| **SNS** | X(Twitter) / TikTok / Instagram のトレンド収集 | 🔜 Phase 5 |

---

## Apps チャンネル — データ収集ソース

| ソース | 内容 | 頻度 |
|--------|------|------|
| **App Store RSS** | iOS 無料/有料 Top100 | 毎日 02:00 JST |
| **Google Play Scraper** | Android 無料/売上 × 全体/ゲーム Top200 | 毎日 02:00 JST |
| **Google Trends** | アプリ関連キーワード7件のスコア・momentum | 毎日 02:00 JST |

### AI推薦の判断基準（優先順）

1. iOS + Android **両方でランクイン**（需要の確実性）
2. Google Trends が **↑上昇中**（タイミングが今）
3. 既存アプリの**評価が低い**（★2.5以下・1000件以上）= 参入余地あり
4. React Native で **6週以内に1人で作れる**

---

## GenAI チャンネル — データ収集ソース

| ソース | 内容 | スコア |
|--------|------|--------|
| **Anthropic Blog** | Claude新機能・API変更 | ベース+40 |
| **OpenAI Blog** | GPT・API更新 | ベース+30 |
| **Google AI Blog** | Gemini・DeepMind動向 | ベース+50 |
| **GitHub Trending** | 急上昇AIリポジトリ（AIキーワードフィルタ） | stars数で加算 |
| **Hacker News** | AI系トップ記事（50 points以上） | points数で加算 |
| **Reddit** | r/ClaudeAI・r/LocalLLaMA・r/MachineLearning | upvotes/100 |
| **Product Hunt** | AI製品 Top（50 votes以上） | votes/10 |
| **npm** | @anthropic-ai/sdk・openai 等7パッケージのバージョン変化 | 固定70 |

### AI分析の出力セクション

| セクション | 内容 |
|-----------|------|
| 今週のハイライト | 最重要1〜3件（URL付き、なぜ重要か・開発への影響） |
| npmアップデートアラート | 使用中ライブラリの破壊的変更を検出 |
| 新しいAIツール | 今すぐ試せるツール・ライブラリ（最大3件） |
| コミュニティの声 | Reddit・HN で話題のトピック |
| 自分の開発に今すぐ活かせること | **明日できる具体的な作業3件** |

---

## 週次サマリー機能

ヘッダーの「今週のサマリー」ボタンを押すと、**全チャンネルのデータを横断した1週間の総括**を生成します。

| 出力セクション | 内容 |
|---|---|
| 今週の総括 | 今週を一言で表す3〜4行の評価 |
| 今週の勝ち筋 | 今週のデータから導ける「今作ると勝てる」アプリ1〜2件 |
| 今週のAI活用ヒント | GenAI動向から「自分のコードに即使える」技術 |
| 来週やること | 月曜から始められる具体的な作業3件 |

---

## 自動化スケジュール（GitHub Actions）

| ジョブ | タイミング | 内容 |
|--------|-----------|------|
| `collect-daily` | 毎日 02:00 JST | Apps（App Store・Google Play・Trends）+ GenAI（全8ソース）収集 |
| `analyze-weekly` | 毎週月曜 08:00 JST | Apps推薦 + GenAI週次レポート生成 |

> GitHub Actions 無料枠（月2,000分）で余裕。合計1日あたり約2〜3分。

---

## 技術スタック

| 層 | 技術 |
|----|------|
| ダッシュボード | Next.js 16 App Router + TypeScript |
| スタイル | Tailwind CSS |
| DB | Supabase (PostgreSQL) — `personal-project` / `rttcdttncrabozpvucna` |
| AI分析 | Gemini API (`gemini-2.0-flash-001`) |
| 収集スクリプト | Node.js / TypeScript (`apps/collector/`) |
| 定期実行 | GitHub Actions (cron) |
| デプロイ | Vercel（予定） |

---

## ディレクトリ構成

```
analyse-market/
├── README.md
├── CLAUDE.md                         ← AI実装ガイド（Claudeセッション用）
├── specs/                            ← 詳細仕様書
├── apps/
│   ├── collector/src/
│   │   ├── collectors/
│   │   │   ├── apps/                 appstore.ts, googleplay.ts, trends.ts
│   │   │   └── genai/                anthropic.ts, openai.ts, google.ts,
│   │   │                             github.ts, hackernews.ts, reddit.ts,
│   │   │                             producthunt.ts, packages.ts
│   │   ├── analyzers/
│   │   │   ├── apps/                 recommend.ts（Trends統合済み）
│   │   │   └── genai/                weekly-report.ts
│   │   └── lib/                      supabase.ts, gemini.ts
│   └── web/
│       ├── app/
│       │   ├── page.tsx              Server Component（データ取得）
│       │   └── api/
│       │       ├── apps/analyze/     Apps オンデマンド分析
│       │       ├── genai/analyze/    GenAI オンデマンド分析
│       │       └── summary/weekly/   週次サマリー生成 + 取得
│       └── components/
│           ├── Dashboard.tsx
│           ├── WeeklySummary.tsx     週次サマリーボタン + モーダル
│           ├── apps/                 TopCard, RecommendCard, AppsDashboard
│           └── genai/                GenAiDashboard, GenAiAnalyzeButton
├── supabase/migrations/
│   ├── phase35_run.sql               amk_genai_items, amk_genai_analyses
│   ├── phase4_run.sql                amk_trend_signals, CHECK制約拡張
│   └── phase4b_summary.sql          weekly_summary タイプ追加
└── .github/workflows/
    ├── collect-daily.yml             全ソース毎日収集
    └── analyze-weekly.yml            週次分析（Apps + GenAI）
```

---

## 実装フェーズ

| フェーズ | 内容 | 状況 |
|---------|------|------|
| **Phase 1** | App Store / Google Play 収集 + GitHub Actions | ✅ 完了 |
| **Phase 2** | Gemini AI 分析エンジン（推薦生成） | ✅ 完了 |
| **Phase 3** | Next.js ダッシュボード（Apps タブ） | ✅ 完了 |
| **Phase 3.5** | GenAI チャンネル（8ソース収集 + 分析 + タブ） | ✅ 完了 |
| **Phase 4** | Google Trends 統合・分析精度向上・週次サマリー | ✅ 完了 |
| **Phase 5** | SNS チャンネル（X / TikTok / Instagram） | 🔜 |

---

## ローカル起動

```bash
# ダッシュボード
cd apps/web && npm install && npm run dev
# → http://localhost:3000

# 全ソース収集（手動）
cd apps/collector
npm run collect:apps      # App Store + Google Play
npm run collect:genai     # Anthropic + OpenAI + GitHub + HN
npm run collect:phase4    # npm + Reddit + Google + ProductHunt + Trends

# AI分析（手動）
npm run analyze:recommend  # Apps 推薦（5件・Trends統合）
npm run analyze:genai      # GenAI 週次レポート
```

---

## 環境変数

### `apps/collector/.env`
```
SUPABASE_URL=https://rttcdttncrabozpvucna.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
PRODUCT_HUNT_API_TOKEN=    # Product Hunt収集に必要
```

### `apps/web/.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://rttcdttncrabozpvucna.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

### GitHub Actions Secrets
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
PRODUCT_HUNT_API_TOKEN     # 任意（未設定時はスキップ）
```

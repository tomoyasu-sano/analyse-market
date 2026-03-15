# CLAUDE.md — Analyse Market 実装ガイド

> このファイルを読めば、新規のClaudeセッションでも即実装に入れる。

---

## このプロジェクトとは

**Analyse Market** — 個人開発者が毎朝確認する情報収集・分析AIダッシュボード。

### 解決したい問題
- オーナーはこれまで「作りたいもの」を作ってきたが売れなかった
- **市場ニーズを起点に「何を作るか」「どんなAIツールを使うか」を決める**仕組みが必要
- 朝イチでここを見れば判断材料が揃っている状態にする

### 3つのチャンネル（+ 将来追加可能な拡張設計）
```
📱 Apps チャンネル   App Store/Google Play のランキングを毎日収集 → AI分析 → 「今作るべきアプリ」推薦
🤖 GenAI チャンネル  Anthropic/OpenAI/GitHub 等を毎日収集 → AI分析 → 「今週のAI動向・自分の開発への影響」レポート
📊 SNS チャンネル    X(Twitter)/TikTok/Instagram のトレンドを収集 → AI分析 → 「今バズっていること・アプリ開発への転用ヒント」
```

---

## オーナーのプロフィール（実装の前提として把握すること）

- **スキル**: Next.js / Supabase / TypeScript（経験あり）、React Native（これから習得）
- **開発スタイル**: 1人開発
- **目標**: React Native でスマホアプリを作って App Store / Google Play で収益化
- **このツール自体**: 自分専用（認証は自分のアカウント1つのみ）
- **Claude / Claude Code** を中心に生成AIを活用して開発している

---

## 技術スタック（確定済み）

| 層 | 技術 | 備考 |
|----|------|------|
| フロントエンド | Next.js 14 (App Router) + TypeScript | |
| スタイル | Tailwind CSS + shadcn/ui | |
| DB | Supabase (PostgreSQL) | リージョン: Northeast Asia (Tokyo) |
| 認証 | Supabase Auth | 自分のアカウント1つのみ |
| AI分析 | **Gemini API (`gemini-2.0-flash`)** | オーナーが API キー保有 |
| AI SDK | `@google/generative-ai` (npm) | |
| データ収集スクリプト | Node.js / TypeScript | |
| 定期実行 | GitHub Actions (cron) | Private リポジトリ、無料枠で十分 |
| デプロイ | Vercel | |

**重要**: AI分析はすべて Gemini API に統一。Claude API / Anthropic SDK は使わない。

---

## Supabase プロジェクト情報

- **プロジェクト名**: `personal-project`（複数のMVPアプリを同一プロジェクトで管理する共有プロジェクト）
- **URL**: `https://rttcdttncrabozpvucna.supabase.co`
- **Project ID**: `rttcdttncrabozpvucna`
- **テーブル作成方法**: Supabase MCP 経由でClaudeが直接実行
- **RLS方針**: 全テーブルで anon 不可、authenticated（自分のみ）が全操作可、スクリプトは SERVICE_ROLE_KEY で RLS バイパス

### テーブル命名規則（重要）

同一Supabaseプロジェクトに複数のアプリが同居するため、**必ず `amk_` プレフィックスを付ける**。

| テーブル | 説明 |
|---------|------|
| `amk_app_rankings` | App Store / Google Play ランキング |
| `amk_trend_signals` | Google Trends・Reddit トレンドシグナル |
| `amk_app_analyses` | Apps チャンネルの AI分析レポート |
| `amk_app_recommendations` | AI推薦アプリ案 |
| `amk_genai_items` | GenAI チャンネルの収集アイテム |
| `amk_genai_analyses` | GenAI チャンネルの AI分析レポート |
| `amk_collection_logs` | 収集ジョブのログ |

**ルール**: `amk_` なしのテーブル名は絶対に使わない。他アプリのテーブルと衝突するため。

---

## リポジトリ・ファイル構成

```
analyse-market/                          ← このディレクトリ（/Users/tomoyasu/develop/analyse-market）
├── CLAUDE.md                       ← このファイル（実装ガイド）
├── README.md                       ← プロジェクト概要
├── specs/                          ← 仕様書（実装前に必ず読む）
│   ├── 01-overview.md              システム概要・アーキテクチャ・自動化フロー
│   ├── 02-apps-datasources.md      📱 Apps: 収集ソース・収集基準・スクリプト構成
│   ├── 03-genai-datasources.md     🤖 GenAI: 収集ソース・スコアリング・スクリプト構成
│   ├── 04-database.md              全テーブルの完全なスキーマ定義
│   ├── 05-ai-engine.md             Gemini APIプロンプト全文・output形式の設計
│   ├── 06-dashboard.md             Next.js画面構成・タブUI・API Routes
│   └── 07-dev-phases.md            実装フェーズ（Phase 1〜4）・環境変数・ディレクトリ構成
│
├── apps/                           ← 実装コード（これから作る）
│   ├── collector/                  データ収集 + AI分析スクリプト（Node.js/TypeScript）
│   └── web/                        Next.js ダッシュボード
│
├── supabase/
│   └── migrations/                 SQLマイグレーションファイル
│
└── .github/
    └── workflows/
        ├── collect-daily.yml       毎日 02:00 JST に自動収集
        └── analyze-weekly.yml      毎週月曜 08:00 JST に自動分析
```

---

## 実装フェーズ（優先順）

詳細は `specs/07-dev-phases.md` を参照。ここでは概要のみ。

### Phase 1 ✅ 完了
App Store / Google Play 収集 + Supabase保存 + GitHub Actions

### Phase 2 ✅ 完了
Gemini API 分析エンジン（`npm run analyze:recommend` で推薦出力）

### Phase 3 ✅ 完了
Next.js ダッシュボード（Appsタブ）+ 「今すぐ分析」ボタン

### Phase 3.5（次に着手）
**GenAI チャンネル追加（収集 + 分析 + GenAI タブ）**
完了基準: 朝開くと Apps と GenAI の両タブが埋まっている

### Phase 4（データソース拡充）
Google Trends / Reddit / Product Hunt の統合、精度向上

### Phase 5（SNSチャンネル）
**X(Twitter) / TikTok / Instagram トレンド収集 + AI分析 + SNSタブ追加**
完了基準: SNSで今バズっていることとアプリ開発への転用ヒントが見られる

---

## 環境変数（必要なキー一覧）

### GitHub Actions Secrets に登録するもの
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

### ローカル `.env.local`（web用）
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

---

## 実装時の重要ルール

1. **AIライブラリは `@google/generative-ai` のみ**。`@anthropic-ai/sdk` は使わない
2. **数値根拠なしの推薦は出力しない**。プロンプトで明示的に指示すること
3. **collector スクリプトは TypeScript で書く**。フロントと同じ言語で管理コストを下げる
4. **エラーは `amk_collection_logs` テーブルに記録**してサイレントに失敗させない
5. **自分専用ツールなのでUIより機能・情報密度優先**。shadcn/ui でシンプルに作る

---

## output 設計（解釈しやすい出力の形）

### 📱 Apps 推薦カード（表示例）
```
🟢 #1  睡眠記録 ＋ AI アドバイスアプリ
競合: low ／ 市場: large ／ 概算: 4〜6週
根拠: sleep tracker が Google Trends +23%（先週比）
      App Store 無料Top20に3本、平均評価2.8★（不満多数）
差別化: シンプル入力 + 毎朝のAI一言コメント
必要スキル: React Native, Supabase のみ
```

### 🤖 GenAI ハイライト（表示例）
```
🔴 Anthropic  Claude 3.7 Sonnet リリース（2026-03-12）
   extended thinking 強化。長い推論タスクのコスト半減。
   → 自分への影響: Claude Code でのリファクタが速くなる可能性
   [記事を見る →]
────────────────
自分の開発に今すぐ活かせること
• @anthropic-ai/sdk が v0.39 → breaking change あり（注意）
• Vercel AI SDK が Gemini 対応強化 → 持ってるキーで使いやすくなった
```

---

## 仕様書を読む順番（実装前の推奨手順）

```
1. この CLAUDE.md（今読んでいるもの）
2. specs/01-overview.md    全体像・自動化フローを把握
3. specs/04-database.md    テーブル構造を理解（MCP でテーブル作成に必要）
4. specs/02-apps-datasources.md  収集スクリプトの実装内容
5. specs/05-ai-engine.md   Gemini へのプロンプト全文
6. specs/06-dashboard.md   ダッシュボードの画面構成
7. specs/07-dev-phases.md  タスクリスト・環境変数
```

# 07. 実装フェーズ・ディレクトリ構成・環境変数

## 実装フェーズ

### Phase 1: データ収集基盤（最初にやる・MVPの土台）

**目標**: 毎日自動でランキングを取得しDBに保存される状態にする

- [ ] Supabase 接続確認（`personal-project` / `rttcdttncrabozpvucna.supabase.co` を使用）
- [ ] DBマイグレーション（`amk_app_rankings`, `amk_collection_logs`）
- [ ] App Store RSS 収集スクリプト（`appstore.ts`）
- [ ] Google Play 収集スクリプト（`googleplay.ts`）
- [ ] 収集スクリプトをローカルで動作確認
- [ ] GitHub Actions `collect-daily.yml` 設定・動作確認

**完了基準**: 毎日02:00 JSTに自動でランキングデータが蓄積される

---

### Phase 2: AI分析エンジン（これでMVPとして機能する）

**目標**: データをもとにClaude APIが「今作るべきアプリ」を提案する

- [ ] DBマイグレーション（`amk_trend_signals`, `amk_app_analyses`, `amk_app_recommendations`）
- [ ] Gemini API 統合（`@google/generative-ai`）
- [ ] 週次レポート生成スクリプト（`weekly-report.ts`）
- [ ] オンデマンド推薦スクリプト（`recommend.ts`）
- [ ] ローカルで手動実行して出力確認・プロンプトチューニング
- [ ] GitHub Actions `analyze-weekly.yml` 設定

**完了基準**: `node recommend.ts` を実行するだけで推薦リストが出力される

---

### Phase 3: Webダッシュボード（Phase 2だけでも使えるが、見やすくする）

**目標**: ブラウザで分析結果を閲覧できる

- [ ] Next.js プロジェクト作成
- [ ] Supabase Auth 設定（自分のアカウントのみ）
- [ ] ダッシュボードページ（`/`）
- [ ] 推薦一覧ページ（`/recommendations`）- フィルター付き
- [ ] レポート詳細ページ（`/reports/[id]`）
- [ ] ランキング閲覧ページ（`/rankings`）
- [ ] 「今すぐ分析」API Route（`/api/analyze`）
- [ ] Vercel デプロイ

**完了基準**: ブラウザで推薦を確認でき、ボタンでオンデマンド分析ができる

---

### Phase 3.5: 🤖 GenAI チャンネル追加（Phase 3 と並行可）

**目標**: 生成AI動向の自動収集と週次レポートを動かす

- [ ] DBマイグレーション（`amk_genai_items`, `amk_genai_analyses`）
- [ ] Anthropic Blog / Changelog 収集スクリプト
- [ ] OpenAI Blog 収集スクリプト
- [ ] GitHub Trending（AIフィルター）収集スクリプト
- [ ] HackerNews AI記事 収集スクリプト
- [ ] collect-daily.yml に GenAI 収集ジョブ追加
- [ ] GenAI 週次レポート分析スクリプト（`analyzers/genai/weekly-report.ts`）
- [ ] analyze-weekly.yml に GenAI 分析ジョブ追加
- [ ] Dashboard: 🤖 GenAI タブ追加（`/genai/items`, `/genai/reports/[id]`）

**完了基準**: 朝開くと Apps と GenAI の両タブが最新情報で埋まっている

---

### Phase 4: データソース拡充（精度向上）

**目標**: より多角的なシグナルで分析精度を上げる

**Apps チャンネル強化**:
- [ ] Google Trends 統合（`trends.ts`）
- [ ] Reddit Apps系 統合（`reddit.ts`）
- [ ] App Store レビュー収集・ギャップ分析（`gap-analysis.ts`）
- [ ] Product Hunt 統合（`producthunt.ts`）

**GenAI チャンネル強化**:
- [ ] Google / DeepMind Blog 追加
- [ ] Reddit AI系サブレディット追加（r/ClaudeAI, r/LocalLLaMA）
- [ ] npm パッケージバージョン追跡（@anthropic-ai/sdk 等）

**通知**:
- [ ] LINE Notify or Slack への週次レポート自動通知

---

## ディレクトリ構成

```
analyse-market/           ← プロジェクトルート（名称: Analyse Market）
├── README.md
├── specs/
│   ├── 01-overview.md
│   ├── 02-apps-datasources.md
│   ├── 03-genai-datasources.md
│   ├── 04-database.md
│   ├── 05-ai-engine.md
│   ├── 06-dashboard.md
│   └── 07-dev-phases.md    ← このファイル
│
├── apps/
│   ├── collector/                      # データ収集 + AI分析スクリプト
│   │   ├── src/
│   │   │   ├── collectors/
│   │   │   │   ├── apps/               # 📱 Apps チャンネル
│   │   │   │   │   ├── appstore.ts
│   │   │   │   │   ├── googleplay.ts
│   │   │   │   │   ├── trends.ts       # Phase 4
│   │   │   │   │   ├── reddit.ts       # Phase 4
│   │   │   │   │   └── producthunt.ts  # Phase 4
│   │   │   │   └── genai/              # 🤖 GenAI チャンネル
│   │   │   │       ├── anthropic.ts
│   │   │   │       ├── openai.ts
│   │   │   │       ├── google.ts       # Phase 4
│   │   │   │       ├── github.ts
│   │   │   │       ├── hackernews.ts
│   │   │   │       ├── reddit.ts       # Phase 4
│   │   │   │       └── packages.ts     # Phase 4
│   │   │   ├── analyzers/
│   │   │   │   ├── apps/
│   │   │   │   │   ├── weekly-report.ts
│   │   │   │   │   ├── gap-analysis.ts # Phase 4
│   │   │   │   │   └── recommend.ts
│   │   │   │   └── genai/
│   │   │   │       ├── weekly-report.ts
│   │   │   │       └── deep-dive.ts
│   │   │   ├── lib/
│   │   │   │   ├── supabase.ts
│   │   │   │   └── gemini.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                            # Next.js ダッシュボード（Phase 3）
│       ├── app/
│       │   ├── page.tsx                # ダッシュボード（タブ切り替え）
│       │   ├── apps/
│       │   │   ├── recommendations/page.tsx
│       │   │   ├── rankings/page.tsx
│       │   │   └── reports/[id]/page.tsx
│       │   ├── genai/
│       │   │   ├── items/page.tsx
│       │   │   └── reports/[id]/page.tsx
│       │   └── api/
│       │       ├── apps/
│       │       │   ├── analyze/route.ts
│       │       │   └── recommendations/route.ts
│       │       ├── genai/
│       │       │   ├── analyze/route.ts
│       │       │   └── items/route.ts
│       │       └── rankings/route.ts
│       ├── components/
│       │   ├── apps/       # Apps タブコンポーネント
│       │   ├── genai/      # GenAI タブコンポーネント
│       │   └── common/     # 共通コンポーネント
│       ├── lib/
│       └── package.json
│
├── supabase/
│   └── migrations/
│       ├── 001_amk_app_rankings.sql
│       ├── 002_amk_trend_signals.sql
│       ├── 003_amk_app_analyses.sql
│       ├── 004_amk_app_recommendations.sql
│       ├── 005_amk_genai_items.sql
│       ├── 006_amk_genai_analyses.sql
│       └── 007_amk_collection_logs.sql
│
└── .github/
    └── workflows/
        ├── collect-daily.yml   # Apps + GenAI 両方を毎日収集
        └── analyze-weekly.yml  # Apps + GenAI 両方を週次分析
```

---

## 環境変数

### collector（GitHub Actions Secrets に登録）

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=             # Gemini 2.0 Flash で分析
REDDIT_CLIENT_ID=           # Phase 4
REDDIT_CLIENT_SECRET=       # Phase 4
PRODUCT_HUNT_API_TOKEN=     # Phase 4
```

### web（Vercel 環境変数 + ローカル `.env.local`）

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=             # オンデマンド分析（ダッシュボードから呼び出し）
```

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| App Store / Google Play スクレイピングブロック | Apple は公式 RSS Feed を使用（ブロックなし）。Google Play は `google-play-scraper` のメンテを定期確認 |
| Gemini API コスト | 無料枠（1,500 RPD）内で全分析が収まる想定。超過しても従量は安価 |
| GitHub Actions の無料枠超過 | 月2,000分まで無料。毎日1分 × 30日 = 30分。余裕あり |
| 収集データが古い・不正確 | amk_collection_logs でジョブ失敗を記録。失敗が続く場合は通知 |
| 「売れる」≠「自分が作れる」ミスマッチ | 推薦に `est_solo_weeks`・`required_skills`・`rn_feasibility` を必ず付与 |

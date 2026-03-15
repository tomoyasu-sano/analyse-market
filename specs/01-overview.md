# 01. システム概要・アーキテクチャ

## システム構成図

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Analyse Market                                  │
│                                                                      │
│  ① Collectors              ② Storage           ③ AI Engine         │
│  ┌─────────────────┐        ┌──────────┐        ┌──────────────┐   │
│  │ 📱 Apps         │        │          │        │ Claude API   │   │
│  │  App Store RSS  │───────▶│ Supabase │───────▶│              │   │
│  │  Google Play    │        │          │        │ Apps分析     │   │
│  │  Google Trends  │        │          │        │ GenAI分析    │   │
│  │  Reddit (apps)  │        │          │        │              │   │
│  ├─────────────────┤        │          │◀──────│ (拡張可能)   │   │
│  │ 🤖 GenAI        │        │          │        └──────────────┘   │
│  │  Anthropic Blog │───────▶│          │                           │
│  │  OpenAI Blog    │        │          │                           │
│  │  Google Blog    │        │          │                           │
│  │  GitHub Trending│        │          │                           │
│  │  HackerNews     │        │          │                           │
│  │  Reddit (AI)    │        └──────────┘                           │
│  └─────────────────┘               │                               │
│  （将来追加可能）                    │                               │
│                                    ▼                               │
│  ④ Dashboard (Next.js)                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  [ 📱 Apps ] [ 🤖 GenAI ] [ 将来追加... ]                    │  │
│  │                                                              │  │
│  │  タブごとに最新分析・推薦・トレンドを表示                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
         ↑ 毎日自動収集 (GitHub Actions)
         ↑ 週次AI分析 (GitHub Actions)
         ↑ 「今すぐ分析」ボタンでオンデマンド実行
```

---

## チャンネル設計

システムは「チャンネル」単位で拡張できる構造にする。
現在は2チャンネル。将来的に追加しても既存の仕組みを壊さない。

| チャンネル | 目的 | 収集先 | 分析の問い |
|-----------|------|--------|-----------|
| 📱 Apps | 今作るべきアプリを発見 | App Store, Google Play, Reddit | 「何を作るか」 |
| 🤖 GenAI | AI技術動向のキャッチアップ | Anthropic, OpenAI, GitHub, HN | 「何を使うか・何が変わったか」 |

### チャンネル追加のルール

新チャンネルを追加するときは以下を作成するだけで動く：
1. `apps/collector/src/collectors/{channel}/` に収集スクリプト追加
2. `supabase/migrations/` にテーブル追加
3. `apps/collector/src/analyzers/{channel}.ts` に分析プロンプト追加
4. `apps/web/app/{channel}/` にダッシュボードページ追加
5. GitHub Actions のワークフローに収集ジョブ追加

---

## 自動化フロー

```
毎日 02:00 JST
  └─ collect-daily.yml
       ├─ 📱 Apps: App Store / Google Play ランキング収集
       └─ 🤖 GenAI: 各社ブログ・GitHub Trending・HackerNews 収集

毎週月曜 08:00 JST
  └─ analyze-weekly.yml
       ├─ 📱 Apps: 週次市場レポート + アプリ推薦生成
       └─ 🤖 GenAI: 週次AI動向レポート生成

ユーザー操作時（随時）
  └─ Dashboard の「今すぐ分析」ボタン
       ├─ 指定チャンネルのデータを Claude API に送信
       └─ 分析結果を即時表示 + Supabase に保存
```

---

## 各コンポーネントの詳細

| コンポーネント | 詳細仕様 |
|-------------|---------|
| 📱 Apps データ収集 | [02-apps-datasources.md](02-apps-datasources.md) |
| 🤖 GenAI データ収集 | [03-genai-datasources.md](03-genai-datasources.md) |
| Supabase DB設計 | [04-database.md](04-database.md) |
| Claude API 分析設計 | [05-ai-engine.md](05-ai-engine.md) |
| Next.js ダッシュボード | [06-dashboard.md](06-dashboard.md) |
| 実装フェーズ | [07-dev-phases.md](07-dev-phases.md) |

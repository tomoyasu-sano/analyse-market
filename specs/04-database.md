# 04. DBスキーマ設計（Supabase）

## テーブル一覧

### 📱 Apps チャンネル

| テーブル | 役割 |
|---------|------|
| `amk_app_rankings` | ランキングデータ（毎日蓄積） |
| `amk_trend_signals` | トレンドシグナル（Google Trends・Reddit等） |
| `amk_app_analyses` | AI生成の市場分析レポート |
| `amk_app_recommendations` | AI推薦アプリ案（実現可能性評価付き） |

### 🤖 GenAI チャンネル

| テーブル | 役割 |
|---------|------|
| `amk_genai_items` | 収集した記事・リリース・リポジトリ（毎日蓄積） |
| `amk_genai_analyses` | AI生成の動向分析レポート |

### 共通

| テーブル | 役割 |
|---------|------|
| `amk_collection_logs` | 収集ジョブのログ（成功/失敗記録） |

---

## `amk_app_rankings`

毎日収集するランキングデータ。時系列で蓄積し、変動分析に使う。

| カラム | 型 | 説明 |
|-------|----|------|
| id | uuid PK | |
| platform | text | `'ios'` or `'android'` |
| chart_type | text | `'free'`, `'paid'`, `'grossing'` |
| category | text | `'all'`, `'games'`, `'utilities'`, etc. |
| country | text | `'us'`（初期値）, `'jp'` など |
| rank | integer | ランキング順位 |
| app_name | text | アプリ名 |
| app_id | text | ストアID（Bundle ID or Package Name） |
| developer | text | 開発者名 |
| rating | numeric | 評価（星、nullable） |
| rating_count | integer | レビュー数（nullable） |
| price | numeric | 価格（0=無料） |
| genre | text | ジャンル |
| description_short | text | 説明文（先頭200文字） |
| icon_url | text | アイコンURL |
| collected_at | timestamptz | 収集日時 |

**インデックス**: `(platform, chart_type, category, collected_at)`, `(app_id, collected_at)`

---

## `amk_trend_signals`

Google Trends・Reddit・Product Huntなどのトレンドシグナル。

| カラム | 型 | 説明 |
|-------|----|------|
| id | uuid PK | |
| source | text | `'google_trends'`, `'reddit'`, `'product_hunt'` |
| keyword | text | キーワード or トピック名 |
| category | text | 関連するアプリカテゴリ（任意） |
| score | numeric | トレンドスコア（0-100） |
| momentum | text | `'rising'`, `'stable'`, `'falling'` |
| raw_data | jsonb | 生データ（ソースごとに構造が異なるため） |
| collected_at | timestamptz | |

---

## `amk_app_analyses`

Gemini API が生成した Apps チャンネルの市場分析レポート。

| カラム | 型 | 説明 |
|-------|----|------|
| id | uuid PK | |
| analysis_type | text | `'weekly_report'`, `'gap_analysis'`, `'on_demand'` |
| category | text | 分析対象カテゴリ（nullなら全体分析） |
| content | text | AI生成の分析テキスト（Markdown） |
| data_range_start | date | 分析対象データの開始日 |
| data_range_end | date | 分析対象データの終了日 |
| tokens_used | integer | Gemini API 使用トークン数（コスト管理用） |
| created_at | timestamptz | |

---

## `amk_app_recommendations`

AI推薦アプリ案。**実現可能性ゾーンが核心カラム。**

| カラム | 型 | 説明 |
|-------|----|------|
| id | uuid PK | |
| analysis_id | uuid FK → amk_app_analyses | |
| rank | integer | 市場ニーズ順位（実現可能性問わず） |
| app_concept | text | アプリのコンセプト名 |
| category | text | カテゴリ |
| target_user | text | ターゲットユーザー |
| differentiation | text | 差別化ポイント（既存アプリとの比較） |
| rationale | text | 推薦理由（市場データ根拠） |
| market_size | text | `'large'`, `'medium'`, `'niche'` |
| competition | text | `'low'`, `'medium'`, `'high'` |
| monetization | text | `'freemium'`, `'paid'`, `'ads'`, `'subscription'` |
| **rn_feasibility** | text | `'now'`🟢 / `'learn'`🟡 / `'hard'`🔴 / `'hardware'`⬛ |
| **feasibility_reason** | text | 実現可能性の判断根拠 |
| **required_skills** | text[] | 必要スキル一覧（例: `['React Native', 'BLE']`） |
| **est_solo_weeks** | integer | 1人での概算開発週数（null=見積不可） |
| difficulty | text | `'easy'`, `'medium'`, `'hard'` |
| created_at | timestamptz | |

**インデックス**: `(analysis_id, rn_feasibility, rank)`（ゾーンフィルター高速化）

---

## `amk_collection_logs`

データ収集ジョブの実行ログ。失敗監視用。

| カラム | 型 | 説明 |
|-------|----|------|
| id | uuid PK | |
| job_name | text | `'collect-daily'`, `'analyze-weekly'` |
| source | text | `'appstore'`, `'googleplay'`, `'trends'`, etc. |
| status | text | `'success'`, `'partial'`, `'failed'` |
| records_saved | integer | 保存レコード数 |
| error_message | text | エラー詳細（nullable） |
| started_at | timestamptz | |
| finished_at | timestamptz | |

---

---

## `amk_genai_items`

GenAI チャンネルで収集した記事・リリース・リポジトリ。毎日蓄積される生データ。

| カラム | 型 | 説明 |
|-------|----|------|
| id | uuid PK | |
| channel | text | `'genai'`（将来の拡張用） |
| source | text | `'anthropic'`, `'openai'`, `'google'`, `'github'`, `'hackernews'`, `'reddit'`, `'npm'` |
| item_type | text | `'blog'`, `'changelog'`, `'repo'`, `'discussion'`, `'package_release'` |
| title | text | タイトル |
| url | text | 元URL |
| summary | text | 説明・本文の先頭（300文字） |
| relevance_score | integer | 重要度スコア（0-100）収集時に自動付与 |
| tags | text[] | 関連タグ（例: `['claude', 'api', 'tool-use']`） |
| raw_data | jsonb | 生データ（stars数・コメント数等ソース固有の情報） |
| published_at | timestamptz | 元記事の公開日時 |
| collected_at | timestamptz | 収集日時 |

**インデックス**: `(source, collected_at)`, `(relevance_score DESC, collected_at)`

---

## `amk_genai_analyses`

Gemini API が生成した GenAI チャンネルの動向分析レポート。

| カラム | 型 | 説明 |
|-------|----|------|
| id | uuid PK | |
| analysis_type | text | `'weekly_report'`, `'on_demand'` |
| content | text | AI生成の分析テキスト（Markdown） |
| highlights | jsonb | ハイライト一覧（title / url / summary / source の配列） |
| data_range_start | date | 分析対象データの開始日 |
| data_range_end | date | 分析対象データの終了日 |
| tokens_used | integer | Claude API 使用トークン数 |
| created_at | timestamptz | |

---

## RLS ポリシー

このシステムは**自分専用ツール**のため、シンプルな設定にする。

```sql
-- 全テーブル: anon は読み取り不可（自分だけが使う）
-- authenticated（自分のアカウント）は全操作可
-- 収集スクリプトは SUPABASE_SERVICE_ROLE_KEY で RLS バイパス
```

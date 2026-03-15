# 02. データ収集層

## 収集ソース一覧

| ソース | 取得内容 | 方法 | 頻度 | コスト |
|--------|---------|------|------|--------|
| App Store RSS | 無料/有料/売上ランキング Top100 | Apple 公式 RSS Feed (JSON) | 毎日 | 無料 |
| Google Play | ランキング Top100 | `google-play-scraper` (npm) | 毎日 | 無料 |
| Google Trends | カテゴリ別トレンドスコア | `google-trends-api` (npm) | 週次 | 無料 |
| Reddit | 人気投稿・コメント | Reddit API (OAuth2 無料枠) | 毎日 | 無料 |
| Product Hunt | 週間人気アプリ | Product Hunt API (無料) | 週次 | 無料 |
| App Store Reviews | 競合アプリのレビュー感情分析 | Apple RSS Reviews Feed | 週次 | 無料 |

## 各ソースの詳細

### App Store RSS

```
エンドポイント:
  https://rss.marketingtools.apple.com/api/v2/us/apps/top-free/100/apps.json
  https://rss.applemarketingtools.com/api/v2/us/apps/top-paid/200/apps.json
  https://rss.applemarketingtools.com/api/v2/us/apps/top-grossing/200/apps.json

取得フィールド:
  - id, name, artistName (developer)
  - artworkUrl (icon)
  - genres, url
  ※ レビュー数・評価は RSS に含まれないため別途 App Store API で補完
```

### Google Play

```
ライブラリ: google-play-scraper (npm)

取得:
  gplay.list({ category: 'APPLICATION', collection: 'TOP_FREE', num: 200 })
  gplay.list({ category: 'GAME', collection: 'TOP_FREE', num: 200 })

取得フィールド:
  - appId, title, developer
  - score (評価), ratings (レビュー数)
  - installs (インストール数帯), price
  - genre, description (短縮)
  - icon
```

### Google Trends

```
ライブラリ: google-trends-api (npm)

取得:
  - カテゴリキーワード別トレンドスコア（0-100）
  - 直近7日・30日・90日の時系列
  - 関連クエリ（急上昇キーワード）

監視カテゴリ（初期設定）:
  - 'fitness app', 'meditation app', 'budget app'
  - 'productivity app', 'language learning app'
  - 'AI photo', 'AI writing', 'AI assistant'
  - 'sleep tracker', 'habit tracker'
```

### Reddit

```
監視サブレディット:
  - r/androidapps (レビュー・要望)
  - r/iosapps (レビュー・要望)
  - r/apps (全般)
  - r/AppIdeas (需要ある未実現アイデア)

取得: 週間ホット投稿 Top50（タイトル + コメント数 + スコア）
認証: Reddit API App（Client ID / Secret）無料枠
```

### Product Hunt

```
エンドポイント: https://api.producthunt.com/v2/api/graphql

取得: 直近7日の人気アプリ（モバイルカテゴリ）
  - name, tagline, description
  - votesCount, commentsCount
  - topics (タグ)
```

## 収集・採用基準

収集データは全件保存するが、AI分析に渡す際は以下の基準で絞り込む。

| 基準 | 内容 | なぜ重要か |
|------|------|-----------|
| **ランキング変動** | 前週比でランクアップした数 | 「今伸びている」を示す最も直接的な指標 |
| **レビュー数の伸び** | 直近7日の新規レビュー数 | 新規ユーザー獲得の証拠 |
| **評価の低さ** | 平均★2.5以下のカテゴリ上位アプリ | ユーザー不満 = 参入余地 |
| **Google Trends スコア** | 50以上 かつ 先週比+10%以上 | 検索需要が実際に増えている証拠 |
| **Reddit スコア** | points >= 50 | ノイズ除去済みの話題 |

### 分析に渡すデータの例

```
sleep tracker: Google Trends +23%（先週比）
App Store 無料Top20に3本ランクイン
上位3本の平均評価 2.8★（レビュー不満多数）
→ 「需要あり・供給の質が低い」 = 参入余地あり
```

数値根拠なしの推薦は出力しない（Gemini へのプロンプトで明示的に指示）。

## 収集スクリプト構成

```
apps/collector/src/collectors/
├── appstore.ts       # App Store RSS + Reviews
├── googleplay.ts     # Google Play
├── trends.ts         # Google Trends
├── reddit.ts         # Reddit API
└── producthunt.ts    # Product Hunt API
```

## GitHub Actions スケジュール

```yaml
# .github/workflows/collect-daily.yml
on:
  schedule:
    - cron: '0 17 * * *'  # 毎日 02:00 JST (UTC+9 → UTC 17:00)

# .github/workflows/analyze-weekly.yml
on:
  schedule:
    - cron: '0 23 * * 0'  # 毎週月曜 08:00 JST (UTC 日曜 23:00)
```

## エラー対策

- スクレイピング失敗時: リトライ3回 → 失敗ログをSupabaseに記録
- 部分失敗（一部ソースのみ失敗）: 成功分だけ保存して続行
- レート制限: 各リクエスト間に 1-2秒 の遅延を挿入

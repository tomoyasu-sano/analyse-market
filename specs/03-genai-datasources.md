# 03. 🤖 GenAI チャンネル — データ収集層

## 収集の目的

Claude / Claude Code を中心に生成AIを活用して開発しているため、以下を毎日自動でキャッチアップする：

- 各社（Anthropic / OpenAI / Google）の新モデル・API変更・機能追加
- 開発ワークフローに使える新ツール・ライブラリ
- コミュニティで話題になっているプロンプト技術・活用パターン
- GitHub で急上昇している AI 関連リポジトリ

---

## 収集ソース一覧

| ソース | 取得内容 | 方法 | 頻度 | コスト |
|--------|---------|------|------|--------|
| Anthropic Blog | モデルリリース・機能追加・ガイド | RSS Feed | 毎日 | 無料 |
| Anthropic Changelog | API変更・新機能（claude.ai/changelog） | RSS / スクレイプ | 毎日 | 無料 |
| OpenAI Blog | モデル・API・製品アップデート | RSS Feed | 毎日 | 無料 |
| OpenAI Changelog | APIリリースノート | RSS Feed | 毎日 | 無料 |
| Google DeepMind Blog | Gemini・モデル研究 | RSS Feed | 毎日 | 無料 |
| GitHub Trending | AI関連リポジトリの急上昇 | GitHub API / スクレイプ | 毎日 | 無料 |
| Hacker News | AI関連トップ記事・議論 | HN Algolia API | 毎日 | 無料 |
| Reddit (AI系) | コミュニティの話題・活用事例 | Reddit API | 毎日 | 無料 |
| npm / PyPI 新着 | AI SDK・ツールの新バージョン | npm Registry API | 週次 | 無料 |

---

## 各ソースの詳細

### Anthropic 関連

```
RSS:
  https://www.anthropic.com/rss.xml          # ブログ記事
  https://docs.anthropic.com/changelog.rss   # API Changelog（要確認）

取得フィールド:
  - title, link, pubDate, description（先頭300文字）
  - タグ/カテゴリ（モデル名、機能名）

優先キーワード（スコアリング用）:
  'claude', 'claude code', 'api', 'model', 'sonnet', 'opus', 'haiku',
  'tool use', 'computer use', 'prompt caching', 'context window'
```

### OpenAI 関連

```
RSS:
  https://openai.com/blog/rss.xml
  https://platform.openai.com/docs/changelog（RSS未確認、スクレイプで対応）

優先キーワード:
  'gpt', 'o1', 'o3', 'api', 'function calling', 'assistants', 'realtime'
```

### Google DeepMind / Gemini

```
RSS:
  https://blog.google/technology/ai/rss/     # Google AI Blog
  https://deepmind.google/discover/blog/rss/

優先キーワード:
  'gemini', 'gemma', 'vertex', 'ai studio', 'multimodal'
```

### GitHub Trending

```
エンドポイント:
  https://github.com/trending?l=python&since=daily  # スクレイプ
  https://github.com/trending?l=typescript&since=daily

取得フィールド:
  - repo名, description, stars, stars_today
  - 言語, URL

フィルター（AI関連に絞る）:
  descriptionに以下を含むもの:
  'llm', 'ai', 'gpt', 'claude', 'gemini', 'agent', 'rag',
  'embedding', 'fine-tun', 'prompt'
```

### Hacker News

```
API: https://hn.algolia.com/api/v1/search

クエリ:
  - tags=story&query=claude&numericFilters=created_at_i>yesterday
  - tags=story&query=openai&numericFilters=...
  - tags=story&query=llm&numericFilters=...

取得フィールド:
  - title, url, points (スコア), num_comments
  - created_at

フィルター: points >= 50 のみ取得（ノイズ除去）
```

### Reddit (AI系)

```
監視サブレディット:
  - r/ClaudeAI       # Claude ユーザーの活用事例・問題
  - r/ChatGPT        # OpenAI ユーザーの話題
  - r/LocalLLaMA     # ローカルLLM・オープンソース動向
  - r/MachineLearning # 研究・技術動向
  - r/PromptEngineering # プロンプト手法

取得: 週間ホット投稿 Top30（タイトル + スコア + コメント数）
```

### npm / PyPI 新着パッケージ（週次）

```
npm Registry API:
  https://registry.npmjs.org/-/v1/search?text=claude+ai&size=20
  https://registry.npmjs.org/-/v1/search?text=openai&size=20
  https://registry.npmjs.org/-/v1/search?text=langchain&size=20

監視パッケージ（バージョンアップ追跡）:
  - @anthropic-ai/sdk
  - openai
  - @google/generative-ai
  - langchain / @langchain/core
  - vercel/ai
```

---

## 収集スクリプト構成

```
apps/collector/src/collectors/genai/
├── anthropic.ts     # Anthropic Blog + Changelog
├── openai.ts        # OpenAI Blog + Changelog
├── google.ts        # Google AI / DeepMind Blog
├── github.ts        # GitHub Trending（AIフィルター付き）
├── hackernews.ts    # HackerNews AI記事
├── reddit.ts        # AI系サブレディット
└── packages.ts      # npm / PyPI バージョン追跡（週次）
```

---

## スコアリング（収集時に付与）

収集した各記事・リポジトリに自動でスコアを付与し、重要度を判定する。

```typescript
type GenAIItem = {
  relevance_score: number  // 0-100
  // スコアリングロジック:
  // +40: Anthropic / Claude 関連
  // +30: OpenAI 関連
  // +20: Google / Gemini 関連
  // +10: GitHub stars_today > 100
  // +10: HN points > 200
  // +5:  API/SDK/Changelog に関連するキーワード
}
```

---

## GitHub Actions スケジュール

```yaml
# .github/workflows/collect-daily.yml に追記
- name: Collect GenAI Data
  run: |
    node apps/collector/src/collectors/genai/anthropic.js
    node apps/collector/src/collectors/genai/openai.js
    node apps/collector/src/collectors/genai/github.js
    node apps/collector/src/collectors/genai/hackernews.js
  # 毎日 02:00 JST（Apps と同じワークフロー内で実行）
```

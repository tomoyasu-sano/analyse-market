/**
 * GenAI 週次レポート生成
 * 直近7日の amk_genai_items を Gemini API に渡して動向レポートを生成
 * 実行: npx ts-node src/analyzers/genai/weekly-report.ts
 */

import { supabase } from '../../lib/supabase'
import { generateText } from '../../lib/gemini'

const DATA_DAYS = 7

interface GenAIItem {
  id: string
  source: string
  item_type: string
  title: string
  url: string
  summary: string | null
  relevance_score: number
  published_at: string | null
}

async function fetchRecentItems(): Promise<GenAIItem[]> {
  const since = new Date(Date.now() - DATA_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('amk_genai_items')
    .select('id, source, item_type, title, url, summary, relevance_score, published_at')
    .gte('collected_at', since)
    .order('relevance_score', { ascending: false })
    .limit(50)

  if (error) throw new Error(`Failed to fetch genai items: ${error.message}`)
  return (data ?? []) as GenAIItem[]
}

function buildPrompt(items: GenAIItem[]): string {
  const bySource = (src: string) => items.filter(i => i.source === src)

  // スコア上位のみ表示（ノイズ削減）
  const fmt = (i: GenAIItem) =>
    `  - ${i.title}\n    ${i.url}\n    ${i.summary ? i.summary.slice(0, 120) : '(概要なし)'}`

  const anthropicItems = bySource('anthropic').slice(0, 5)
  const openaiItems = bySource('openai').slice(0, 5)
  const githubItems = bySource('github').slice(0, 8)
  const hnItems = bySource('hackernews').slice(0, 5)
  const redditItems = bySource('reddit').slice(0, 5)
  const npmItems = bySource('npm')
  const googleItems = bySource('google').slice(0, 3)
  const phItems = bySource('producthunt').slice(0, 5)

  const npmSection = npmItems.length > 0
    ? npmItems.map(i => `  - ${i.title}: ${i.summary ?? ''}`).join('\n')
    : '  (更新なし)'

  return `あなたは個人開発者専属のAI技術アドバイザーです。
以下の情報から「私が今週知るべきこと」だけを厳選して伝えてください。

## 私のプロフィール
- Claude / Claude Code で個人開発（React Native / Next.js / Supabase）
- スマホアプリで収益化したい
- AIツールは「実際に自分のコードで使えるか」が判断基準

## ルール（必ず守ること）
- 情報の羅列ではなく「これを知らないと損する情報」だけを選ぶ
- 各セクション最大3件。それ以上は書かない
- アクションアイテムは「明日できる具体的な作業」のみ。抽象論・感想は書かない
- URLは必ず含める

## 今週の収集データ

[Anthropic/Claude 関連]
${anthropicItems.map(fmt).join('\n') || '  (データなし)'}

[OpenAI 関連]
${openaiItems.map(fmt).join('\n') || '  (データなし)'}

[Google AI 関連]
${googleItems.map(fmt).join('\n') || '  (データなし)'}

[GitHub 急上昇リポジトリ]
${githubItems.map(fmt).join('\n') || '  (データなし)'}

[Hacker News]
${hnItems.map(fmt).join('\n') || '  (データなし)'}

[Reddit (r/ClaudeAI, r/LocalLLaMA, r/MachineLearning)]
${redditItems.map(fmt).join('\n') || '  (データなし)'}

[Product Hunt 注目AIプロダクト]
${phItems.map(fmt).join('\n') || '  (データなし)'}

[npmパッケージ更新 — 使用中ライブラリのバージョンアップ]
${npmSection}

## 出力形式（この構成で必ず出力）

## 今週のハイライト
今週最も重要な情報を1〜3件だけ。各項目にURL必須。
形式: **タイトル** ([ソース名](URL))
  → なぜ重要か: 1行
  → 自分の開発への影響: 1行

## npmアップデートアラート
バージョンアップしたパッケージの中で「自分のコードに影響がありそうなもの」のみ。
影響なければ「今週は対応不要」と書く。

## 新しいAIツール（Product Hunt / GitHub から）
今すぐ試せそうなツール・ライブラリを最大3件。URL付き。
なければ「今週は特になし」と書く。

## コミュニティの声（Reddit / HN から）
開発者の間で話題になっているトピックを1〜2件。何が議論されているかを1行で。

## 自分の開発に今すぐ活かせること
明日できる具体的な作業を3件。「○○のドキュメントを読む」ではなく「○○を使って△△を実装する」形で。
`
}

function extractHighlights(text: string): Array<{ title: string; url: string; summary: string; source: string }> {
  const highlights: Array<{ title: string; url: string; summary: string; source: string }> = []
  const section = text.match(/## 今週のハイライト[\s\S]*?(?=\n## [^今]|$)/)?.[0] ?? ''

  const urlMatches = section.matchAll(/https?:\/\/[^\s\n)]+/g)
  const lines = section.split('\n').filter(l => l.trim())

  for (const urlMatch of urlMatches) {
    const url = urlMatch[0]
    const lineIdx = lines.findIndex(l => l.includes(url))
    if (lineIdx >= 0) {
      const title = lines[lineIdx - 1]?.replace(/^[-*#\s]+/, '').trim() || url
      const summary = lines.slice(lineIdx + 1, lineIdx + 3).join(' ').replace(/^[-*#\s]+/, '').trim()
      const source = url.includes('anthropic') ? 'anthropic'
        : url.includes('openai') ? 'openai'
        : url.includes('github') ? 'github'
        : 'hackernews'
      highlights.push({ title, url, summary: summary.slice(0, 200), source })
    }
    if (highlights.length >= 3) break
  }

  return highlights
}

async function main() {
  console.log('[GenAI Weekly] Fetching recent items...')
  const items = await fetchRecentItems()
  console.log(`[GenAI Weekly] ${items.length} items fetched`)

  if (items.length === 0) {
    console.log('[GenAI Weekly] No data. Run collectors first.')
    console.log('  npm run collect:genai')
    process.exit(0)
  }

  const prompt = buildPrompt(items)
  console.log('[GenAI Weekly] Calling Gemini API...')
  const { text, tokensUsed } = await generateText(prompt)
  console.log(`[GenAI Weekly] Tokens used: ${tokensUsed}`)

  const highlights = extractHighlights(text)

  const { data: analysis, error } = await supabase
    .from('amk_genai_analyses')
    .insert({
      analysis_type: 'weekly_report',
      content: text,
      highlights: highlights.length > 0 ? highlights : null,
      data_range_start: new Date(Date.now() - DATA_DAYS * 86400000).toISOString().split('T')[0],
      data_range_end: new Date().toISOString().split('T')[0],
      tokens_used: tokensUsed,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save analysis: ${error.message}`)

  console.log('\n' + '='.repeat(60))
  console.log('🤖 GenAI 週次レポート')
  console.log('='.repeat(60))
  console.log(text)
  console.log('='.repeat(60))
  console.log(`[GenAI Weekly] Saved analysis_id=${analysis.id}`)
}

main().catch(console.error)

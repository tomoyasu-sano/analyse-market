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

  const fmt = (i: GenAIItem) =>
    `  - [${i.source.toUpperCase()}] ${i.title}\n    URL: ${i.url}\n    ${i.summary ? i.summary.slice(0, 150) : '(概要なし)'}`

  const anthropicItems = bySource('anthropic')
  const openaiItems = bySource('openai')
  const githubItems = bySource('github')
  const hnItems = bySource('hackernews')

  return `あなたは生成AI開発の動向アナリストです。
以下の直近1週間の情報を整理してください。

読み手のプロフィール:
- Claude / Claude Code を中心に生成AIを活用して個人開発をしている
- React Native / Next.js / Supabase でアプリ開発
- 新しいAI機能・APIを自分の開発にすぐ取り込みたい

[Anthropic / Claude 関連（${anthropicItems.length}件）]
${anthropicItems.map(fmt).join('\n') || '  (今週のデータなし)'}

[OpenAI 関連（${openaiItems.length}件）]
${openaiItems.map(fmt).join('\n') || '  (今週のデータなし)'}

[GitHub 急上昇リポジトリ（AI系）（${githubItems.length}件）]
${githubItems.map(fmt).join('\n') || '  (今週のデータなし)'}

[Hacker News AI系トップ記事（${hnItems.length}件）]
${hnItems.map(fmt).join('\n') || '  (今週のデータなし)'}

以下の構成でレポートを作成してください：

## 今週のハイライト（最重要3件）
各項目: タイトル・URL・なぜ重要か（2行）・自分の開発への影響（1行）

## Anthropic / Claude 動向
## OpenAI 動向
## GitHub 急上昇（AI系）
## HackerNews 注目記事

## 自分の開発に今すぐ活かせること
- 具体的なアクションアイテム（3〜5件）
- 「○○を使って△△する」という形で。抽象的な感想は不要。
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

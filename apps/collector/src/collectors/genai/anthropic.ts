/**
 * Anthropic Blog / Changelog 収集
 * RSS Feed から記事を取得して amk_genai_items に保存する
 */

import { supabase } from '../../lib/supabase'

const SOURCES = [
  {
    url: 'https://www.anthropic.com/rss.xml',
    source: 'anthropic' as const,
    item_type: 'blog' as const,
  },
]

const PRIORITY_KEYWORDS = [
  'claude', 'claude code', 'api', 'model', 'sonnet', 'opus', 'haiku',
  'tool use', 'computer use', 'prompt caching', 'context window', 'mcp',
]

function calcScore(title: string, summary: string): number {
  const text = (title + ' ' + summary).toLowerCase()
  let score = 40 // Anthropic は基本 +40
  for (const kw of PRIORITY_KEYWORDS) {
    if (text.includes(kw)) score += 5
  }
  return Math.min(score, 100)
}

function parseRSS(xml: string): Array<{ title: string; url: string; summary: string; published_at: string }> {
  const items: Array<{ title: string; url: string; summary: string; published_at: string }> = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1]?.trim() ?? ''
    const link = (block.match(/<link>(.*?)<\/link>/) || block.match(/<guid>(.*?)<\/guid>/))?.[1]?.trim() ?? ''
    const desc = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/))?.[1]?.trim() ?? ''
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? ''
    if (title && link) {
      const summary = desc.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, '').trim().slice(0, 300)
      items.push({ title, url: link, summary, published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString() })
    }
  }
  return items
}

async function logResult(source: string, status: 'success' | 'failed', records: number, errorMsg?: string) {
  await supabase.from('amk_collection_logs').insert({
    job_name: 'collect-daily',
    source,
    status,
    records_saved: records,
    error_message: errorMsg ?? null,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  })
}

async function main() {
  let totalSaved = 0

  for (const feed of SOURCES) {
    console.log(`[Anthropic] Fetching ${feed.url}...`)
    try {
      const res = await fetch(feed.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const xml = await res.text()
      const items = parseRSS(xml).slice(0, 20)

      // 直近7日以内のみ
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recent = items.filter(i => new Date(i.published_at) >= since)

      if (recent.length === 0) {
        console.log('[Anthropic] No new items in last 7 days')
        await logResult('genai_anthropic', 'success', 0)
        continue
      }

      // 重複チェック（URLで）
      const urls = recent.map(i => i.url)
      const { data: existing } = await supabase
        .from('amk_genai_items')
        .select('url')
        .in('url', urls)
      const existingUrls = new Set((existing ?? []).map((e: any) => e.url))

      const rows = recent
        .filter(i => !existingUrls.has(i.url))
        .map(i => ({
          source: feed.source,
          item_type: feed.item_type,
          title: i.title,
          url: i.url,
          summary: i.summary,
          relevance_score: calcScore(i.title, i.summary),
          tags: PRIORITY_KEYWORDS.filter(kw => (i.title + i.summary).toLowerCase().includes(kw)),
          published_at: i.published_at,
          collected_at: new Date().toISOString(),
        }))

      if (rows.length > 0) {
        const { error } = await supabase.from('amk_genai_items').insert(rows)
        if (error) throw new Error(error.message)
        totalSaved += rows.length
      }

      console.log(`[Anthropic] Saved ${rows.length} new items`)
      await logResult('genai_anthropic', 'success', rows.length)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Anthropic] Error:`, msg)
      await logResult('genai_anthropic', 'failed', 0, msg)
    }
  }

  console.log(`[Anthropic] Done. Total saved: ${totalSaved}`)
}

main().catch(console.error)

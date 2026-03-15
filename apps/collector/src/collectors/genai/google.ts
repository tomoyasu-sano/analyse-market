/**
 * Google AI Blog 収集
 * Google AI Blog RSS から記事を取得して amk_genai_items に保存
 */

import { supabase } from '../../lib/supabase'

const SOURCES = [
  {
    url: 'https://blog.google/technology/ai/rss/',
    label: 'Google AI Blog',
    fallback: false,
  },
  {
    url: 'https://deepmind.google/blog/rss.xml',
    label: 'DeepMind Blog',
    fallback: true,
  },
]

const PRIORITY_KEYWORDS = [
  'gemini', 'deepmind', 'vertex', 'palm', 'imagen', 'veo', 'ai model',
  'llm', 'multimodal', 'agent', 'agentic', 'google ai', 'notebooklm',
]

function calcScore(title: string, summary: string): number {
  const text = (title + ' ' + summary).toLowerCase()
  let score = 50
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
      const summary = desc
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, '') // HTMLエンティティ展開後に残ったタグも除去
        .trim()
        .slice(0, 300)
      items.push({
        title,
        url: link,
        summary,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      })
    }
  }
  return items
}

async function logResult(status: 'success' | 'failed', records: number, errorMsg?: string) {
  await supabase.from('amk_collection_logs').insert({
    job_name: 'collect-daily',
    source: 'genai_google',
    status,
    records_saved: records,
    error_message: errorMsg ?? null,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  })
}

async function main() {
  let totalSaved = 0
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  for (const feed of SOURCES) {
    console.log(`[Google] Fetching ${feed.label}...`)
    try {
      const res = await fetch(feed.url)
      if (!res.ok) {
        if (feed.fallback) {
          console.log(`[Google] ${feed.label} unavailable (${res.status}), skipping`)
          continue
        }
        throw new Error(`HTTP ${res.status}`)
      }

      const xml = await res.text()
      const items = parseRSS(xml).slice(0, 20)
      const recent = items.filter(i => new Date(i.published_at) >= since)

      if (recent.length === 0) {
        console.log(`[Google] ${feed.label}: No new items in last 7 days`)
        continue
      }

      const urls = recent.map(i => i.url)
      const { data: existing } = await supabase
        .from('amk_genai_items')
        .select('url')
        .in('url', urls)
      const existingUrls = new Set((existing ?? []).map((e: any) => e.url))

      const rows = recent
        .filter(i => !existingUrls.has(i.url))
        .map(i => ({
          source: 'google' as const,
          item_type: 'blog_post' as const,
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

      console.log(`[Google] ${feed.label}: Saved ${rows.length} new items`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (feed.fallback) {
        console.warn(`[Google] ${feed.label} error (fallback, ignored):`, msg)
        continue
      }
      console.error(`[Google] Error:`, msg)
      await logResult('failed', totalSaved, msg)
      return
    }
  }

  console.log(`[Google] Done. Total saved: ${totalSaved}`)
  await logResult('success', totalSaved)
}

main().catch(console.error)

/**
 * OpenAI Blog 収集
 */

import { supabase } from '../../lib/supabase'

const PRIORITY_KEYWORDS = [
  'gpt', 'o1', 'o3', 'o4', 'api', 'function calling', 'assistants',
  'realtime', 'model', 'chatgpt', 'operator', 'agent',
]

function calcScore(title: string, summary: string): number {
  const text = (title + ' ' + summary).toLowerCase()
  let score = 30 // OpenAI は基本 +30
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
    const link = (block.match(/<link>(.*?)<\/link>/))?.[1]?.trim() ?? ''
    const desc = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/))?.[1]?.trim() ?? ''
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? ''
    if (title && link) {
      items.push({
        title,
        url: link,
        summary: desc.replace(/<[^>]+>/g, '').slice(0, 300),
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      })
    }
  }
  return items
}

async function logResult(source: string, status: 'success' | 'failed', records: number, errorMsg?: string) {
  await supabase.from('amk_collection_logs').insert({
    job_name: 'collect-daily', source, status,
    records_saved: records, error_message: errorMsg ?? null,
    started_at: new Date().toISOString(), finished_at: new Date().toISOString(),
  })
}

async function main() {
  const feedUrl = 'https://openai.com/blog/rss.xml'
  console.log(`[OpenAI] Fetching ${feedUrl}...`)

  try {
    const res = await fetch(feedUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    const items = parseRSS(xml).slice(0, 20)

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recent = items.filter(i => new Date(i.published_at) >= since)

    if (recent.length === 0) {
      console.log('[OpenAI] No new items in last 7 days')
      await logResult('genai_openai', 'success', 0)
      return
    }

    const urls = recent.map(i => i.url)
    const { data: existing } = await supabase.from('amk_genai_items').select('url').in('url', urls)
    const existingUrls = new Set((existing ?? []).map((e: any) => e.url))

    const rows = recent
      .filter(i => !existingUrls.has(i.url))
      .map(i => ({
        source: 'openai' as const,
        item_type: 'blog' as const,
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
    }

    console.log(`[OpenAI] Saved ${rows.length} new items`)
    await logResult('genai_openai', 'success', rows.length)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[OpenAI] Error:', msg)
    await logResult('genai_openai', 'failed', 0, msg)
  }
}

main().catch(console.error)

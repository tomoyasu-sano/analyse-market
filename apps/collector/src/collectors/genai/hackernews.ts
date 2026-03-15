/**
 * Hacker News — AI関連記事収集
 * HN Algolia API から AI系トップ記事を取得
 */

import { supabase } from '../../lib/supabase'

const AI_QUERIES = ['claude', 'openai', 'llm', 'gemini', 'anthropic', 'mcp server']
const MIN_POINTS = 50

function calcScore(points: number, numComments: number): number {
  let score = 10 // HN ベース
  if (points > 200) score += 10
  if (points > 500) score += 10
  if (numComments > 100) score += 5
  return Math.min(score, 60)
}

async function fetchHN(query: string): Promise<Array<{ title: string; url: string; points: number; num_comments: number; created_at: string; hn_url: string }>> {
  const yesterday = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
  const apiUrl = `https://hn.algolia.com/api/v1/search?tags=story&query=${encodeURIComponent(query)}&numericFilters=created_at_i>${yesterday},points>${MIN_POINTS}&hitsPerPage=10`

  const res = await fetch(apiUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as { hits: any[] }

  return (json.hits ?? []).map((h: any) => ({
    title: h.title ?? '',
    url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
    points: h.points ?? 0,
    num_comments: h.num_comments ?? 0,
    created_at: h.created_at ?? new Date().toISOString(),
    hn_url: `https://news.ycombinator.com/item?id=${h.objectID}`,
  }))
}

async function logResult(status: 'success' | 'failed', records: number, errorMsg?: string) {
  await supabase.from('amk_collection_logs').insert({
    job_name: 'collect-daily', source: 'genai_hackernews', status,
    records_saved: records, error_message: errorMsg ?? null,
    started_at: new Date().toISOString(), finished_at: new Date().toISOString(),
  })
}

async function main() {
  let totalSaved = 0
  const seen = new Set<string>()

  console.log('[HackerNews] Fetching AI articles...')

  try {
    const allItems: Array<{ title: string; url: string; points: number; num_comments: number; created_at: string }> = []

    for (const query of AI_QUERIES) {
      const items = await fetchHN(query)
      for (const item of items) {
        if (!seen.has(item.url)) {
          seen.add(item.url)
          allItems.push(item)
        }
      }
      await new Promise(r => setTimeout(r, 500))
    }

    if (allItems.length === 0) {
      console.log('[HackerNews] No items found')
      await logResult('success', 0)
      return
    }

    const urls = allItems.map(i => i.url)
    const { data: existing } = await supabase.from('amk_genai_items').select('url').in('url', urls)
    const existingUrls = new Set((existing ?? []).map((e: any) => e.url))

    const rows = allItems
      .filter(i => !existingUrls.has(i.url))
      .map(i => ({
        source: 'hackernews' as const,
        item_type: 'discussion' as const,
        title: i.title,
        url: i.url,
        summary: `HN points: ${i.points} | comments: ${i.num_comments}`,
        relevance_score: calcScore(i.points, i.num_comments),
        raw_data: { points: i.points, num_comments: i.num_comments },
        published_at: i.created_at,
        collected_at: new Date().toISOString(),
      }))

    if (rows.length > 0) {
      const { error } = await supabase.from('amk_genai_items').insert(rows)
      if (error) throw new Error(error.message)
      totalSaved = rows.length
    }

    console.log(`[HackerNews] Saved ${totalSaved} items`)
    await logResult('success', totalSaved)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[HackerNews] Error:', msg)
    await logResult('failed', 0, msg)
  }
}

main().catch(console.error)

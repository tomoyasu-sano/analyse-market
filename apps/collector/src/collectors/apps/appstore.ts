/**
 * App Store RSS 収集スクリプト
 * Apple 公式 RSS Feed から無料/有料ランキング Top100 を取得して Supabase に保存する
 * ※ 正規ドメイン: rss.marketingtools.apple.com（200件以上は500エラー）
 */

import { supabase } from '../../lib/supabase'

const COUNTRY = 'us'
const LIMIT = 100  // Apple RSS の上限は100件

const CHARTS = [
  { chart_type: 'free', url: `https://rss.marketingtools.apple.com/api/v2/${COUNTRY}/apps/top-free/${LIMIT}/apps.json` },
  { chart_type: 'paid', url: `https://rss.marketingtools.apple.com/api/v2/${COUNTRY}/apps/top-paid/${LIMIT}/apps.json` },
]

interface AppStoreEntry {
  id: string
  name: string
  artistName: string
  artworkUrl100: string
  genres: { genreId: string; name: string }[]
  url: string
}

async function fetchChart(chartType: string, feedUrl: string): Promise<void> {
  console.log(`[AppStore] Fetching ${chartType}...`)

  const res = await fetch(feedUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${feedUrl}`)

  const json = await res.json() as { feed: { results: AppStoreEntry[] } }
  const results = json.feed?.results ?? []

  const rows = results.map((entry, index) => ({
    platform: 'ios',
    chart_type: chartType,
    category: 'all',
    country: COUNTRY,
    rank: index + 1,
    app_name: entry.name,
    app_id: entry.id,
    developer: entry.artistName,
    rating: null,
    rating_count: null,
    price: chartType === 'free' ? 0 : null,
    genre: entry.genres?.[0]?.name ?? null,
    description_short: null,
    icon_url: entry.artworkUrl100 ?? null,
    collected_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('amk_app_rankings').insert(rows)
  if (error) throw new Error(`Supabase insert error: ${error.message}`)

  console.log(`[AppStore] Saved ${rows.length} records (${chartType})`)
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

  for (const { chart_type, url } of CHARTS) {
    try {
      await fetchChart(chart_type, url)
      totalSaved += LIMIT
      await logResult(`appstore_${chart_type}`, 'success', LIMIT)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[AppStore] Error (${chart_type}):`, msg)
      await logResult(`appstore_${chart_type}`, 'failed', 0, msg)
    }
  }

  console.log(`[AppStore] Done. Total: ${totalSaved} records`)
}

main().catch(console.error)

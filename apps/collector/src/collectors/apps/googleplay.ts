/**
 * Google Play 収集スクリプト
 * google-play-scraper で無料 Top200 を取得して Supabase に保存する
 */

import gplay from 'google-play-scraper'
import { supabase } from '../../lib/supabase'

const COUNTRY = 'us'
const LIMIT = 200

const COLLECTIONS = [
  { chart_type: 'free',     collection: gplay.collection.TOP_FREE },
  { chart_type: 'grossing', collection: gplay.collection.GROSSING },  // TOP_GROSSING → GROSSING
]

const CATEGORIES = [
  { key: 'all',   category: gplay.category.APPLICATION },
  { key: 'games', category: gplay.category.GAME },
]

async function fetchCollection(
  chartType: string,
  collection: gplay.collection,
  categoryKey: string,
  category: gplay.category,
): Promise<void> {
  console.log(`[GooglePlay] Fetching ${chartType} / ${categoryKey}...`)

  const results = await gplay.list({
    collection,
    category,
    country: COUNTRY,
    num: LIMIT,
    fullDetail: false,
  })

  const rows = results.map((app: any, index: number) => ({
    platform: 'android',
    chart_type: chartType,
    category: categoryKey,
    country: COUNTRY,
    rank: index + 1,
    app_name: app.title,
    app_id: app.appId,
    developer: app.developer,
    rating: app.score ?? null,
    rating_count: app.ratings ?? null,
    price: app.price ?? 0,
    genre: app.genre ?? null,
    description_short: app.summary ? app.summary.slice(0, 200) : null,
    icon_url: app.icon ?? null,
    collected_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('amk_app_rankings').insert(rows)
  if (error) throw new Error(`Supabase insert error: ${error.message}`)

  console.log(`[GooglePlay] Saved ${rows.length} records (${chartType}/${categoryKey})`)
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

  for (const { chart_type, collection } of COLLECTIONS) {
    for (const { key: categoryKey, category } of CATEGORIES) {
      const source = `googleplay_${chart_type}_${categoryKey}`
      // レート制限対策：リクエスト間に1秒待機
      await new Promise(r => setTimeout(r, 1000))
      try {
        await fetchCollection(chart_type, collection, categoryKey, category)
        totalSaved += LIMIT
        await logResult(source, 'success', LIMIT)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[GooglePlay] Error (${chart_type}/${categoryKey}):`, msg)
        await logResult(source, 'failed', 0, msg)
      }
    }
  }

  console.log(`[GooglePlay] Done. Total: ${totalSaved} records`)
}

main().catch(console.error)

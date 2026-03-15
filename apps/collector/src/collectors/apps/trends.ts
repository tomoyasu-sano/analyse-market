/**
 * Google Trends 収集
 * アプリ開発関連キーワードの検索トレンドを amk_trend_signals に保存
 */

import { supabase } from '../../lib/supabase'
// @ts-ignore — google-trends-api に型定義がないため
import googleTrends from 'google-trends-api'

const KEYWORDS = [
  'productivity app',
  'fitness app',
  'AI app',
  'mobile app',
  'React Native',
  'health app',
  'finance app',
]

interface TimelinePoint {
  value: number[]
  formattedAxisTime: string
}

function calcMomentum(timelineData: TimelinePoint[]): 'rising' | 'stable' | 'falling' {
  if (timelineData.length < 4) return 'stable'
  const values = timelineData.flatMap(d => d.value)
  const mid = Math.ceil(values.length / 2)
  const first = values.slice(0, mid)
  const second = values.slice(mid)
  const avg1 = first.reduce((a, b) => a + b, 0) / first.length
  const avg2 = second.reduce((a, b) => a + b, 0) / second.length
  if (avg2 > avg1 * 1.1) return 'rising'
  if (avg2 < avg1 * 0.9) return 'falling'
  return 'stable'
}

async function fetchTrend(keyword: string): Promise<{ score: number; momentum: 'rising' | 'stable' | 'falling'; timelineData: TimelinePoint[] }> {
  const result = await googleTrends.interestOverTime({
    keyword,
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    geo: 'US',
  })
  const parsed = JSON.parse(result)
  const timelineData: TimelinePoint[] = parsed?.default?.timelineData ?? []

  if (timelineData.length === 0) {
    return { score: 0, momentum: 'stable', timelineData: [] }
  }

  const values = timelineData.flatMap(d => d.value)
  const score = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  const momentum = calcMomentum(timelineData)

  return { score, momentum, timelineData }
}

async function logResult(status: 'success' | 'failed', records: number, errorMsg?: string) {
  await supabase.from('amk_collection_logs').insert({
    job_name: 'collect-daily',
    source: 'apps_trends',
    status,
    records_saved: records,
    error_message: errorMsg ?? null,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  })
}

async function main() {
  console.log('[GoogleTrends] Fetching keyword trends...')
  let totalSaved = 0

  try {
    const rows: any[] = []

    for (const keyword of KEYWORDS) {
      console.log(`[GoogleTrends] Fetching "${keyword}"...`)
      try {
        const { score, momentum, timelineData } = await fetchTrend(keyword)
        rows.push({
          source: 'google_trends',
          keyword,
          category: 'app_development',
          score,
          momentum,
          raw_data: { timeline: timelineData.slice(-7) }, // 直近7点のみ保存
          collected_at: new Date().toISOString(),
        })
        console.log(`[GoogleTrends] "${keyword}": score=${score}, momentum=${momentum}`)
      } catch (err) {
        console.warn(`[GoogleTrends] "${keyword}" failed:`, err instanceof Error ? err.message : err)
      }
      await new Promise(r => setTimeout(r, 1000))
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('amk_trend_signals').insert(rows)
      if (error) throw new Error(error.message)
      totalSaved = rows.length
    }

    console.log(`[GoogleTrends] Done. Saved ${totalSaved} signals.`)
    await logResult('success', totalSaved)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GoogleTrends] Error:', msg)
    await logResult('failed', 0, msg)
  }
}

main().catch(console.error)

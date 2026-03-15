/**
 * Reddit AI系収集
 * r/ClaudeAI, r/LocalLLaMA, r/MachineLearning のホット投稿を取得
 */

import { supabase } from '../../lib/supabase'

const SUBREDDITS = ['ClaudeAI', 'LocalLLaMA', 'MachineLearning']
const MIN_UPVOTES = 100

interface RedditPost {
  title: string
  url: string
  permalink: string
  score: number
  selftext: string
  created_utc: number
  subreddit: string
}

function calcScore(upvotes: number): number {
  return Math.min(Math.floor(upvotes / 100) * 10 + 20, 70)
}

async function fetchSubreddit(sub: string): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${sub}/hot.json?limit=15`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'analyse-market-bot/1.0 (personal research tool)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as { data: { children: Array<{ data: RedditPost }> } }
  return (json.data?.children ?? []).map(c => c.data)
}

async function logResult(status: 'success' | 'failed', records: number, errorMsg?: string) {
  await supabase.from('amk_collection_logs').insert({
    job_name: 'collect-daily',
    source: 'genai_reddit',
    status,
    records_saved: records,
    error_message: errorMsg ?? null,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  })
}

async function main() {
  console.log('[Reddit] Fetching AI subreddits...')
  let totalSaved = 0

  try {
    const allPosts: RedditPost[] = []
    const seen = new Set<string>()

    for (const sub of SUBREDDITS) {
      console.log(`[Reddit] Fetching r/${sub}...`)
      try {
        const posts = await fetchSubreddit(sub)
        for (const post of posts) {
          const permUrl = `https://reddit.com${post.permalink}`
          if (!seen.has(permUrl) && post.score >= MIN_UPVOTES) {
            seen.add(permUrl)
            allPosts.push({ ...post, subreddit: sub })
          }
        }
      } catch (err) {
        console.warn(`[Reddit] r/${sub} failed:`, err instanceof Error ? err.message : err)
      }
      await new Promise(r => setTimeout(r, 500))
    }

    if (allPosts.length === 0) {
      console.log('[Reddit] No posts above threshold')
      await logResult('success', 0)
      return
    }

    // 重複チェック（permalink URL で）
    const urls = allPosts.map(p => `https://reddit.com${p.permalink}`)
    const { data: existing } = await supabase
      .from('amk_genai_items')
      .select('url')
      .in('url', urls)
    const existingUrls = new Set((existing ?? []).map((e: any) => e.url))

    const rows = allPosts
      .filter(p => !existingUrls.has(`https://reddit.com${p.permalink}`))
      .map(p => ({
        source: 'reddit' as const,
        item_type: 'discussion' as const,
        title: p.title,
        url: `https://reddit.com${p.permalink}`,
        summary: p.selftext
          ? p.selftext.slice(0, 300)
          : `r/${p.subreddit} — upvotes: ${p.score}`,
        relevance_score: calcScore(p.score),
        tags: [p.subreddit.toLowerCase()],
        raw_data: { upvotes: p.score, subreddit: p.subreddit },
        published_at: new Date(p.created_utc * 1000).toISOString(),
        collected_at: new Date().toISOString(),
      }))

    if (rows.length > 0) {
      const { error } = await supabase.from('amk_genai_items').insert(rows)
      if (error) throw new Error(error.message)
      totalSaved = rows.length
    }

    console.log(`[Reddit] Saved ${totalSaved} posts`)
    await logResult('success', totalSaved)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Reddit] Error:', msg)
    await logResult('failed', 0, msg)
  }
}

main().catch(console.error)

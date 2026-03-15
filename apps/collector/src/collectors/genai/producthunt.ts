/**
 * Product Hunt AI製品収集
 * Product Hunt API v2 GraphQL から AI カテゴリのトップ製品を取得
 * PRODUCT_HUNT_API_TOKEN 環境変数が必要（未設定の場合はスキップ）
 */

import { supabase } from '../../lib/supabase'

const PRODUCT_HUNT_API = 'https://api.producthunt.com/v2/api/graphql'
const MIN_VOTES = 50

const QUERY = `
  query TopAIPosts {
    posts(order: VOTES, featured: true, topic: "artificial-intelligence") {
      edges {
        node {
          id
          name
          tagline
          url
          votesCount
          createdAt
          thumbnail { url }
          topics {
            edges {
              node { name slug }
            }
          }
        }
      }
    }
  }
`

function calcScore(votes: number): number {
  return Math.min(Math.floor(votes / 10), 90)
}

async function logResult(status: 'success' | 'failed', records: number, errorMsg?: string) {
  await supabase.from('amk_collection_logs').insert({
    job_name: 'collect-daily',
    source: 'genai_producthunt',
    status,
    records_saved: records,
    error_message: errorMsg ?? null,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  })
}

async function main() {
  const token = process.env.PRODUCT_HUNT_API_TOKEN
  if (!token) {
    console.warn('[ProductHunt] PRODUCT_HUNT_API_TOKEN not set, skipping')
    await logResult('success', 0)
    return
  }

  console.log('[ProductHunt] Fetching top AI products...')
  let totalSaved = 0

  try {
    const res = await fetch(PRODUCT_HUNT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query: QUERY }),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json() as { data?: { posts?: { edges: any[] } }; errors?: any[] }

    if (json.errors?.length) {
      throw new Error(json.errors[0]?.message ?? 'GraphQL error')
    }

    const posts = (json.data?.posts?.edges ?? [])
      .map((e: any) => e.node)
      .filter((p: any) => p.votesCount >= MIN_VOTES)

    if (posts.length === 0) {
      console.log('[ProductHunt] No posts above threshold')
      await logResult('success', 0)
      return
    }

    const urls = posts.map((p: any) => p.url)
    const { data: existing } = await supabase
      .from('amk_genai_items')
      .select('url')
      .in('url', urls)
    const existingUrls = new Set((existing ?? []).map((e: any) => e.url))

    const rows = posts
      .filter((p: any) => !existingUrls.has(p.url))
      .map((p: any) => ({
        source: 'producthunt' as const,
        item_type: 'product' as const,
        title: p.name,
        url: p.url,
        summary: p.tagline?.slice(0, 300) ?? '',
        relevance_score: calcScore(p.votesCount),
        tags: (p.topics?.edges ?? []).map((e: any) => e.node.slug),
        raw_data: { votes: p.votesCount, thumbnail: p.thumbnail?.url },
        published_at: p.createdAt,
        collected_at: new Date().toISOString(),
      }))

    if (rows.length > 0) {
      const { error } = await supabase.from('amk_genai_items').insert(rows)
      if (error) throw new Error(error.message)
      totalSaved = rows.length
    }

    console.log(`[ProductHunt] Saved ${totalSaved} products`)
    await logResult('success', totalSaved)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ProductHunt] Error:', msg)
    await logResult('failed', 0, msg)
  }
}

main().catch(console.error)

/**
 * npm パッケージバージョン追跡
 * AI関連パッケージの最新バージョンを監視し、更新があれば amk_genai_items に保存
 */

import { supabase } from '../../lib/supabase'

const PACKAGES = [
  '@anthropic-ai/sdk',
  '@google/genai',
  '@google/generative-ai',
  'openai',
  'langchain',
  '@langchain/core',
  'ai',
]

async function fetchLatestVersion(pkg: string): Promise<string> {
  const encoded = encodeURIComponent(pkg)
  const res = await fetch(`https://registry.npmjs.org/${encoded}/latest`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as { version: string }
  return json.version
}

async function fetchPrevVersion(pkg: string): Promise<string | null> {
  const { data } = await supabase
    .from('amk_genai_items')
    .select('raw_data')
    .eq('source', 'npm')
    .eq('title', pkg)
    .order('collected_at', { ascending: false })
    .limit(1)
    .single()
  return (data?.raw_data as any)?.version ?? null
}

async function logResult(status: 'success' | 'failed', records: number, errorMsg?: string) {
  await supabase.from('amk_collection_logs').insert({
    job_name: 'collect-daily',
    source: 'genai_npm',
    status,
    records_saved: records,
    error_message: errorMsg ?? null,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  })
}

async function main() {
  console.log('[npm] Checking package versions...')
  let totalSaved = 0

  try {
    const rows: any[] = []

    for (const pkg of PACKAGES) {
      try {
        const version = await fetchLatestVersion(pkg)
        const prevVersion = await fetchPrevVersion(pkg)

        if (prevVersion === version) {
          console.log(`[npm] ${pkg}@${version} — no change`)
          continue
        }

        console.log(`[npm] ${pkg}: ${prevVersion ?? 'new'} → ${version}`)
        rows.push({
          source: 'npm',
          item_type: 'package_update',
          title: pkg,
          url: `https://www.npmjs.com/package/${pkg}`,
          summary: prevVersion
            ? `${pkg}@${version} released (was ${prevVersion})`
            : `${pkg}@${version} — now tracking`,
          relevance_score: 70,
          tags: [pkg.replace(/^@/, '').replace('/', '-')],
          raw_data: { version, prev_version: prevVersion },
          published_at: new Date().toISOString(),
          collected_at: new Date().toISOString(),
        })
      } catch (err) {
        console.warn(`[npm] Failed to fetch ${pkg}:`, err instanceof Error ? err.message : err)
      }
      await new Promise(r => setTimeout(r, 300))
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('amk_genai_items').insert(rows)
      if (error) throw new Error(error.message)
      totalSaved = rows.length
    }

    console.log(`[npm] Done. ${totalSaved} updates saved.`)
    await logResult('success', totalSaved)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[npm] Error:', msg)
    await logResult('failed', 0, msg)
  }
}

main().catch(console.error)

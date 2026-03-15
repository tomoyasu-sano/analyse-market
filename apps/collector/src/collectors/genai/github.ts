/**
 * GitHub Trending — AI関連リポジトリ収集
 * GitHub Trending ページをスクレイプしてAIフィルターをかける
 */

import { supabase } from '../../lib/supabase'

const AI_KEYWORDS = [
  'llm', 'ai', 'gpt', 'claude', 'gemini', 'agent', 'rag',
  'embedding', 'fine-tun', 'prompt', 'langchain', 'openai',
  'anthropic', 'mcp', 'copilot', 'diffusion', 'transformer',
]

const TRENDING_URLS = [
  'https://github.com/trending/python?since=daily',
  'https://github.com/trending/typescript?since=daily',
  'https://github.com/trending?since=daily',
]

function calcScore(title: string, description: string, starsToday: number): number {
  const text = (title + ' ' + description).toLowerCase()
  let score = 0
  for (const kw of AI_KEYWORDS) {
    if (text.includes(kw)) { score += 10; break }
  }
  if (score === 0) return 0 // AI関連でなければスキップ
  score += 20 // GitHub ベーススコア
  if (starsToday > 100) score += 10
  if (starsToday > 500) score += 10
  return Math.min(score, 100)
}

function parseTrending(html: string): Array<{ name: string; url: string; description: string; starsToday: number; language: string }> {
  const repos: Array<{ name: string; url: string; description: string; starsToday: number; language: string }> = []

  const articleRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/g
  let match
  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1]

    const nameMatch = block.match(/href="\/([^"]+)"[^>]*>\s*<[^>]+>\s*([^<\n]+)\s*\/\s*([^<\n]+)/) ||
                      block.match(/href="(\/[^"]+)"/)
    const repoPath = block.match(/href="(\/[\w-]+\/[\w.-]+)"/)
    if (!repoPath) continue
    const fullPath = repoPath[1].slice(1) // remove leading /
    const repoUrl = `https://github.com/${fullPath}`

    const descMatch = block.match(/<p[^>]*class="[^"]*color-fg-muted[^"]*"[^>]*>([\s\S]*?)<\/p>/)
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    const starsMatch = block.match(/(\d[\d,]*)\s*stars today/)
    const starsToday = starsMatch ? parseInt(starsMatch[1].replace(/,/g, '')) : 0

    const langMatch = block.match(/itemprop="programmingLanguage"[^>]*>([^<]+)</)
    const language = langMatch ? langMatch[1].trim() : ''

    repos.push({ name: fullPath, url: repoUrl, description, starsToday, language })
  }
  return repos
}

async function logResult(status: 'success' | 'failed', records: number, errorMsg?: string) {
  await supabase.from('amk_collection_logs').insert({
    job_name: 'collect-daily', source: 'genai_github', status,
    records_saved: records, error_message: errorMsg ?? null,
    started_at: new Date().toISOString(), finished_at: new Date().toISOString(),
  })
}

async function main() {
  let totalSaved = 0

  for (const trendUrl of TRENDING_URLS) {
    console.log(`[GitHub] Fetching ${trendUrl}...`)
    try {
      const res = await fetch(trendUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; analyse-market-bot/1.0)' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const repos = parseTrending(html)

      const aiRepos = repos.filter(r => {
        const text = (r.name + ' ' + r.description).toLowerCase()
        return AI_KEYWORDS.some(kw => text.includes(kw))
      })

      if (aiRepos.length === 0) continue

      const urls = aiRepos.map(r => r.url)
      const { data: existing } = await supabase.from('amk_genai_items').select('url').in('url', urls)
      const existingUrls = new Set((existing ?? []).map((e: any) => e.url))

      const rows = aiRepos
        .filter(r => !existingUrls.has(r.url))
        .map(r => ({
          source: 'github' as const,
          item_type: 'repo' as const,
          title: r.name,
          url: r.url,
          summary: r.description.slice(0, 300),
          relevance_score: calcScore(r.name, r.description, r.starsToday),
          tags: AI_KEYWORDS.filter(kw => (r.name + r.description).toLowerCase().includes(kw)),
          raw_data: { stars_today: r.starsToday, language: r.language },
          published_at: new Date().toISOString(),
          collected_at: new Date().toISOString(),
        }))
        .filter(r => r.relevance_score > 0)

      if (rows.length > 0) {
        const { error } = await supabase.from('amk_genai_items').insert(rows)
        if (error) throw new Error(error.message)
        totalSaved += rows.length
        console.log(`[GitHub] Saved ${rows.length} AI repos from ${trendUrl}`)
      }

      await new Promise(r => setTimeout(r, 1500)) // レート制限対策
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[GitHub] Error (${trendUrl}):`, msg)
    }
  }

  await logResult('success', totalSaved)
  console.log(`[GitHub] Done. Total saved: ${totalSaved}`)
}

main().catch(console.error)

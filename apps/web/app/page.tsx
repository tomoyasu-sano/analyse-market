import { createServiceClient } from '@/lib/supabase/server'
import { Dashboard } from '@/components/Dashboard'

export const revalidate = 0

export default async function Home() {
  const supabase = createServiceClient()

  // Apps: 最新推薦
  const { data: latestAnalysis } = await supabase
    .from('amk_app_analyses')
    .select('id, created_at')
    .eq('analysis_type', 'on_demand')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: recommendations } = latestAnalysis
    ? await supabase
        .from('amk_app_recommendations')
        .select('*')
        .eq('analysis_id', latestAnalysis.id)
        .order('rank', { ascending: true })
    : { data: [] }

  // GenAI: 最新レポート + 直近7日のアイテム
  const { data: latestGenAI } = await supabase
    .from('amk_genai_analyses')
    .select('id, content, highlights, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: genaiItems } = await supabase
    .from('amk_genai_items')
    .select('id, source, item_type, title, url, summary, relevance_score, published_at')
    .gte('collected_at', since7d)
    .order('relevance_score', { ascending: false })
    .limit(30)

  const lastUpdated = latestAnalysis?.created_at
    ? new Date(latestAnalysis.created_at).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

  return (
    <Dashboard
      recommendations={recommendations ?? []}
      lastUpdated={lastUpdated}
      genaiReport={latestGenAI ?? null}
      genaiItems={genaiItems ?? []}
    />
  )
}

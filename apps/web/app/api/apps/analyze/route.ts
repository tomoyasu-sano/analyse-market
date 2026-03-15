import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
}

const DATA_DAYS = 30

function buildPrompt(rankings: any[]): string {
  const topFree = rankings.filter(r => r.platform === 'ios' && r.chart_type === 'free').slice(0, 50)
  const topAndroid = rankings.filter(r => r.platform === 'android' && r.chart_type === 'free' && r.category === 'all').slice(0, 50)
  const lowRated = rankings.filter(r => r.rating !== null && r.rating <= 2.5 && r.rating_count !== null && r.rating_count > 1000).slice(0, 30)

  const fmt = (r: any) =>
    `  #${r.rank} ${r.app_name} (${r.developer}) genre=${r.genre ?? 'n/a'} rating=${r.rating ?? 'n/a'}★`

  return `あなたは個人開発者のビジネスアドバイザーです。
以下の市場データを基に、今作るべきスマートフォンアプリを提案してください。

開発者プロフィール:
- スキル: React Native（学習中）, Next.js（経験あり）, Supabase, TypeScript
- 1人開発、目標: App Store / Google Play で収益化

[iOS 無料Top50（直近${DATA_DAYS}日）]
${topFree.map(fmt).join('\n') || '  (データなし)'}

[Android 無料Top50（直近${DATA_DAYS}日）]
${topAndroid.map(fmt).join('\n') || '  (データなし)'}

[低評価アプリ（rating ≤ 2.5★, 1000件以上）]
${lowRated.map(fmt).join('\n') || '  (データなし)'}

以下の形式で10件提案してください。ニーズの大きい順。全ゾーン（🟢🟡🔴⬛）を含めること。

---
## 提案 {n}: {アプリ名}

**カテゴリ**: {カテゴリ}
**ターゲットユーザー**: {具体的なユーザー像}
**コンセプト**: {1-2行}
**差別化ポイント**: {既存アプリとの違い}

**市場データ根拠**:
- {具体的な数値}

**市場規模**: large / medium / niche
**競合密度**: low / medium / high
**収益化モデル**: freemium / paid / ads / subscription

**実現可能性**: 🟢 NOW / 🟡 LEARN / 🔴 HARD / ⬛ HARDWARE
**判断根拠**: {理由}
**必要スキル**: {カンマ区切り}
**概算開発期間**: {例: 4〜6週間（1人）}
---
`
}

function parseRecommendations(text: string) {
  const blocks = text.split(/^---$/m).filter(b => b.includes('## 提案'))
  return blocks.map((block, i) => {
    const get = (label: string) => {
      const m = block.match(new RegExp(`\\*\\*${label}\\*\\*:\\s*(.+)`))
      return m ? m[1].trim() : null
    }
    const feasibilityRaw = get('実現可能性') ?? ''
    let rn_feasibility: string = 'hard'
    if (feasibilityRaw.includes('NOW') || feasibilityRaw.includes('🟢')) rn_feasibility = 'now'
    else if (feasibilityRaw.includes('LEARN') || feasibilityRaw.includes('🟡')) rn_feasibility = 'learn'
    else if (feasibilityRaw.includes('HARDWARE') || feasibilityRaw.includes('⬛')) rn_feasibility = 'hardware'

    const skillsRaw = get('必要スキル') ?? ''
    const required_skills = skillsRaw.split(/[,、]/).map((s: string) => s.trim()).filter(Boolean)

    const weeksMatch = (get('概算開発期間') ?? '').match(/(\d+)/)
    const est_solo_weeks = weeksMatch ? parseInt(weeksMatch[1]) : null

    const conceptMatch = block.match(/## 提案 \d+: (.+)/)
    const app_concept = conceptMatch ? conceptMatch[1].trim() : `推薦 ${i + 1}`

    const marketSizeRaw = get('市場規模') ?? ''
    const market_size = (['large', 'medium', 'niche'].find(v => marketSizeRaw.toLowerCase().includes(v)) ?? null)

    const competitionRaw = get('競合密度') ?? ''
    const competition = (['low', 'medium', 'high'].find(v => competitionRaw.toLowerCase().includes(v)) ?? null)

    const monetizationRaw = get('収益化モデル') ?? ''
    const monetization = (['freemium', 'paid', 'ads', 'subscription'].find(v => monetizationRaw.toLowerCase().includes(v)) ?? null)

    const rationaleMatch = block.match(/\*\*市場データ根拠\*\*:\n([\s\S]*?)(?=\n\*\*|$)/)

    return {
      rank: i + 1,
      app_concept,
      category: get('カテゴリ'),
      target_user: get('ターゲットユーザー'),
      differentiation: get('差別化ポイント'),
      rationale: rationaleMatch ? rationaleMatch[1].trim() : null,
      market_size,
      competition,
      monetization,
      rn_feasibility,
      feasibility_reason: get('判断根拠'),
      required_skills,
      est_solo_weeks,
      difficulty: ({ now: 'easy', learn: 'medium', hard: 'hard', hardware: 'hard' } as any)[rn_feasibility] ?? 'hard',
    }
  })
}

export async function POST() {
  const supabase = getSupabase()
  const ai = getAI()
  try {
    const since = new Date(Date.now() - DATA_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { data: rankings, error: rankError } = await supabase
      .from('amk_app_rankings')
      .select('platform, chart_type, category, rank, app_name, developer, rating, rating_count, genre')
      .gte('collected_at', since)
      .order('rank', { ascending: true })
      .limit(2000)

    if (rankError) throw new Error(rankError.message)
    if (!rankings || rankings.length === 0) throw new Error('ランキングデータがありません')

    const prompt = buildPrompt(rankings)
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt })
    const text = response.text ?? ''
    const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0

    const { data: analysis, error: aErr } = await supabase
      .from('amk_app_analyses')
      .insert({
        analysis_type: 'on_demand',
        content: text,
        data_range_start: new Date(Date.now() - DATA_DAYS * 86400000).toISOString().split('T')[0],
        data_range_end: new Date().toISOString().split('T')[0],
        tokens_used: tokensUsed,
      })
      .select('id')
      .single()

    if (aErr) throw new Error(aErr.message)

    const recs = parseRecommendations(text)
    if (recs.length > 0) {
      const { error: rErr } = await supabase
        .from('amk_app_recommendations')
        .insert(recs.map(r => ({ ...r, analysis_id: analysis.id })))
      if (rErr) throw new Error(rErr.message)
    }

    return NextResponse.json({ analysisId: analysis.id, count: recs.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

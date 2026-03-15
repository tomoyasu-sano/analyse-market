/**
 * Apps オンデマンド推薦スクリプト
 * 直近30日のランキングを Gemini API に渡して「今作るべきアプリ」を10件提案する
 * 実行: npx ts-node src/analyzers/apps/recommend.ts
 */

import { supabase } from '../../lib/supabase'
import { generateText } from '../../lib/gemini'

const DATA_DAYS = 30

interface RankingRow {
  platform: string
  chart_type: string
  category: string
  rank: number
  app_name: string
  app_id: string
  developer: string
  rating: number | null
  rating_count: number | null
  genre: string | null
  collected_at: string
}

interface RecommendationParsed {
  rank: number
  app_concept: string
  category: string | null
  target_user: string | null
  differentiation: string | null
  rationale: string | null
  market_size: 'large' | 'medium' | 'niche' | null
  competition: 'low' | 'medium' | 'high' | null
  monetization: 'freemium' | 'paid' | 'ads' | 'subscription' | null
  rn_feasibility: 'now' | 'learn' | 'hard' | 'hardware'
  feasibility_reason: string | null
  required_skills: string[]
  est_solo_weeks: number | null
  difficulty: 'easy' | 'medium' | 'hard' | null
}

async function fetchRecentRankings(): Promise<RankingRow[]> {
  const since = new Date(Date.now() - DATA_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('amk_app_rankings')
    .select('platform, chart_type, category, rank, app_name, app_id, developer, rating, rating_count, genre, collected_at')
    .gte('collected_at', since)
    .order('collected_at', { ascending: false })
    .order('rank', { ascending: true })
    .limit(2000)

  if (error) throw new Error(`Failed to fetch rankings: ${error.message}`)
  return (data ?? []) as RankingRow[]
}

function buildPrompt(rankings: RankingRow[]): string {
  // Top50 に絞ってトークン節約
  const topFree = rankings.filter(r => r.platform === 'ios' && r.chart_type === 'free').slice(0, 50)
  const topAndroid = rankings.filter(r => r.platform === 'android' && r.chart_type === 'free' && r.category === 'all').slice(0, 50)
  const lowRated = rankings.filter(r => r.rating !== null && r.rating <= 2.5 && r.rating_count !== null && r.rating_count > 1000).slice(0, 30)

  const formatRow = (r: RankingRow) =>
    `  #${r.rank} ${r.app_name} (${r.developer}) genre=${r.genre ?? 'n/a'} rating=${r.rating ?? 'n/a'}★ (${r.rating_count ?? 'n/a'} reviews)`

  return `あなたは個人開発者のビジネスアドバイザーです。
以下の市場データを基に、今作るべきスマートフォンアプリを提案してください。

開発者プロフィール:
- スキル: React Native（学習中）, Next.js（経験あり）, Supabase, TypeScript
- 1人開発
- 目標: App Store / Google Play で収益を上げる
- 重要: 「作りたいもの」ではなく「市場が求めるもの」を基準に提案すること

[iOS 無料Top50（直近${DATA_DAYS}日）]
${topFree.map(formatRow).join('\n') || '  (データなし)'}

[Android 無料Top50（直近${DATA_DAYS}日）]
${topAndroid.map(formatRow).join('\n') || '  (データなし)'}

[低評価アプリ（rating ≤ 2.5★、1000件以上のレビュー）= 不満の多いカテゴリ]
${lowRated.map(formatRow).join('\n') || '  (データなし)'}

以下の形式で10件提案してください。ニーズの大きい順。全ゾーン（🟢🟡🔴⬛）を含めること。

---
## 提案 {n}: {アプリ名}

**カテゴリ**: {カテゴリ}
**ターゲットユーザー**: {具体的なユーザー像}
**コンセプト**: {1-2行}
**差別化ポイント**: {既存アプリとの違い}

**市場データ根拠**:
- {具体的な数値: 例「App Store 無料Top20に3本、平均評価2.8★と低い」}
- {例「同カテゴリがAndroid/iOS両方でTop50にランクイン」}

**市場規模**: large / medium / niche
**競合密度**: low / medium / high
**収益化モデル**: freemium / paid / ads / subscription

**実現可能性**: 🟢 NOW / 🟡 LEARN / 🔴 HARD / ⬛ HARDWARE
**判断根拠**: {例: "APIのみで実装可能" / "BLEハードが必要"}
**必要スキル**: {カンマ区切り, 例: React Native, Supabase}
**概算開発期間**: {例: 4〜6週間（1人）} または 見積不可
---
`
}

function parseRecommendations(text: string): RecommendationParsed[] {
  const blocks = text.split(/^---$/m).filter(b => b.includes('## 提案'))
  return blocks.map((block, i) => {
    const get = (label: string) => {
      const m = block.match(new RegExp(`\\*\\*${label}\\*\\*:\\s*(.+)`))
      return m ? m[1].trim() : null
    }

    const feasibilityRaw = get('実現可能性') ?? ''
    let rn_feasibility: 'now' | 'learn' | 'hard' | 'hardware' = 'hard'
    if (feasibilityRaw.includes('NOW') || feasibilityRaw.includes('🟢')) rn_feasibility = 'now'
    else if (feasibilityRaw.includes('LEARN') || feasibilityRaw.includes('🟡')) rn_feasibility = 'learn'
    else if (feasibilityRaw.includes('HARDWARE') || feasibilityRaw.includes('⬛')) rn_feasibility = 'hardware'

    const skillsRaw = get('必要スキル') ?? ''
    const required_skills = skillsRaw.split(/[,、]/).map(s => s.trim()).filter(Boolean)

    const weeksRaw = get('概算開発期間') ?? ''
    const weeksMatch = weeksRaw.match(/(\d+)/)
    const est_solo_weeks = weeksMatch ? parseInt(weeksMatch[1]) : null

    const conceptMatch = block.match(/## 提案 \d+: (.+)/)
    const app_concept = conceptMatch ? conceptMatch[1].trim() : `推薦 ${i + 1}`

    const marketSizeRaw = get('市場規模') ?? ''
    const market_size = (['large', 'medium', 'niche'].find(v => marketSizeRaw.toLowerCase().includes(v)) ?? null) as 'large' | 'medium' | 'niche' | null

    const competitionRaw = get('競合密度') ?? ''
    const competition = (['low', 'medium', 'high'].find(v => competitionRaw.toLowerCase().includes(v)) ?? null) as 'low' | 'medium' | 'high' | null

    const monetizationRaw = get('収益化モデル') ?? ''
    const monetization = (['freemium', 'paid', 'ads', 'subscription'].find(v => monetizationRaw.toLowerCase().includes(v)) ?? null) as 'freemium' | 'paid' | 'ads' | 'subscription' | null

    const difficultyMap: Record<'now' | 'learn' | 'hard' | 'hardware', 'easy' | 'medium' | 'hard'> = {
      now: 'easy', learn: 'medium', hard: 'hard', hardware: 'hard'
    }

    // 根拠テキスト（市場データ根拠ブロック全体）
    const rationaleMatch = block.match(/\*\*市場データ根拠\*\*:\n([\s\S]*?)(?=\n\*\*|$)/)
    const rationale = rationaleMatch ? rationaleMatch[1].trim() : null

    return {
      rank: i + 1,
      app_concept,
      category: get('カテゴリ'),
      target_user: get('ターゲットユーザー'),
      differentiation: get('差別化ポイント'),
      rationale,
      market_size,
      competition,
      monetization,
      rn_feasibility,
      feasibility_reason: get('判断根拠'),
      required_skills,
      est_solo_weeks,
      difficulty: difficultyMap[rn_feasibility],
    }
  })
}

async function main() {
  console.log('[Recommend] Fetching recent rankings...')
  const rankings = await fetchRecentRankings()
  console.log(`[Recommend] ${rankings.length} rows fetched`)

  if (rankings.length === 0) {
    console.error('[Recommend] No ranking data found. Run collectors first.')
    process.exit(1)
  }

  const prompt = buildPrompt(rankings)
  console.log('[Recommend] Calling Gemini API...')
  const { text, tokensUsed } = await generateText(prompt)
  console.log(`[Recommend] Tokens used: ${tokensUsed}`)

  // 分析レコードを保存
  const since = new Date(Date.now() - DATA_DAYS * 24 * 60 * 60 * 1000)
  const { data: analysisData, error: analysisError } = await supabase
    .from('amk_app_analyses')
    .insert({
      analysis_type: 'on_demand',
      category: null,
      content: text,
      data_range_start: since.toISOString().split('T')[0],
      data_range_end: new Date().toISOString().split('T')[0],
      tokens_used: tokensUsed,
    })
    .select('id')
    .single()

  if (analysisError) throw new Error(`Failed to save analysis: ${analysisError.message}`)
  const analysisId = analysisData.id

  // 推薦をパース・保存
  const recommendations = parseRecommendations(text)
  console.log(`[Recommend] Parsed ${recommendations.length} recommendations`)

  if (recommendations.length > 0) {
    const rows = recommendations.map(r => ({ ...r, analysis_id: analysisId }))
    const { error: recError } = await supabase.from('amk_app_recommendations').insert(rows)
    if (recError) throw new Error(`Failed to save recommendations: ${recError.message}`)
  }

  // ターミナルにも出力
  console.log('\n' + '='.repeat(60))
  console.log('📱 今作るべきアプリ 推薦結果')
  console.log('='.repeat(60))
  console.log(text)
  console.log('='.repeat(60))
  console.log(`[Recommend] Saved analysis_id=${analysisId}, ${recommendations.length} recommendations`)
}

main().catch(console.error)

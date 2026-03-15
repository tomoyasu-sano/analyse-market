export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
}

export async function POST() {
  const supabase = getSupabase()
  const ai = getAI()
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const sinceDate = since.split('T')[0]

    // 1. 最新の推薦結果（直近の分析から）
    const { data: latestAnalysis } = await supabase
      .from('amk_app_analyses')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: recommendations } = latestAnalysis
      ? await supabase
          .from('amk_app_recommendations')
          .select('rank, app_concept, category, competition, market_size, rn_feasibility, differentiation, rationale, est_solo_weeks')
          .eq('analysis_id', latestAnalysis.id)
          .order('rank', { ascending: true })
          .limit(5)
      : { data: [] }

    // 2. GenAI アイテム（スコア上位）
    const { data: genaiItems } = await supabase
      .from('amk_genai_items')
      .select('source, title, url, summary, relevance_score')
      .gte('collected_at', since)
      .order('relevance_score', { ascending: false })
      .limit(20)

    // 3. Google Trends シグナル
    const { data: trendSignals } = await supabase
      .from('amk_trend_signals')
      .select('keyword, score, momentum')
      .gte('collected_at', since)
      .order('score', { ascending: false })
      .limit(10)

    // 4. アプリランキング（iOS Top10）
    const { data: appRankings } = await supabase
      .from('amk_app_rankings')
      .select('platform, rank, app_name, genre, rating')
      .gte('collected_at', since)
      .eq('platform', 'ios')
      .eq('chart_type', 'free')
      .order('rank', { ascending: true })
      .limit(10)

    // --- プロンプト構築 ---
    const recSection = (recommendations ?? []).length > 0
      ? (recommendations ?? []).map((r: any) =>
          `  #${r.rank} ${r.app_concept}（${r.category ?? '—'}）[${r.rn_feasibility}] 競合:${r.competition ?? '?'} 市場:${r.market_size ?? '?'} 期間:${r.est_solo_weeks ? r.est_solo_weeks + '週' : '?'}`
        ).join('\n')
      : '  (データなし)'

    const trendSection = (trendSignals ?? []).length > 0
      ? (trendSignals ?? []).map((t: any) =>
          `  ${t.momentum === 'rising' ? '↑' : t.momentum === 'falling' ? '↓' : '→'} "${t.keyword}" ${t.score}/100`
        ).join('\n')
      : '  (データなし)'

    const genaiSection = (genaiItems ?? []).slice(0, 10).map((i: any) =>
      `  [${i.source}] ${i.title}`
    ).join('\n') || '  (データなし)'

    const rankingSection = (appRankings ?? []).map((r: any) =>
      `  #${r.rank} ${r.app_name} (${r.genre ?? '—'}) ★${r.rating ?? '?'}`
    ).join('\n') || '  (データなし)'

    const prompt = `あなたは個人開発者専属のビジネスアドバイザーです。
今週1週間分のデータを元に、「今週の総括」を作成してください。

## 私のプロフィール
- Claude Code で個人開発（React Native / Next.js / Supabase）
- App Store / Google Play でスマホアプリを出して収益化したい
- 生成AIツールを自分の開発にすぐ活かしたい

## 今週のデータ（${sinceDate} 〜 今日）

[AIが推薦するアプリ案（TOP5）]
${recSection}

[Google Trends — アプリ関連キーワード]
${trendSection}

[iOS 無料 Top10（今週）]
${rankingSection}

[GenAI 動向（スコア上位）]
${genaiSection}

## 出力形式（この構成で出力）

## 今週の総括
3〜4行で今週を一言で表す。「今週は○○が注目され、△△のチャンスがある週だった」という形で。

## 今週の勝ち筋（アプリ開発）
今週のデータから導ける「今作ると勝てる理由がある」アプリを1〜2件だけ。
- アプリ名・カテゴリ
- なぜ今週のデータがそれを示すのか（根拠2つ以上）
- 最初の1機能: 来週の月曜日から始めるとしたら何を作り始めるか

## 今週のAI活用ヒント
今週の生成AI動向から「自分の開発で即使えるもの」を1〜2件。
技術名・URL・どのコードに適用するかを具体的に。

## 来週やること（3件だけ）
- [ ] 具体的な作業（月曜にできるレベル）
- [ ] 具体的な作業
- [ ] 具体的な作業
`

    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt })
    const text = response.text ?? ''
    const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0

    const { data: saved, error: saveErr } = await supabase
      .from('amk_genai_analyses')
      .insert({
        analysis_type: 'weekly_summary',
        content: text,
        highlights: null,
        data_range_start: sinceDate,
        data_range_end: new Date().toISOString().split('T')[0],
        tokens_used: tokensUsed,
      })
      .select('id, content, created_at')
      .single()

    if (saveErr) throw new Error(saveErr.message)
    return NextResponse.json({ id: saved.id, content: saved.content, created_at: saved.created_at })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  const supabase = getSupabase()
  try {
    const { data, error } = await supabase
      .from('amk_genai_analyses')
      .select('id, content, created_at')
      .eq('analysis_type', 'weekly_summary')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) return NextResponse.json({ summary: null })
    return NextResponse.json({ summary: data })
  } catch {
    return NextResponse.json({ summary: null })
  }
}

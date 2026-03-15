import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
}

function extractActionItems(content: string): string[] {
  const section = content.match(/## 自分の開発に今すぐ活かせること([\s\S]*?)(?=\n## |$)/)?.[1] ?? ''
  return section
    .split('\n')
    .filter(l => l.trim().startsWith('-') || l.trim().startsWith('•') || l.trim().match(/^\d+\./))
    .map(l => l.replace(/^[-•\d.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 5)
}

function buildPrompt(items: any[]): string {
  const bySource = (src: string) => items.filter((i: any) => i.source === src)
  const fmt = (i: any) => `  - ${i.title}\n    ${i.url}\n    ${i.summary?.slice(0, 120) ?? '(概要なし)'}`

  const npmItems = bySource('npm')
  const npmSection = npmItems.length > 0
    ? npmItems.map((i: any) => `  - ${i.title}: ${i.summary ?? ''}`).join('\n')
    : '  (更新なし)'

  return `あなたは個人開発者専属のAI技術アドバイザーです。
以下の情報から「私が今週知るべきこと」だけを厳選して伝えてください。

## 私のプロフィール
- Claude / Claude Code で個人開発（React Native / Next.js / Supabase）
- スマホアプリで収益化したい
- AIツールは「実際に自分のコードで使えるか」が判断基準

## ルール（必ず守ること）
- 情報の羅列ではなく「これを知らないと損する情報」だけを選ぶ
- 各セクション最大3件。それ以上は書かない
- アクションアイテムは「明日できる具体的な作業」のみ。抽象論・感想は書かない
- URLは必ず含める

## 今週の収集データ

[Anthropic/Claude 関連]
${bySource('anthropic').slice(0, 5).map(fmt).join('\n') || '  (データなし)'}

[OpenAI 関連]
${bySource('openai').slice(0, 5).map(fmt).join('\n') || '  (データなし)'}

[Google AI 関連]
${bySource('google').slice(0, 3).map(fmt).join('\n') || '  (データなし)'}

[GitHub 急上昇リポジトリ]
${bySource('github').slice(0, 8).map(fmt).join('\n') || '  (データなし)'}

[Hacker News]
${bySource('hackernews').slice(0, 5).map(fmt).join('\n') || '  (データなし)'}

[Reddit (r/ClaudeAI, r/LocalLLaMA, r/MachineLearning)]
${bySource('reddit').slice(0, 5).map(fmt).join('\n') || '  (データなし)'}

[Product Hunt 注目AIプロダクト]
${bySource('producthunt').slice(0, 5).map(fmt).join('\n') || '  (データなし)'}

[npmパッケージ更新]
${npmSection}

## 出力形式（この構成で必ず出力）

## 今週のハイライト
今週最も重要な情報を1〜3件だけ。各項目にURL必須。
形式: **タイトル** ([ソース名](URL))
  → なぜ重要か: 1行
  → 自分の開発への影響: 1行

## npmアップデートアラート
バージョンアップしたパッケージの中で「自分のコードに影響がありそうなもの」のみ。
影響なければ「今週は対応不要」と書く。

## 新しいAIツール（Product Hunt / GitHub から）
今すぐ試せそうなツール・ライブラリを最大3件。URL付き。
なければ「今週は特になし」と書く。

## コミュニティの声（Reddit / HN から）
開発者の間で話題になっているトピックを1〜2件。何が議論されているかを1行で。

## 自分の開発に今すぐ活かせること
明日できる具体的な作業を3件。「○○のドキュメントを読む」ではなく「○○を使って△△を実装する」形で。`
}

export async function POST() {
  const supabase = getSupabase()
  const ai = getAI()
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: items, error: itemsError } = await supabase
      .from('amk_genai_items')
      .select('source, item_type, title, url, summary, relevance_score')
      .gte('collected_at', since)
      .order('relevance_score', { ascending: false })
      .limit(60)

    if (itemsError) throw new Error(itemsError.message)
    if (!items || items.length === 0) throw new Error('GenAIデータがありません。先に collect:genai を実行してください。')

    const prompt = buildPrompt(items)
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt })
    const text = response.text ?? ''
    const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0
    const actionItems = extractActionItems(text)

    const { data: analysis, error: aErr } = await supabase
      .from('amk_genai_analyses')
      .insert({
        analysis_type: 'on_demand',
        content: text,
        highlights: actionItems.length > 0 ? actionItems : null,
        data_range_start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        data_range_end: new Date().toISOString().split('T')[0],
        tokens_used: tokensUsed,
      })
      .select('id')
      .single()

    if (aErr) throw new Error(aErr.message)
    return NextResponse.json({ analysisId: analysis.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

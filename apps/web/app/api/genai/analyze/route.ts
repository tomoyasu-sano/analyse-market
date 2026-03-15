import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

function extractActionItems(content: string): string[] {
  const section = content.match(/## 自分の開発に今すぐ活かせること([\s\S]*?)(?=\n## |$)/)?.[1] ?? ''
  return section
    .split('\n')
    .filter(l => l.trim().startsWith('-') || l.trim().startsWith('•') || l.trim().match(/^\d+\./))
    .map(l => l.replace(/^[-•\d.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 5)
}

export async function POST() {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: items, error: itemsError } = await supabase
      .from('amk_genai_items')
      .select('source, item_type, title, url, summary, relevance_score')
      .gte('collected_at', since)
      .order('relevance_score', { ascending: false })
      .limit(50)

    if (itemsError) throw new Error(itemsError.message)
    if (!items || items.length === 0) throw new Error('GenAIデータがありません。先に collect:genai を実行してください。')

    const bySource = (src: string) => items.filter((i: any) => i.source === src)
    const fmt = (i: any) => `  - [${i.source.toUpperCase()}] ${i.title}\n    ${i.summary?.slice(0, 150) ?? ''}`

    const prompt = `あなたは生成AI開発の動向アナリストです。直近1週間の情報を整理してください。

読み手: Claude/Claude Codeで個人開発。React Native / Next.js / Supabase。新AI機能をすぐ取り込みたい。

[Anthropic / Claude 関連]
${bySource('anthropic').map(fmt).join('\n') || '  (データなし)'}

[OpenAI 関連]
${bySource('openai').map(fmt).join('\n') || '  (データなし)'}

[GitHub 急上昇（AI系）]
${bySource('github').map(fmt).join('\n') || '  (データなし)'}

[Hacker News]
${bySource('hackernews').map(fmt).join('\n') || '  (データなし)'}

以下の構成でレポートを作成:

## 今週のハイライト（最重要3件）
各項目: タイトル・URL・なぜ重要か（2行）・自分の開発への影響（1行）

## Anthropic / Claude 動向
## OpenAI 動向
## GitHub 急上昇（AI系）
## HackerNews 注目記事

## 自分の開発に今すぐ活かせること
- 「○○を使って△△する」という具体的アクション（3〜5件）`

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

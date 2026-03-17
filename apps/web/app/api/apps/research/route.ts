export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
}

function buildPrompt(idea: string): string {
  return `あなたは個人開発者のための市場調査アドバイザーです。
以下のアプリアイデアについて、App StoreとGoogle Playの知識をもとに競合調査を行ってください。

アイデア: ${idea}

開発者プロフィール:
- スキル: React Native（学習中）, Next.js（経験あり）, Supabase, TypeScript
- 1人開発、目標: App Store / Google Play で収益化

以下のJSON形式のみで回答してください。マークダウンコードブロック不要、JSONのみ:

{
  "verdict": "◎ or ○ or △ or ×",
  "verdict_reason": "作るべきかどうかの理由（2-3文）",
  "competitors": [
    {
      "name": "アプリ名",
      "platform": "iOS / Android / 両方",
      "estimated_revenue": "推定月収（例: $5K〜20K）",
      "monetization": "subscription / ads / paid / freemium のいずれか",
      "rating": "例: 4.2★（1.2万件）",
      "complaints": ["ユーザーの不満1", "不満2", "不満3"]
    }
  ],
  "market_gap": "競合の不満から見える参入チャンス（具体的に1〜2文）",
  "target_user": "誰が使うか（具体的なユーザー像）",
  "differentiation": "どう差別化するか（1〜2文）",
  "keywords": ["関連キーワード1", "関連キーワード2", "関連キーワード3"],
  "market_size": "large / medium / niche",
  "competition": "low / medium / high",
  "est_weeks": 6,
  "required_skills": ["React Native", "Supabase"]
}

競合は3〜5件。推定収益は既知のアプリランキングデータから推計し、根拠を complaints に示すこと。`
}

export async function POST(req: NextRequest) {
  try {
    const { idea } = await req.json()
    if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
      return NextResponse.json({ error: 'アイデアを入力してください' }, { status: 400 })
    }

    const ai = getAI()
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro-preview-05-06',
      contents: buildPrompt(idea.trim()),
    })

    const text = response.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI応答のパースに失敗しました' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

'use client'

import { useState } from 'react'
import { RecommendCard } from './RecommendCard'
import { TopCard } from './TopCard'
import { AnalyzeButton } from './AnalyzeButton'
import { IdeaResearch } from './IdeaResearch'

interface Recommendation {
  id: string; rank: number; app_concept: string; category: string | null
  target_user: string | null; differentiation: string | null; rationale: string | null
  market_size: string | null; competition: string | null; monetization: string | null
  rn_feasibility: string; feasibility_reason: string | null
  required_skills: string[] | null; est_solo_weeks: number | null
}

const FILTERS = [
  { value: 'all',      label: '全て' },
  { value: 'now',      label: '今すぐ着手' },
  { value: 'learn',    label: '要学習' },
  { value: 'hard',     label: '難易度高' },
  { value: 'hardware', label: 'ハード要件' },
]

export function AppsDashboard({ recommendations }: { recommendations: Recommendation[] }) {
  const [filter, setFilter] = useState('all')

  const nowRecs = recommendations.filter(r => r.rn_feasibility === 'now').slice(0, 3)
  const filtered = filter === 'all' ? recommendations : recommendations.filter(r => r.rn_feasibility === filter)

  // フィルターごとの件数
  const counts: Record<string, number> = { all: recommendations.length }
  for (const f of FILTERS.slice(1)) {
    counts[f.value] = recommendations.filter(r => r.rn_feasibility === f.value).length
  }

  return (
    <>
      {/* Section A: 分析ボタン + Top3 */}
      <section className="px-4 mb-8">
        {/* 見出し行 */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: '#2d3432' }}>
            今すぐ着手できるアプリ
          </h2>
          <AnalyzeButton />
        </div>
        <p className="text-[11px] mb-4" style={{ color: '#adb3b0' }}>
          直近30日のランキングをもとにAIが分析した推薦結果
        </p>

        {nowRecs.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x pb-4 -mx-4 px-4">
            {nowRecs.map(rec => <TopCard key={rec.id} rec={rec} />)}
          </div>
        ) : (
          <div
            className="rounded-2xl p-8 text-center text-sm"
            style={{ backgroundColor: '#ffffff', color: '#5a605e', border: '1px solid #e5e4e0' }}
          >
            推薦データがありません。「今すぐ分析」を実行してください。
          </div>
        )}
      </section>

      {/* Section B: アイデア検証 */}
      <IdeaResearch />

      {/* Section C: フィルター（件数付き） */}
      <section className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1"
              style={
                filter === f.value
                  ? { backgroundColor: '#545f73', color: '#f6f7ff' }
                  : { backgroundColor: '#ecefec', color: '#5a605e' }
              }
            >
              {f.label}
              {counts[f.value] > 0 && (
                <span className="text-[10px] opacity-70">({counts[f.value]})</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Section D: 推薦一覧 */}
      <section className="px-4 space-y-4">
        {filtered.map(rec => <RecommendCard key={rec.id} rec={rec} />)}
        {filtered.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: '#5a605e' }}>該当する推薦がありません。</p>
        )}
      </section>
    </>
  )
}

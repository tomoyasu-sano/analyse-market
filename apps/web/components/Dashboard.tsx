'use client'

import { useState } from 'react'
import { BarChart2, History, LayoutDashboard, TrendingUp } from 'lucide-react'
import { AppsDashboard } from './apps/AppsDashboard'
import { GenAiDashboard } from './genai/GenAiDashboard'

interface Recommendation {
  id: string; rank: number; app_concept: string; category: string | null
  target_user: string | null; differentiation: string | null; rationale: string | null
  market_size: string | null; competition: string | null; monetization: string | null
  rn_feasibility: string; feasibility_reason: string | null
  required_skills: string[] | null; est_solo_weeks: number | null
}

interface GenAIItem {
  id: string; source: string; item_type: string; title: string; url: string
  summary: string | null; relevance_score: number; published_at: string | null
}

interface GenAIReport {
  id: string; content: string; highlights: any; created_at: string
}

interface Props {
  recommendations: Recommendation[]
  lastUpdated: string
  genaiReport: GenAIReport | null
  genaiItems: GenAIItem[]
}

export function Dashboard({ recommendations, lastUpdated, genaiReport, genaiItems }: Props) {
  const [tab, setTab] = useState<'apps' | 'genai'>('apps')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f9f7', color: '#2d3432' }}>
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b"
        style={{ backgroundColor: 'rgba(249,249,247,0.85)', backdropFilter: 'blur(20px)', borderColor: '#e5e4e0' }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={20} style={{ color: '#545f73' }} />
          <div>
            <h1 className="text-[18px] font-semibold tracking-tight leading-tight">Analyse Market</h1>
            <p className="text-[10px] leading-tight" style={{ color: '#adb3b0' }}>ランキングをAIが分析 → 今作るべきアプリと使うべきAIを提案</p>
          </div>
        </div>
        <span className="text-[11px] font-medium" style={{ color: '#adb3b0' }}>更新: {lastUpdated}</span>
      </header>

      <nav className="px-4 py-4">
        <div className="flex items-center gap-2 p-1 rounded-full w-fit" style={{ backgroundColor: '#f2f4f2' }}>
          <button
            onClick={() => setTab('apps')}
            className="px-6 py-1.5 rounded-full text-sm font-medium transition-all"
            style={tab === 'apps' ? { backgroundColor: '#1a1a1a', color: '#fff' } : { color: '#5a605e' }}
          >
            Apps
          </button>
          <button
            onClick={() => setTab('genai')}
            className="px-6 py-1.5 rounded-full text-sm font-medium transition-all"
            style={tab === 'genai' ? { backgroundColor: '#1a1a1a', color: '#fff' } : { color: '#5a605e' }}
          >
            GenAI {genaiItems.length > 0 && <span className="ml-1 text-[10px] opacity-60">{genaiItems.length}</span>}
          </button>
        </div>
      </nav>

      <main className="pb-24">
        {tab === 'apps' ? (
          <AppsDashboard recommendations={recommendations} />
        ) : (
          <GenAiDashboard report={genaiReport} items={genaiItems} />
        )}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 border-t px-8 py-3 flex justify-between items-center"
        style={{ backgroundColor: 'rgba(249,249,247,0.85)', backdropFilter: 'blur(20px)', borderColor: '#e5e4e0' }}
      >
        <button className="flex flex-col items-center gap-1" style={{ color: '#545f73' }}>
          <LayoutDashboard size={22} />
          <span className="text-[10px] font-medium">Market</span>
        </button>
        <button className="flex flex-col items-center gap-1" style={{ color: '#adb3b0' }}>
          <BarChart2 size={22} />
          <span className="text-[10px] font-medium">Rankings</span>
        </button>
        <button className="flex flex-col items-center gap-1" style={{ color: '#adb3b0' }}>
          <History size={22} />
          <span className="text-[10px] font-medium">Reports</span>
        </button>
      </nav>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { ArrowRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Competitor {
  name: string
  platform: string
  estimated_revenue: string
  monetization: string
  rating: string
  complaints: string[]
}

interface ResearchResult {
  verdict: string
  verdict_reason: string
  competitors: Competitor[]
  market_gap: string
  target_user: string
  differentiation: string
  keywords: string[]
  market_size: string
  competition: string
  est_weeks: number
  required_skills: string[]
}

const VERDICT_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  '◎': { color: '#15803d', bg: '#dcfce7', label: '◎ 強く推奨' },
  '○': { color: '#1d4ed8', bg: '#dbeafe', label: '○ 推奨' },
  '△': { color: '#b45309', bg: '#fef3c7', label: '△ 要検討' },
  '×': { color: '#b91c1c', bg: '#fee2e2', label: '× 非推奨' },
}

const COMPETITION_COLOR: Record<string, string> = {
  low: '#15803d',
  medium: '#b45309',
  high: '#b91c1c',
}

export function IdeaResearch() {
  const [open, setOpen] = useState(false)
  const [idea, setIdea] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!idea.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/apps/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '調査に失敗しました')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const vs = result ? (VERDICT_STYLE[result.verdict] ?? VERDICT_STYLE['△']) : null

  return (
    <section className="px-4 mb-8">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-3 px-4 rounded-2xl text-left transition-colors"
        style={{ backgroundColor: '#ffffff', border: '1px solid #e5e4e0', boxShadow: '0 2px 8px -1px rgba(45,52,50,0.06)' }}
      >
        <div>
          <span className="text-[13px] font-semibold" style={{ color: '#2d3432' }}>アイデアを検証する</span>
          <p className="text-[11px] mt-0.5" style={{ color: '#adb3b0' }}>競合・収益・不満を即調査</p>
        </div>
        {open ? <ChevronUp size={16} style={{ color: '#adb3b0' }} /> : <ChevronDown size={16} style={{ color: '#adb3b0' }} />}
      </button>

      {open && (
        <div
          className="mt-2 rounded-2xl p-4"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e5e4e0', boxShadow: '0 4px 24px -2px rgba(45,52,50,0.06)' }}
        >
          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
            <input
              type="text"
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="例: 睡眠トラッキング + AIコーチング"
              className="flex-1 text-[13px] px-3 py-2 rounded-xl outline-none"
              style={{ backgroundColor: '#f2f4f2', color: '#2d3432', border: '1px solid #e5e4e0' }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !idea.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50 flex-shrink-0"
              style={{ backgroundColor: '#1a1a1a', color: '#fff' }}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
              {loading ? '調査中...' : '調査する'}
            </button>
          </form>

          {error && (
            <p className="text-[12px] text-center py-3" style={{ color: '#b91c1c' }}>{error}</p>
          )}

          {result && vs && (
            <div className="space-y-4">
              {/* Verdict */}
              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: vs.bg }}>
                <span className="text-[13px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0" style={{ color: vs.color, backgroundColor: 'rgba(255,255,255,0.6)' }}>
                  {vs.label}
                </span>
                <p className="text-[13px] leading-relaxed" style={{ color: '#2d3432' }}>{result.verdict_reason}</p>
              </div>

              {/* Market gap */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f2f4f2' }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#adb3b0' }}>市場の隙間</p>
                <p className="text-[13px] leading-relaxed" style={{ color: '#2d3432' }}>{result.market_gap}</p>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-3 text-[12px]">
                {result.market_size && (
                  <div className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#ecefec' }}>
                    <span style={{ color: '#adb3b0' }}>市場 </span>
                    <span className="font-semibold" style={{ color: '#2d3432' }}>{result.market_size}</span>
                  </div>
                )}
                {result.competition && (
                  <div className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#ecefec' }}>
                    <span style={{ color: '#adb3b0' }}>競合 </span>
                    <span className="font-semibold" style={{ color: COMPETITION_COLOR[result.competition] ?? '#2d3432' }}>{result.competition}</span>
                  </div>
                )}
                {result.est_weeks && (
                  <div className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#ecefec' }}>
                    <span style={{ color: '#adb3b0' }}>開発期間 </span>
                    <span className="font-semibold" style={{ color: '#2d3432' }}>約{result.est_weeks}週</span>
                  </div>
                )}
              </div>

              {/* Competitors */}
              {result.competitors?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#adb3b0' }}>競合アプリ</p>
                  <div className="space-y-2">
                    {result.competitors.map((c, i) => (
                      <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: '#f8f9f8', border: '1px solid #e5e4e0' }}>
                        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                          <span className="text-[13px] font-semibold" style={{ color: '#2d3432' }}>{c.name}</span>
                          <div className="flex gap-2 text-[11px]">
                            <span style={{ color: '#5a605e' }}>{c.platform}</span>
                            <span className="font-medium" style={{ color: '#15803d' }}>{c.estimated_revenue}/月</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: '#ecefec', color: '#5a605e' }}>{c.monetization}</span>
                          {c.rating && <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: '#ecefec', color: '#5a605e' }}>★ {c.rating}</span>}
                        </div>
                        {c.complaints?.length > 0 && (
                          <ul className="space-y-0.5">
                            {c.complaints.map((complaint, j) => (
                              <li key={j} className="text-[11px] flex gap-1.5" style={{ color: '#9f403d' }}>
                                <span>•</span>
                                <span>{complaint}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Differentiation */}
              {result.differentiation && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#adb3b0' }}>差別化ポイント</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#2d3432' }}>{result.differentiation}</p>
                </div>
              )}

              {/* Skills + Keywords */}
              <div className="flex flex-wrap gap-2">
                {result.required_skills?.map(s => (
                  <span key={s} className="text-[11px] font-medium px-2 py-1 rounded" style={{ backgroundColor: '#e5e9e6', color: '#5a605e' }}>{s}</span>
                ))}
                {result.keywords?.map(k => (
                  <span key={k} className="text-[11px] px-2 py-1 rounded" style={{ backgroundColor: '#f2f4f2', color: '#adb3b0' }}>#{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

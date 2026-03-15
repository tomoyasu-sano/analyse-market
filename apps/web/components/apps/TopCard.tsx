const FEASIBILITY_LABEL: Record<string, string> = {
  now: '今すぐ着手可',
  learn: '要学習',
  hard: '難易度高',
  hardware: 'ハード要件あり',
}

const FEASIBILITY_STYLE: Record<string, { color: string; bg: string }> = {
  now:      { color: '#475266', bg: '#d8e3fb' },
  learn:    { color: '#92400e', bg: '#fef3c7' },
  hard:     { color: '#9f403d', bg: '#fee2e2' },
  hardware: { color: '#374151', bg: '#f3f4f6' },
}

const COMPETITION_COLOR: Record<string, string> = {
  low: '#16a34a', medium: '#d97706', high: '#dc2626',
}

interface Rec {
  id: string; rank: number; app_concept: string; category: string | null
  competition: string | null; market_size: string | null; est_solo_weeks: number | null
  required_skills: string[] | null; rn_feasibility: string
  differentiation: string | null; rationale: string | null
}

export function TopCard({ rec }: { rec: Rec }) {
  const fs = FEASIBILITY_STYLE[rec.rn_feasibility] ?? FEASIBILITY_STYLE.hard
  const compColor = rec.competition ? (COMPETITION_COLOR[rec.competition] ?? '#5a605e') : '#5a605e'

  // 根拠の最初の1行だけ抜き出す
  const rationaleFirst = rec.rationale
    ? rec.rationale.split('\n').find(l => l.trim().startsWith('-'))?.replace(/^-\s*/, '').trim()
      ?? rec.rationale.slice(0, 80)
    : null

  return (
    <div
      className="min-w-[280px] snap-start p-5 rounded-2xl flex-shrink-0 flex flex-col"
      style={{
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 24px -2px rgba(45,52,50,0.06)',
        border: '1px solid #f0f0ee',
      }}
    >
      {/* カテゴリ + 実現可能性 */}
      <div className="flex justify-between items-start mb-3">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: '#ecefec', color: '#5a605e' }}>
          {rec.category ?? '—'}
        </span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ color: fs.color, backgroundColor: fs.bg }}>
          {FEASIBILITY_LABEL[rec.rn_feasibility] ?? rec.rn_feasibility}
        </span>
      </div>

      {/* アプリ名 */}
      <h3 className="text-[16px] font-bold mb-2 leading-snug" style={{ color: '#2d3432' }}>
        {rec.app_concept}
      </h3>

      {/* 差別化ポイント */}
      {rec.differentiation && (
        <p className="text-[12px] mb-3 leading-relaxed" style={{ color: '#5a605e' }}>
          {rec.differentiation.slice(0, 60)}{rec.differentiation.length > 60 ? '…' : ''}
        </p>
      )}

      {/* 競合・市場・期間 */}
      <div className="grid grid-cols-3 gap-2 mb-3 py-3 border-y" style={{ borderColor: '#f0f0ee' }}>
        <div className="text-center">
          <p className="text-[10px] mb-0.5" style={{ color: '#adb3b0' }}>競合</p>
          <p className="text-xs font-semibold capitalize" style={{ color: compColor }}>{rec.competition ?? '—'}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] mb-0.5" style={{ color: '#adb3b0' }}>市場</p>
          <p className="text-xs font-semibold capitalize" style={{ color: '#2d3432' }}>{rec.market_size ?? '—'}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] mb-0.5" style={{ color: '#adb3b0' }}>期間</p>
          <p className="text-xs font-semibold" style={{ color: '#2d3432' }}>{rec.est_solo_weeks ? `${rec.est_solo_weeks}週` : '—'}</p>
        </div>
      </div>

      {/* 根拠1行 */}
      {rationaleFirst && (
        <p className="text-[11px] mb-3 leading-relaxed line-clamp-2" style={{ color: '#767c79' }}>
          📊 {rationaleFirst}
        </p>
      )}

      {/* スキルタグ */}
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {(rec.required_skills ?? []).slice(0, 3).map(s => (
          <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded" style={{ backgroundColor: '#f2f4f2', color: '#5a605e' }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

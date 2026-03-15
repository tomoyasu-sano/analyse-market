const FEASIBILITY_LABEL: Record<string, string> = {
  now: '今すぐ着手可',
  learn: '要学習',
  hard: '難易度高',
  hardware: 'ハード要件あり',
}

const FEASIBILITY_STYLE: Record<string, { color: string; bg: string }> = {
  now:      { color: '#475266', bg: '#d8e3fb' },
  learn:    { color: '#5a605e', bg: '#ecefec' },
  hard:     { color: '#9f403d', bg: '#fee2e2' },
  hardware: { color: '#5a605e', bg: '#dee4e0' },
}

interface Rec {
  id: string; rank: number; app_concept: string; category: string | null
  competition: string | null; market_size: string | null; est_solo_weeks: number | null
  required_skills: string[] | null; rn_feasibility: string
}

export function TopCard({ rec }: { rec: Rec }) {
  const fs = FEASIBILITY_STYLE[rec.rn_feasibility] ?? FEASIBILITY_STYLE.hard

  return (
    <div
      className="min-w-[280px] snap-start p-5 rounded-2xl flex-shrink-0"
      style={{
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 24px -2px rgba(45,52,50,0.06)',
        border: '1px solid transparent',
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <span
          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
          style={{ backgroundColor: '#ecefec', color: '#5a605e' }}
        >
          {rec.category ?? '—'}
        </span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
          style={{ color: fs.color, backgroundColor: fs.bg }}
        >
          {FEASIBILITY_LABEL[rec.rn_feasibility] ?? rec.rn_feasibility}
        </span>
      </div>

      <h3 className="text-lg font-bold mb-4 leading-tight" style={{ color: '#2d3432' }}>
        {rec.app_concept}
      </h3>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: '競合', value: rec.competition ?? '—' },
          { label: '市場', value: rec.market_size ?? '—' },
          { label: '期間', value: rec.est_solo_weeks ? `${rec.est_solo_weeks}w` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-[10px] mb-1" style={{ color: '#5a605e' }}>{label}</p>
            <p className="text-xs font-semibold capitalize" style={{ color: '#2d3432' }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(rec.required_skills ?? []).slice(0, 3).map(s => (
          <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded" style={{ backgroundColor: '#f2f4f2', color: '#5a605e' }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

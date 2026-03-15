const FEASIBILITY_LABEL: Record<string, string> = {
  now:      '今すぐ着手可',
  learn:    '要学習',
  hard:     '難易度高',
  hardware: 'ハード要件あり',
}

const FEASIBILITY_STYLE: Record<string, { color: string; bg: string }> = {
  now:      { color: '#475266', bg: '#d8e3fb' },
  learn:    { color: '#5a605e', bg: '#ecefec' },
  hard:     { color: '#9f403d', bg: '#fee2e2' },
  hardware: { color: '#5a605e', bg: '#dee4e0' },
}

const COMPETITION_COLOR: Record<string, string> = {
  low:    '#16a34a',
  medium: '#d97706',
  high:   '#dc2626',
}

interface Recommendation {
  id: string; rank: number; app_concept: string; category: string | null
  target_user: string | null; differentiation: string | null; rationale: string | null
  market_size: string | null; competition: string | null; monetization: string | null
  rn_feasibility: string; feasibility_reason: string | null
  required_skills: string[] | null; est_solo_weeks: number | null
}

export function RecommendCard({ rec }: { rec: Recommendation }) {
  const fs = FEASIBILITY_STYLE[rec.rn_feasibility] ?? FEASIBILITY_STYLE.hard
  const compColor = rec.competition ? (COMPETITION_COLOR[rec.competition] ?? '#5a605e') : '#5a605e'

  return (
    <article
      className="p-5 rounded-2xl transition-shadow hover:shadow-md"
      style={{
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 24px -2px rgba(45,52,50,0.06)',
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="text-[14px] font-bold w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ backgroundColor: '#ecefec', color: '#2d3432' }}
          >
            #{rec.rank}
          </span>
          <h3 className="text-[16px] font-bold" style={{ color: '#2d3432' }}>{rec.app_concept}</h3>
          {rec.category && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{ backgroundColor: '#ecefec', color: '#5a605e' }}
            >
              {rec.category}
            </span>
          )}
        </div>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ml-2"
          style={{ color: fs.color, backgroundColor: fs.bg }}
        >
          {FEASIBILITY_LABEL[rec.rn_feasibility] ?? rec.rn_feasibility}
        </span>
      </div>

      {/* Stats row */}
      <div
        className="flex items-center gap-6 mb-4 text-[12px] border-b pb-4 flex-wrap"
        style={{ borderColor: '#ecefec' }}
      >
        {rec.competition && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: compColor }} />
            <span style={{ color: '#5a605e' }}>競合 {rec.competition}</span>
          </div>
        )}
        {rec.market_size && <span style={{ color: '#5a605e' }}>市場 {rec.market_size}</span>}
        {rec.monetization && <span style={{ color: '#5a605e' }}>{rec.monetization}</span>}
        {rec.est_solo_weeks && <span style={{ color: '#5a605e' }}>{rec.est_solo_weeks}週</span>}
      </div>

      {/* Detail */}
      <div className="space-y-2 mb-4">
        {rec.target_user && (
          <p className="text-[13px] leading-relaxed">
            <span className="font-semibold mr-2" style={{ color: '#5a605e' }}>対象 :</span>
            <span style={{ color: '#2d3432' }}>{rec.target_user}</span>
          </p>
        )}
        {rec.differentiation && (
          <p className="text-[13px] leading-relaxed" style={{ color: '#5a605e' }}>
            {rec.differentiation}
          </p>
        )}
      </div>

      {/* Rationale */}
      {rec.rationale && (
        <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#f2f4f2' }}>
          <p className="text-[12px] leading-relaxed line-clamp-3" style={{ color: '#5a605e' }}>
            {rec.rationale}
          </p>
        </div>
      )}

      {/* Skills */}
      {rec.required_skills && rec.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rec.required_skills.map(s => (
            <span
              key={s}
              className="text-[11px] font-medium px-2 py-1 rounded"
              style={{ backgroundColor: '#e5e9e6', color: '#5a605e' }}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

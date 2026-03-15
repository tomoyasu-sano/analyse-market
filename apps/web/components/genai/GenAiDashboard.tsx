'use client'

import { useState } from 'react'
import { ExternalLink, Bot, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { GenAiAnalyzeButton } from './GenAiAnalyzeButton'

interface GenAIItem {
  id: string; source: string; item_type: string; title: string; url: string
  summary: string | null; relevance_score: number; published_at: string | null
}

interface GenAIReport {
  id: string; content: string; highlights: any; created_at: string
}

const SOURCE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  anthropic:   { label: 'Anthropic', color: '#dc2626', bg: '#fee2e2' },
  openai:      { label: 'OpenAI',    color: '#16a34a', bg: '#dcfce7' },
  google:      { label: 'Google',    color: '#2563eb', bg: '#dbeafe' },
  github:      { label: 'GitHub',    color: '#374151', bg: '#f3f4f6' },
  hackernews:  { label: 'HN',        color: '#d97706', bg: '#fef3c7' },
  reddit:      { label: 'Reddit',    color: '#7c3aed', bg: '#ede9fe' },
  npm:         { label: 'npm',       color: '#dc2626', bg: '#fee2e2' },
  producthunt: { label: 'PH',        color: '#da552f', bg: '#fff1ed' },
}

const SOURCE_FILTERS = [
  { value: 'all',         label: '全て' },
  { value: 'anthropic',   label: 'Anthropic' },
  { value: 'openai',      label: 'OpenAI' },
  { value: 'github',      label: 'GitHub' },
  { value: 'hackernews',  label: 'HN' },
  { value: 'reddit',      label: 'Reddit' },
  { value: 'npm',         label: 'npm' },
  { value: 'google',      label: 'Google' },
  { value: 'producthunt', label: 'PH' },
]

function SourceBadge({ source }: { source: string }) {
  const s = SOURCE_STYLE[source] ?? { label: source, color: '#5a605e', bg: '#ecefec' }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  )
}

function ScoreBar({ score }: { score: number }) {
  const level = score >= 70 ? { label: 'High', color: '#16a34a' }
    : score >= 40 ? { label: 'Med', color: '#d97706' }
    : { label: 'Low', color: '#adb3b0' }
  return (
    <span className="text-[10px] font-semibold" style={{ color: level.color }}>
      ▲ {level.label}
    </span>
  )
}

function extractHighlightSection(content: string): string {
  const m = content.match(/## 今週のハイライト[\s\S]*?(?=\n## [^今]|$)/)
  return m ? m[0] : ''
}

function extractActionItems(content: string): string[] {
  const section = content.match(/## 自分の開発に今すぐ活かせること([\s\S]*?)(?=\n## |$)/)?.[1] ?? ''
  return section
    .split('\n')
    .filter(l => l.trim().match(/^[-•\d.]/))
    .map(l => l.replace(/^[-•\d.\s]+/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
    .slice(0, 5)
}

export function GenAiDashboard({ report, items }: { report: GenAIReport | null; items: GenAIItem[] }) {
  const [sourceFilter, setSourceFilter] = useState('all')

  const filtered = sourceFilter === 'all' ? items : items.filter(i => i.source === sourceFilter)
  const actionItems = report ? extractActionItems(report.content) : []
  const highlightSection = report ? extractHighlightSection(report.content) : ''

  // フィルターごとの件数
  const counts: Record<string, number> = { all: items.length }
  for (const f of SOURCE_FILTERS.slice(1)) {
    counts[f.value] = items.filter(i => i.source === f.value).length
  }

  if (items.length === 0 && !report) {
    return (
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: '#2d3432' }}>GenAI 動向</h2>
          <GenAiAnalyzeButton />
        </div>
        <div className="rounded-2xl p-12 flex flex-col items-center text-center" style={{ backgroundColor: '#ffffff', boxShadow: '0 4px 24px -2px rgba(45,52,50,0.06)' }}>
          <Bot size={48} className="mb-4" style={{ color: '#adb3b0' }} />
          <p className="font-semibold text-base mb-1" style={{ color: '#2d3432' }}>データがありません</p>
          <p className="text-sm mb-4" style={{ color: '#5a605e' }}>まず収集スクリプトを実行してください</p>
          <code className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#ecefec', color: '#2d3432' }}>
            npm run collect:genai
          </code>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section A: 今週のハイライト */}
      {highlightSection && (
        <section className="px-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: '#545f73' }} />
              <h2 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: '#2d3432' }}>今週のハイライト</h2>
            </div>
            <GenAiAnalyzeButton />
          </div>
          <div className="rounded-2xl p-5 prose prose-sm max-w-none" style={{ backgroundColor: '#ffffff', boxShadow: '0 4px 24px -2px rgba(45,52,50,0.06)' }}>
            <ReactMarkdown
              components={{
                h2: () => null,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
                    {children}
                  </a>
                ),
                p: ({ children }) => <p className="text-[13px] leading-relaxed mb-2" style={{ color: '#2d3432' }}>{children}</p>,
                li: ({ children }) => <li className="text-[13px] leading-relaxed mb-1" style={{ color: '#2d3432' }}>{children}</li>,
                strong: ({ children }) => <strong style={{ color: '#1a1a1a' }}>{children}</strong>,
              }}
            >
              {highlightSection}
            </ReactMarkdown>
          </div>
        </section>
      )}

      {/* Section B: 自分の開発に活かせること */}
      {actionItems.length > 0 && (
        <section className="px-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#2d3432' }}>
            自分の開発に今すぐ活かせること
          </h2>
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#ffffff', boxShadow: '0 4px 24px -2px rgba(45,52,50,0.06)' }}>
            <ul className="space-y-3">
              {actionItems.map((item, i) => (
                <li key={i} className="flex gap-3 text-[13px]" style={{ color: '#2d3432' }}>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                    style={{ backgroundColor: '#d8e3fb', color: '#475266' }}>
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Section C: 収集アイテム一覧 */}
      <section className="px-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#2d3432' }}>
          収集アイテム
        </h2>

        {/* ソースフィルター（件数付き） */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 mb-4">
          {SOURCE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setSourceFilter(f.value)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1"
              style={sourceFilter === f.value
                ? { backgroundColor: '#545f73', color: '#f6f7ff' }
                : { backgroundColor: '#ecefec', color: '#5a605e' }}
            >
              {f.label}
              {counts[f.value] > 0 && (
                <span className="text-[10px] opacity-70">({counts[f.value]})</span>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(item => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-2xl transition-shadow hover:shadow-md"
              style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 12px -2px rgba(45,52,50,0.06)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <SourceBadge source={item.source} />
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#ecefec', color: '#5a605e' }}>
                      {item.item_type}
                    </span>
                    <ScoreBar score={item.relevance_score} />
                  </div>
                  <p className="text-[14px] font-semibold leading-snug mb-1" style={{ color: '#2d3432' }}>
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="text-[12px] line-clamp-2" style={{ color: '#5a605e' }}>
                      {item.summary}
                    </p>
                  )}
                  {item.published_at && (
                    <p className="text-[11px] mt-1.5" style={{ color: '#adb3b0' }}>
                      {new Date(item.published_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                    </p>
                  )}
                </div>
                <ExternalLink size={14} className="flex-shrink-0 mt-1" style={{ color: '#adb3b0' }} />
              </div>
            </a>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: '#5a605e' }}>このソースのデータがありません。</p>
          )}
        </div>
      </section>
    </div>
  )
}

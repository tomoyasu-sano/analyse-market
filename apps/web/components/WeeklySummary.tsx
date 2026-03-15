'use client'

import { useState } from 'react'
import { Loader2, Sparkles, X, CalendarDays } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface WeeklySummaryData {
  id: string
  content: string
  created_at: string
}

export function WeeklySummaryButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'open'>('idle')
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/summary/weekly', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'エラーが発生しました')
      setSummary(json)
      setState('open')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setState('idle')
    }
  }

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={state === 'loading'}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-all disabled:opacity-50"
        style={{ backgroundColor: '#545f73', color: '#f6f7ff' }}
      >
        {state === 'loading' ? (
          <><Loader2 size={13} className="animate-spin" />生成中...</>
        ) : (
          <><CalendarDays size={13} />今週のサマリー</>
        )}
      </button>

      {error && (
        <p className="text-[11px] text-red-500 mt-1 text-center">{error}</p>
      )}

      {state === 'open' && summary && (
        <WeeklySummaryModal summary={summary} onClose={() => setState('idle')} />
      )}
    </>
  )
}

function WeeklySummaryModal({ summary, onClose }: { summary: WeeklySummaryData; onClose: () => void }) {
  const dateLabel = new Date(summary.created_at).toLocaleDateString('ja-JP', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{ backgroundColor: '#f9f9f7', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b flex-shrink-0" style={{ borderColor: '#e5e4e0' }}>
          <div className="flex items-center gap-2">
            <Sparkles size={15} style={{ color: '#545f73' }} />
            <div>
              <p className="text-[14px] font-semibold" style={{ color: '#2d3432' }}>今週のサマリー</p>
              <p className="text-[10px]" style={{ color: '#adb3b0' }}>{dateLabel} 生成</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#ecefec' }}
          >
            <X size={14} style={{ color: '#5a605e' }} />
          </button>
        </div>

        {/* 本文 */}
        <div className="overflow-y-auto px-5 py-4 space-y-1">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-[13px] font-bold uppercase tracking-wide mt-5 mb-2 pb-1 border-b" style={{ color: '#545f73', borderColor: '#e5e4e0' }}>
                    {children}
                  </h2>
                ),
                p: ({ children }) => (
                  <p className="text-[13px] leading-relaxed mb-2" style={{ color: '#2d3432' }}>{children}</p>
                ),
                li: ({ children }) => (
                  <li className="text-[13px] leading-relaxed mb-1.5" style={{ color: '#2d3432' }}>{children}</li>
                ),
                strong: ({ children }) => (
                  <strong style={{ color: '#1a1a1a' }}>{children}</strong>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
                    {children}
                  </a>
                ),
              }}
            >
              {summary.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* フッター */}
        <div className="px-5 py-4 flex-shrink-0 border-t" style={{ borderColor: '#e5e4e0' }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl text-[13px] font-medium"
            style={{ backgroundColor: '#1a1a1a', color: '#fff' }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

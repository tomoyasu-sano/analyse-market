'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'

export function AnalyzeButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/apps/analyze', { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch (e) {
      alert('分析エラー: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-[12px] font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{ backgroundColor: '#1a1a1a', color: '#fff' }}
    >
      {loading ? (
        <><Loader2 size={12} className="animate-spin" />分析中...</>
      ) : (
        <>今すぐ分析<ArrowRight size={12} /></>
      )}
    </button>
  )
}

'use client'

// Tabs for the Vendors module: "My pipeline" (server-rendered) vs
// "Recommended" (curated directory). Server children are passed as slots.

import { useState } from 'react'

export function VendorTabs({ pipeline, recommendations, recommendationCount }: {
  pipeline: React.ReactNode
  recommendations: React.ReactNode
  recommendationCount: number
}) {
  const [tab, setTab] = useState<'pipeline' | 'recommended'>('pipeline')
  const Tab = ({ id, label, badge }: { id: 'pipeline' | 'recommended'; label: string; badge?: number }) => (
    <button type="button" onClick={() => setTab(id)}
      className={`flex items-center gap-2 border-b-2 px-1 pb-2.5 text-[13.5px] font-medium transition-colors ${
        tab === id ? 'border-accent text-ink' : 'border-transparent text-ink-3 hover:text-ink'}`}>
      {label}
      {badge != null && (
        <span className={`rounded-full px-1.5 py-px font-mono text-[9.5px] font-semibold ${
          tab === id ? 'bg-accent-soft text-accent-ink' : 'bg-surface-2 text-ink-3'}`}>{badge}</span>
      )}
    </button>
  )
  return (
    <div>
      <div className="mb-6 flex items-center gap-6 border-b border-line">
        <Tab id="pipeline" label="My pipeline" />
        <Tab id="recommended" label="Recommended" badge={recommendationCount} />
      </div>
      <div className={tab === 'pipeline' ? '' : 'hidden'}>{pipeline}</div>
      <div className={tab === 'recommended' ? '' : 'hidden'}>{recommendations}</div>
    </div>
  )
}

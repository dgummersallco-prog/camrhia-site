"use client"
import { useState } from "react"

export function FaqAccordion({ items, questionStyle, answerStyle }: {
  items: { question: string; answer: string }[]
  questionStyle: React.CSSProperties
  answerStyle: React.CSSProperties
}) {
  const [expanded, setExpanded] = useState<number | null>(null)
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? '1px solid #eee' : undefined, padding: '14px 0' }}>
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
          >
            <span style={questionStyle}>{item.question}</span>
            <span style={{ marginLeft: 12, flexShrink: 0 }}>{expanded === i ? '−' : '+'}</span>
          </button>
          {expanded === i && <p style={{ ...answerStyle, marginTop: 10 }}>{item.answer}</p>}
        </div>
      ))}
    </div>
  )
}

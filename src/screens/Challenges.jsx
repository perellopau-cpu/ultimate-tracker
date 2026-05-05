import { useState, useEffect } from 'react'
import { useT } from '../contexts/LanguageContext'

const STORAGE_KEY = 'ut_challenges'

function loadChallenges() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveChallenges(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export default function Challenges() {
  const { t } = useT()
  const [items, setItems]   = useState(loadChallenges)
  const [input, setInput]   = useState('')

  // Persist on every change
  useEffect(() => { saveChallenges(items) }, [items])

  const add = () => {
    const text = input.trim()
    if (!text) return
    setItems(prev => [
      { id: Date.now().toString(), text, done: false, createdAt: new Date().toISOString() },
      ...prev,
    ])
    setInput('')
  }

  const toggle = (id) =>
    setItems(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c))

  const remove = (id) =>
    setItems(prev => prev.filter(c => c.id !== id))

  const active    = items.filter(c => !c.done)
  const completed = items.filter(c =>  c.done)

  return (
    <div className="screen">
      <p className="page-title">{t('challenges.title')}</p>
      <p className="page-sub">{t('challenges.sub')}</p>

      {/* ── Add input ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={t('challenges.placeholder')}
          style={{
            flex: 1, padding: '11px 14px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)',
            outline: 'none',
          }}
        />
        <button
          onClick={add}
          style={{
            padding: '11px 18px',
            background: 'var(--accent)', color: 'var(--accent-text)',
            border: 'none', borderRadius: 'var(--radius-sm)',
            fontFamily: "'DM Mono', monospace", fontSize: 12,
            fontWeight: 700, letterSpacing: '.05em',
          }}
        >
          {t('challenges.add')}
        </button>
      </div>

      {/* ── Empty state ── */}
      {items.length === 0 && (
        <div className="empty-state">
          <div className="es-icon">🎯</div>
          <p>{t('challenges.empty')}</p>
        </div>
      )}

      {/* ── Active challenges ── */}
      {active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            {t('challenges.active')} · {active.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {active.map(c => (
              <ChallengeItem key={c.id} item={c} onToggle={toggle} onRemove={remove} />
            ))}
          </div>
        </div>
      )}

      {/* ── Completed challenges ── */}
      {completed.length > 0 && (
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            {t('challenges.done')} · {completed.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completed.map(c => (
              <ChallengeItem key={c.id} item={c} onToggle={toggle} onRemove={remove} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ChallengeItem({ item, onToggle, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '13px 14px',
      boxShadow: 'var(--shadow-sm)',
      opacity: item.done ? 0.6 : 1,
      transition: 'opacity .2s',
    }}>
      {/* Check button */}
      <button
        onClick={() => onToggle(item.id)}
        style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          border: item.done ? 'none' : '2px solid var(--border)',
          background: item.done ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all .2s',
        }}
      >
        {item.done && (
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
            <path d="M1.5 5L5 8.5L11.5 1.5" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Text */}
      <span style={{
        flex: 1, fontSize: 14, color: 'var(--text)', lineHeight: 1.4,
        textDecoration: item.done ? 'line-through' : 'none',
      }}>
        {item.text}
      </span>

      {/* Delete */}
      <button
        onClick={() => onRemove(item.id)}
        style={{
          background: 'none', border: 'none', color: 'var(--muted)',
          fontSize: 16, lineHeight: 1, cursor: 'pointer', padding: '0 2px',
          opacity: 0.5,
        }}
      >
        ×
      </button>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../contexts/LanguageContext'

const FIRST_YEAR = 2024
const currentYear = () => new Date().getFullYear()

// ── localStorage cache helpers ────────────────────────────────────────
function cacheKey(userId, year) { return `ut_challenges_${userId}_${year}` }
function loadCache(userId, year) {
  try { return JSON.parse(localStorage.getItem(cacheKey(userId, year)) || '[]') } catch { return [] }
}
function saveCache(userId, year, list) {
  localStorage.setItem(cacheKey(userId, year), JSON.stringify(list))
}

export default function Challenges({ session }) {
  const { t } = useT()
  const userId = session?.user?.id
  const [year, setYear]     = useState(currentYear)
  const [items, setItems]   = useState([])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(true)

  // ── Load challenges for selected year ───────────────────────────────
  useEffect(() => {
    if (!userId) return
    setLoading(true)

    // Serve cache immediately so UI doesn't flash empty
    setItems(loadCache(userId, year))

    if (!navigator.onLine) {
      setLoading(false)
      return
    }

    supabase
      .from('challenges')
      .select('id, text, done, created_at')
      .eq('user_id', userId)
      .eq('year', year)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const list = data.map(r => ({ id: r.id, text: r.text, done: r.done, createdAt: r.created_at }))
          setItems(list)
          saveCache(userId, year, list)
        }
        setLoading(false)
      })
  }, [userId, year])

  // ── Add ──────────────────────────────────────────────────────────────
  const add = async () => {
    const text = input.trim()
    if (!text || !userId) return
    const id = Date.now().toString()
    const newItem = { id, text, done: false, createdAt: new Date().toISOString() }

    // Optimistic update
    setItems(prev => {
      const next = [newItem, ...prev]
      saveCache(userId, year, next)
      return next
    })
    setInput('')

    if (navigator.onLine) {
      await supabase.from('challenges').insert({
        id, user_id: userId, year, text, done: false, created_at: newItem.createdAt,
      })
    }
  }

  // ── Toggle ───────────────────────────────────────────────────────────
  const toggle = async (id) => {
    let newDone
    setItems(prev => {
      const next = prev.map(c => {
        if (c.id !== id) return c
        newDone = !c.done
        return { ...c, done: newDone }
      })
      saveCache(userId, year, next)
      return next
    })

    if (navigator.onLine) {
      await supabase.from('challenges').update({ done: newDone }).eq('id', id).eq('user_id', userId)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────
  const remove = async (id) => {
    setItems(prev => {
      const next = prev.filter(c => c.id !== id)
      saveCache(userId, year, next)
      return next
    })

    if (navigator.onLine) {
      await supabase.from('challenges').delete().eq('id', id).eq('user_id', userId)
    }
  }

  const maxYear   = currentYear()
  const active    = items.filter(c => !c.done)
  const completed = items.filter(c =>  c.done)

  const labelStyle = {
    fontFamily: "'DM Mono', monospace", fontSize: 10,
    color: 'var(--muted)', letterSpacing: '.08em',
    textTransform: 'uppercase', marginBottom: 10,
  }

  return (
    <div className="screen">
      <p className="page-title">{t('challenges.title')}</p>
      <p className="page-sub">{t('challenges.sub')}</p>

      {/* ── Year selector ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => setYear(y => Math.max(FIRST_YEAR, y - 1))}
          disabled={year <= FIRST_YEAR}
          style={{
            background: 'none', border: 'none', fontSize: 20,
            color: year <= FIRST_YEAR ? 'var(--border)' : 'var(--muted)',
            cursor: year <= FIRST_YEAR ? 'default' : 'pointer',
            fontFamily: 'inherit', lineHeight: 1, padding: '0 4px',
          }}
        >‹</button>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--text)', minWidth: 52, textAlign: 'center' }}>
          {year}
        </span>
        <button
          onClick={() => setYear(y => Math.min(maxYear, y + 1))}
          disabled={year >= maxYear}
          style={{
            background: 'none', border: 'none', fontSize: 20,
            color: year >= maxYear ? 'var(--border)' : 'var(--muted)',
            cursor: year >= maxYear ? 'default' : 'pointer',
            fontFamily: 'inherit', lineHeight: 1, padding: '0 4px',
          }}
        >›</button>
      </div>

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

      {/* ── Empty / loading state ── */}
      {!loading && items.length === 0 && (
        <div className="empty-state">
          <div className="es-icon">◎</div>
          <p>{t('challenges.empty')} {year}</p>
        </div>
      )}

      {/* ── Active challenges ── */}
      {active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={labelStyle}>{t('challenges.active')} · {active.length}</div>
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
          <div style={labelStyle}>{t('challenges.done')} · {completed.length}</div>
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
          fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: '0 2px',
          opacity: 0.5,
        }}
      >
        ×
      </button>
    </div>
  )
}

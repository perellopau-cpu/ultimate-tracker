import { useRef, useEffect, useCallback } from 'react'
import { useT } from '../../contexts/LanguageContext'

// ── Drum-roll scroll picker ───────────────────────────────────────────
const ITEM_H = 48
const MAX_DRINKS = 20

function DrinkPicker({ value, onChange }) {
  const ref = useRef(null)
  const settling = useRef(false)
  const items = Array.from({ length: MAX_DRINKS }, (_, i) => i + 1)

  // Scroll to current value on mount / value change (from outside)
  useEffect(() => {
    const el = ref.current
    if (!el || settling.current) return
    el.scrollTo({ top: (value - 1) * ITEM_H, behavior: 'smooth' })
  }, [value])

  const onScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    clearTimeout(el._t)
    el._t = setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H)
      const clamped = Math.max(0, Math.min(idx, items.length - 1))
      settling.current = true
      el.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' })
      onChange(String(items[clamped]))
      setTimeout(() => { settling.current = false }, 300)
    }, 120)
  }, [items, onChange])

  return (
    <div style={{ position: 'relative', height: ITEM_H * 3, marginTop: 12 }}>
      {/* Centre highlight */}
      <div style={{
        position: 'absolute', top: ITEM_H, left: 0, right: 0, height: ITEM_H,
        background: 'var(--accent-bg)',
        borderTop: '1px solid var(--accent)', borderBottom: '1px solid var(--accent)',
        borderRadius: 8, pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Fade top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H,
        background: 'linear-gradient(to bottom, var(--surface), transparent)',
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Fade bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H,
        background: 'linear-gradient(to top, var(--surface), transparent)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      <div
        ref={ref}
        onScroll={onScroll}
        style={{
          height: '100%', overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`.drink-picker-scroll::-webkit-scrollbar{display:none}`}</style>
        {/* top spacer so first item centres */}
        <div style={{ height: ITEM_H, scrollSnapAlign: 'none' }} />
        {items.map(n => {
          const active = String(n) === String(value)
          return (
            <div
              key={n}
              style={{
                height: ITEM_H, scrollSnapAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'DM Mono', monospace",
                fontSize: active ? 26 : 17,
                fontWeight: active ? 700 : 400,
                color: active ? 'var(--accent)' : 'var(--muted)',
                transition: 'font-size .12s, color .12s',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => onChange(String(n))}
            >
              {n}
            </div>
          )
        })}
        {/* bottom spacer */}
        <div style={{ height: ITEM_H, scrollSnapAlign: 'none' }} />
      </div>
    </div>
  )
}

// ── Main VicesLog ─────────────────────────────────────────────────────
export default function VicesLog({ val, onChange }) {
  const { t } = useT()

  const alcoholChoice = val.alcoholCount === '0' ? 'none'
    : val.alcoholCount && val.alcoholCount !== '' ? 'some'
    : null

  const handleNone = () => onChange({ ...val, alcoholCount: '0' })
  const handleSome = () => {
    // default to 1 if no previous value
    const prev = parseInt(val.alcoholCount)
    onChange({ ...val, alcoholCount: String(prev > 0 ? prev : 1) })
  }

  return (
    <div>
      <div className="section-label">{t('vices.cigarettes')}</div>
      <div className="toggle-group" style={{ flexWrap: 'wrap' }}>
        {[
          { id: 'vape',       labelKey: 'vices.vape',          danger: true  },
          { id: 'cigar',      labelKey: 'vices.cigar',         danger: true  },
          { id: 'cigarettes', labelKey: 'vices.cigarettesOpt', danger: true  },
          { id: 'not_smoked', labelKey: 'vices.notSmoked',     danger: false },
        ].map(({ id, labelKey, danger }) => (
          <button
            key={id}
            className={`toggle-btn ${danger ? 'danger' : ''} ${val.smokeType === id ? 'active' : ''}`}
            onClick={() => onChange({ ...val, smokeType: val.smokeType === id ? null : id, cigaretteCount: '' })}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {val.smokeType === 'cigarettes' && (
        <div className="field" style={{ marginTop: 12 }}>
          <label>{t('vices.howMany')}</label>
          <input
            type="number"
            placeholder="0"
            value={val.cigaretteCount}
            onChange={e => onChange({ ...val, cigaretteCount: e.target.value })}
          />
        </div>
      )}

      <div className="section-label">{t('vices.alcohol')}</div>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${alcoholChoice === 'none' ? 'active' : ''}`}
          onClick={handleNone}
        >
          None 🙅
        </button>
        <button
          className={`toggle-btn danger ${alcoholChoice === 'some' ? 'active' : ''}`}
          onClick={handleSome}
        >
          Some 🍺
        </button>
      </div>

      {alcoholChoice === 'some' && (
        <DrinkPicker
          value={val.alcoholCount || '1'}
          onChange={v => onChange({ ...val, alcoholCount: v })}
        />
      )}

      <div className="section-label">{t('vices.socialMedia')}</div>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${val.socialMediaUnder30 === true ? 'active' : ''}`}
          onClick={() => onChange({ ...val, socialMediaUnder30: val.socialMediaUnder30 === true ? null : true })}
        >
          {t('vices.yes')}
        </button>
        <button
          className={`toggle-btn danger ${val.socialMediaUnder30 === false ? 'active' : ''}`}
          onClick={() => onChange({ ...val, socialMediaUnder30: val.socialMediaUnder30 === false ? null : false })}
        >
          {t('vices.no')}
        </button>
      </div>
    </div>
  )
}

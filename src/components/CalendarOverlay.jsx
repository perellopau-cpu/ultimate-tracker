import { useState } from 'react'
import { fmtKey } from '../lib/utils'
import { useT } from '../contexts/LanguageContext'

export default function CalendarOverlay({ selectedDate, loggedDates, onSelect, onClose }) {
  const { t } = useT()
  const today = new Date()
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())

  const MONTH_NAMES = t('cal.months')
  const DAY_NAMES   = t('cal.days')

  // Monday-first: 0=Sun→6, 1=Mon→0, 2=Tue→1, ..., 6=Sat→5
  const rawFirstDay = new Date(viewYear, viewMonth, 1).getDay()
  const firstDay = (rawFirstDay + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const handleDayClick = (d) => {
    const date = new Date(viewYear, viewMonth, d)
    if (date > today) return
    onSelect(date)
    onClose()
  }

  const todayKey    = fmtKey(today)
  const selectedKey = fmtKey(selectedDate)
  const isNextDisabled = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  return (
    <div style={o.backdrop} onClick={onClose}>
      <div style={o.sheet} onClick={e => e.stopPropagation()}>

        <div style={o.header}>
          <button style={o.navBtn} onClick={prevMonth}>‹</button>
          <span style={o.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button
            style={{ ...o.navBtn, opacity: isNextDisabled ? 0.3 : 1 }}
            onClick={nextMonth}
            disabled={isNextDisabled}
          >›</button>
        </div>

        <div style={o.grid}>
          {DAY_NAMES.map(d => (
            <div key={d} style={o.dayName}>{d}</div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />
            const date  = new Date(viewYear, viewMonth, d)
            const key   = fmtKey(date)
            const isToday    = key === todayKey
            const isSelected = key === selectedKey
            const hasData    = loggedDates.has(key)
            const isFuture   = date > today

            return (
              <div
                key={key}
                style={{
                  ...o.day,
                  ...(isSelected ? o.daySelected : {}),
                  ...(isToday && !isSelected ? o.dayToday : {}),
                  ...(isFuture ? o.dayFuture : {}),
                }}
                onClick={() => !isFuture && handleDayClick(d)}
              >
                {d}
                {hasData && !isSelected && <span style={o.dot} />}
              </div>
            )
          })}
        </div>

        <button style={o.closeBtn} onClick={onClose}>{t('cal.close')}</button>
      </div>
    </div>
  )
}

const o = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,.4)',
    zIndex: 200,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheet: {
    width: '100%', maxWidth: 430,
    background: 'var(--surface)',
    borderRadius: '20px 20px 0 0',
    padding: '24px 20px 36px',
    boxShadow: '0 -4px 32px rgba(0,0,0,.15)',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  monthLabel: { fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--text)' },
  navBtn: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text)', width: 36, height: 36, borderRadius: 10,
    fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 20 },
  dayName: {
    textAlign: 'center', fontFamily: "'DM Mono', monospace",
    fontSize: 10, color: 'var(--muted)', padding: '4px 0 8px', letterSpacing: '.05em',
  },
  day: {
    aspectRatio: '1', borderRadius: 10,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, cursor: 'pointer', fontFamily: "'DM Mono', monospace",
    color: 'var(--text-secondary)', position: 'relative', gap: 2, transition: 'background .15s',
  },
  dayToday:    { border: '2px solid var(--accent)', color: 'var(--accent)', fontWeight: 700 },
  daySelected: { background: 'var(--accent)', color: 'var(--accent-text)', fontWeight: 700 },
  dayFuture:   { opacity: 0.25, cursor: 'default' },
  dot: { width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', position: 'absolute', bottom: 4 },
  closeBtn: {
    width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: 14,
    fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer',
  },
}

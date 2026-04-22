import { useState } from 'react'
import CalendarOverlay from '../components/CalendarOverlay'
import { BLOCKS, completionOf, fmtKey } from '../lib/utils'
import { useT } from '../contexts/LanguageContext'

const BLOCK_COLOR = {
  sleep:     'var(--sleep)',
  nutrition: 'var(--nutrition)',
  exercise:  'var(--exercise)',
  formation: 'var(--formation)',
  vices:     'var(--vices)',
}

const BLOCK_LABEL_KEY = {
  sleep: 'block.sleep', nutrition: 'block.nutrition',
  exercise: 'block.exercise', formation: 'block.formation', vices: 'block.vices',
}

export default function Home({ selectedDate, onSelectDate, dayData, loggedDates, onOpenBlock }) {
  const { t } = useT()
  const [showCalendar, setShowCalendar] = useState(false)

  const today = new Date()
  const isToday = fmtKey(selectedDate) === fmtKey(today)

  const dateLabel = selectedDate.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="screen">
      <div style={styles.topBar}>
        <p style={styles.dateText}>
          {isToday ? today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : dateLabel}
        </p>
        <button style={styles.calBtn} onClick={() => setShowCalendar(true)} aria-label="Open calendar">
          📅
        </button>
      </div>

      {!isToday && (
        <div className="date-badge" style={{ marginBottom: 16 }}>● {t('home.pastDay')}</div>
      )}

      {BLOCKS.map(b => {
        const { done, total } = completionOf(b.id, dayData)
        const full = done === total && total > 0
        const color = BLOCK_COLOR[b.id]
        return (
          <div key={b.id} className={`block-card ${b.id}`} onClick={() => onOpenBlock(b.id)}>
            <span className="block-emoji">{b.emoji}</span>
            <div className="block-info">
              <div className="block-name">{t(BLOCK_LABEL_KEY[b.id])}</div>
              <div className={`block-completion ${full ? 'full' : ''}`}>
                {full ? t('home.complete') : `${done} / ${total} ${t('home.filled')}`}
              </div>
              <div className="progress-dots">
                {Array.from({ length: total }).map((_, i) => (
                  <div key={i} className={`dot ${i < done ? 'filled' : ''}`}
                    style={i < done ? { background: color } : {}} />
                ))}
              </div>
            </div>
            <span className="block-arrow">›</span>
          </div>
        )
      })}

      {showCalendar && (
        <CalendarOverlay
          selectedDate={selectedDate}
          loggedDates={loggedDates}
          onSelect={onSelectDate}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  )
}

const styles = {
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dateText: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 20,
    color: 'var(--text)',
    lineHeight: 1.2,
  },
  calBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    width: 42,
    height: 42,
    fontSize: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
}

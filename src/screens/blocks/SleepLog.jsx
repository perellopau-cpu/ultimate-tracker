import { calcHoursSlept } from '../../lib/utils'
import { useT } from '../../contexts/LanguageContext'

// Styled box that looks like calc-result but acts as a time input on tap
function TimeInput({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>
        {label}
      </label>
      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{
          padding: '9px 14px',
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 15,
          color: value ? 'var(--text)' : 'var(--muted)',
          fontFamily: "'DM Sans', sans-serif",
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          {value || '––:––'}
        </div>
        <input
          type="time"
          value={value}
          onChange={onChange}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
          }}
        />
      </div>
    </div>
  )
}

export default function SleepLog({ val, onChange }) {
  const { t } = useT()
  const hours = calcHoursSlept(val.bedtime, val.waketime)

  return (
    <div>
      <div className="section-label">{t('sleep.times')}</div>

      <TimeInput
        label={t('sleep.bedtime')}
        value={val.bedtime}
        onChange={e => onChange({ ...val, bedtime: e.target.value })}
      />
      <TimeInput
        label={t('sleep.waketime')}
        value={val.waketime}
        onChange={e => onChange({ ...val, waketime: e.target.value })}
      />

      {hours && (
        <div className="field">
          <label>{t('sleep.hoursSlept')}</label>
          <div className="calc-result">{hours.label} ✦</div>
        </div>
      )}

      <div className="section-label">{t('sleep.wakeSpeed')}</div>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${val.wakeUpSpeed === 'fast' ? 'active' : ''}`}
          style={val.wakeUpSpeed === 'fast' ? { background: 'var(--accent)', color: 'var(--accent-text)' } : {}}
          onClick={() => onChange({ ...val, wakeUpSpeed: val.wakeUpSpeed === 'fast' ? null : 'fast' })}
        >
          {t('sleep.fast')} ⚡
        </button>
        <button
          className={`toggle-btn danger ${val.wakeUpSpeed === 'slow' ? 'active' : ''}`}
          onClick={() => onChange({ ...val, wakeUpSpeed: val.wakeUpSpeed === 'slow' ? null : 'slow' })}
        >
          {t('sleep.slow')} 🐢
        </button>
      </div>

      <div className="section-label">{t('sleep.phone30')}</div>
      <div className="toggle-group">
        <button
          className={`toggle-btn danger ${val.phone30 === true ? 'active' : ''}`}
          onClick={() => onChange({ ...val, phone30: val.phone30 === true ? null : true })}
        >
          {t('sleep.yes')}
        </button>
        <button
          className={`toggle-btn ${val.phone30 === false ? 'active' : ''}`}
          onClick={() => onChange({ ...val, phone30: val.phone30 === false ? null : false })}
        >
          {t('sleep.no')}
        </button>
      </div>

      <div className="section-label">{t('sleep.legsUp')}</div>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${val.legsUp === true ? 'active' : ''}`}
          onClick={() => onChange({ ...val, legsUp: val.legsUp === true ? null : true })}
        >{t('sleep.yes')}</button>
        <button
          className={`toggle-btn danger ${val.legsUp === false ? 'active' : ''}`}
          onClick={() => onChange({ ...val, legsUp: val.legsUp === false ? null : false })}
        >{t('sleep.no')}</button>
      </div>

      <div className="section-label">{t('sleep.breathwork')}</div>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${val.breathwork === true ? 'active' : ''}`}
          onClick={() => onChange({ ...val, breathwork: val.breathwork === true ? null : true })}
        >{t('sleep.yes')}</button>
        <button
          className={`toggle-btn danger ${val.breathwork === false ? 'active' : ''}`}
          onClick={() => onChange({ ...val, breathwork: val.breathwork === false ? null : false })}
        >{t('sleep.no')}</button>
      </div>

      <div className="section-label">{t('sleep.nasalStrip')}</div>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${val.nasalStrip === true ? 'active' : ''}`}
          onClick={() => onChange({ ...val, nasalStrip: val.nasalStrip === true ? null : true })}
        >{t('sleep.yes')}</button>
        <button
          className={`toggle-btn danger ${val.nasalStrip === false ? 'active' : ''}`}
          onClick={() => onChange({ ...val, nasalStrip: val.nasalStrip === false ? null : false })}
        >{t('sleep.no')}</button>
      </div>

      <div className="section-label">{t('sleep.dentalFloss')}</div>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${val.dentalFloss === true ? 'active' : ''}`}
          onClick={() => onChange({ ...val, dentalFloss: val.dentalFloss === true ? null : true })}
        >{t('sleep.yes')}</button>
        <button
          className={`toggle-btn danger ${val.dentalFloss === false ? 'active' : ''}`}
          onClick={() => onChange({ ...val, dentalFloss: val.dentalFloss === false ? null : false })}
        >{t('sleep.no')}</button>
      </div>

      <div className="section-label">{t('formation.gratitude')}</div>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${val.gratitude === true ? 'active' : ''}`}
          onClick={() => onChange({ ...val, gratitude: val.gratitude === true ? null : true })}
        >{t('sleep.yes')}</button>
        <button
          className={`toggle-btn danger ${val.gratitude === false ? 'active' : ''}`}
          onClick={() => onChange({ ...val, gratitude: val.gratitude === false ? null : false })}
        >{t('sleep.no')}</button>
      </div>
    </div>
  )
}

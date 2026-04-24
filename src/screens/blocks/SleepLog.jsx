import { calcHoursSlept } from '../../lib/utils'
import { useT } from '../../contexts/LanguageContext'

export default function SleepLog({ val, onChange }) {
  const { t } = useT()
  const hours = calcHoursSlept(val.bedtime, val.waketime)

  return (
    <div>
      <div className="section-label">{t('sleep.times')}</div>
      <div className="input-row">
        <div className="field">
          <label>{t('sleep.bedtime')}</label>
          <input
            type="time"
            value={val.bedtime}
            onChange={e => onChange({ ...val, bedtime: e.target.value })}
          />
        </div>
        <div className="field">
          <label>{t('sleep.waketime')}</label>
          <input
            type="time"
            value={val.waketime}
            onChange={e => onChange({ ...val, waketime: e.target.value })}
          />
        </div>
      </div>

      {hours && (
        <div style={{ marginTop: 10 }}>
          <div className="field">
            <label>{t('sleep.hoursSlept')}</label>
            <div className="calc-result">{hours.label} ✦</div>
          </div>
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
    </div>
  )
}

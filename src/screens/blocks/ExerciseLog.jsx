import { useT } from '../../contexts/LanguageContext'

export default function ExerciseLog({ val, onChange }) {
  const { t } = useT()

  const EX_TYPES = [
    { id: 'push',    icon: '🤜', labelKey: 'exercise.push' },
    { id: 'pull',    icon: '🤛', labelKey: 'exercise.pull' },
    { id: 'leg',     icon: '🦵', labelKey: 'exercise.leg' },
    { id: 'rest',    icon: '😴', labelKey: 'exercise.rest' },
    { id: 'run',     icon: '🏃', labelKey: 'exercise.run' },
    { id: 'cycling', icon: '🚴', labelKey: 'exercise.cycling' },
  ]

  const needsDetail = val.type === 'run' || val.type === 'cycling'

  return (
    <div>
      <div className="section-label">{t('exercise.type')}</div>
      <div className="ex-grid">
        {EX_TYPES.map(ex => (
          <div
            key={ex.id}
            className={`ex-btn ${val.type === ex.id ? 'active' : ''}`}
            onClick={() => onChange({ ...val, type: ex.id, km: '', pace: '' })}
          >
            <div className="ex-icon">{ex.icon}</div>
            <div className="ex-label">{t(ex.labelKey)}</div>
          </div>
        ))}
      </div>

      {needsDetail && (
        <>
          <div className="section-label">
            {val.type === 'run' ? t('exercise.runDetails') : t('exercise.cyclingDetails')}
          </div>
          <div className="input-row">
            <div className="field">
              <label>{t('exercise.km')}</label>
              <input
                type="number"
                step="0.1"
                placeholder="5.0"
                value={val.km}
                onChange={e => onChange({ ...val, km: e.target.value })}
              />
            </div>
            <div className="field">
              <label>{t('exercise.pace')}</label>
              <input
                type="text"
                placeholder="5'30"
                value={val.pace}
                onChange={e => onChange({ ...val, pace: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      <div className="section-label">{t('exercise.sauna')}</div>
      <div className="toggle-group">
        {['1', '2', '3'].map(n => (
          <button
            key={n}
            className={`toggle-btn ${val.saunaRounds === n ? 'active' : ''}`}
            onClick={() => onChange({ ...val, saunaRounds: val.saunaRounds === n ? '' : n })}
          >
            {n} 🧖
          </button>
        ))}
        <button
          className={`toggle-btn ${val.saunaRounds === 'no' ? 'active' : ''}`}
          onClick={() => onChange({ ...val, saunaRounds: val.saunaRounds === 'no' ? '' : 'no' })}
        >
          No sauna
        </button>
      </div>

      <div className="section-label">{t('exercise.cold')}</div>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${val.cold === true ? 'active' : ''}`}
          onClick={() => onChange({ ...val, cold: val.cold === true ? null : true })}
        >{t('sleep.yes')}</button>
        <button
          className={`toggle-btn danger ${val.cold === false ? 'active' : ''}`}
          onClick={() => onChange({ ...val, cold: val.cold === false ? null : false })}
        >{t('sleep.no')}</button>
      </div>
    </div>
  )
}

import { useT } from '../../contexts/LanguageContext'

export default function VicesLog({ val, onChange }) {
  const { t } = useT()

  return (
    <div>
      <div className="section-label">{t('vices.cigarettes')}</div>
      <div className="field">
        <input
          type="number"
          placeholder="0"
          value={val.cigarettes}
          onChange={e => onChange({ ...val, cigarettes: e.target.value })}
        />
      </div>

      <div className="section-label">{t('vices.alcohol')}</div>
      <div className="input-row">
        <div className="field">
          <label>{t('vices.drinks')}</label>
          <input
            type="number"
            placeholder="0"
            value={val.alcoholCount}
            onChange={e => onChange({ ...val, alcoholCount: e.target.value })}
          />
        </div>
        <div className="field">
          <label>{t('vices.type')}</label>
          <input
            type="text"
            placeholder="Beer, wine…"
            value={val.alcoholType}
            onChange={e => onChange({ ...val, alcoholType: e.target.value })}
          />
        </div>
      </div>

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

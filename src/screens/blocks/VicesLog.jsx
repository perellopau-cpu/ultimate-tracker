import { useT } from '../../contexts/LanguageContext'

export default function VicesLog({ val, onChange }) {
  const { t } = useT()

  return (
    <div>
      <div className="section-label">{t('vices.cigarettes')}</div>
      <div className="toggle-group" style={{ flexWrap: 'wrap' }}>
        {[
          { id: 'vape',        labelKey: 'vices.vape',          danger: true  },
          { id: 'cigar',       labelKey: 'vices.cigar',         danger: true  },
          { id: 'cigarettes',  labelKey: 'vices.cigarettesOpt', danger: true  },
          { id: 'not_smoked',  labelKey: 'vices.notSmoked',     danger: false },
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

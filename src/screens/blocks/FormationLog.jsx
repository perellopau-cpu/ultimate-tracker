import { useT } from '../../contexts/LanguageContext'

export default function FormationLog({ val, onChange }) {
  const { t } = useT()

  return (
    <div>
      <div className="section-label">{t('formation.timeInvested')}</div>
      <div className="input-row">
        <div className="field">
          <label>{t('formation.study')}</label>
          <input
            type="number"
            placeholder="60"
            value={val.study}
            onChange={e => onChange({ ...val, study: e.target.value })}
          />
        </div>
        <div className="field">
          <label>{t('formation.reading')}</label>
          <input
            type="number"
            placeholder="30"
            value={val.reading}
            onChange={e => onChange({ ...val, reading: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}

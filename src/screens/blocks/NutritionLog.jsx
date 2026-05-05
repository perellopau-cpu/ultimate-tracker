import { useT } from '../../contexts/LanguageContext'

export default function NutritionLog({ val, onChange, lastWeight }) {
  const { t } = useT()

  const ticks = [
    { key: 'o3',        labelKey: 'nutrition.o3' },
    { key: 'zmb6',      labelKey: 'nutrition.zmb6' },
    { key: 'creatine',  labelKey: 'nutrition.creatine' },
    { key: 'fruitveg1', labelKey: 'nutrition.fruitveg1' },
    { key: 'fruitveg2', labelKey: 'nutrition.fruitveg2' },
  ]

  return (
    <div>
      <div className="section-label">{t('nutrition.body')}</div>
      <div className="input-row">
        <div className="field">
          <label>{t('nutrition.weight')}</label>
          <input
            type="number"
            step="0.1"
            placeholder={lastWeight || '73.5'}
            value={val.weight}
            onChange={e => onChange({ ...val, weight: e.target.value })}
          />
        </div>
      </div>

      <div className="section-label">{t('nutrition.supps')}</div>
      <div className="tick-grid">
        {ticks.map(tick => (
          <div
            key={tick.key}
            className={`tick-item ${val[tick.key] ? 'checked' : ''}`}
            onClick={() => onChange({ ...val, [tick.key]: !val[tick.key] })}
          >
            <div className="tick-check">{val[tick.key] ? '✓' : ''}</div>
            <span className="tick-label">{t(tick.labelKey)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

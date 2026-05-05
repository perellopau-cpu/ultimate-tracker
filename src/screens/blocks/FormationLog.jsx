import { useT } from '../../contexts/LanguageContext'

const STUDY_OPTIONS = [
  { label: '0',    value: '0'   },
  { label: '30m',  value: '30'  },
  { label: '1h',   value: '60'  },
  { label: '1h30', value: '90'  },
  { label: '2h+',  value: '150' },
]

const READING_OPTIONS = [
  { label: '0',   value: '0'  },
  { label: '15m', value: '15' },
  { label: '30m', value: '30' },
  { label: '45m', value: '45' },
  { label: '1h+', value: '75' },
]

export default function FormationLog({ val, onChange }) {
  const { t } = useT()

  return (
    <div>
      <div className="section-label">{t('formation.study')}</div>
      <div className="toggle-group">
        {STUDY_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            className={`toggle-btn ${val.study === value ? 'active' : ''}`}
            onClick={() => onChange({ ...val, study: val.study === value ? '' : value })}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="section-label">{t('formation.reading')}</div>
      <div className="toggle-group">
        {READING_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            className={`toggle-btn ${val.reading === value ? 'active' : ''}`}
            onClick={() => onChange({ ...val, reading: val.reading === value ? '' : value })}
          >
            {label}
          </button>
        ))}
      </div>

    </div>
  )
}

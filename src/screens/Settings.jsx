import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../contexts/LanguageContext'

export default function Settings({ theme, onToggleTheme, onBack }) {
  const { t, lang, setLang } = useT()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwStatus, setPwStatus] = useState('idle') // idle | saving | success | error
  const [pwError, setPwError] = useState('')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    if (newPassword !== confirmPassword) {
      setPwError(t('settings.passwordMismatch'))
      return
    }
    setPwStatus('saving')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPwError(error.message)
      setPwStatus('error')
    } else {
      setPwStatus('success')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => { setPwStatus('idle'); setShowPasswordForm(false) }, 2500)
    }
  }

  return (
    <div className="screen">
      <div className="log-header">
        <button className="back-btn" onClick={onBack}>‹</button>
        <div className="log-title">{t('settings.title')}</div>
      </div>

      {/* Appearance */}
      <div style={s.section}>
        <p style={s.sectionLabel}>{t('settings.appearance')}</p>
        <div style={s.card}>
          <div style={s.row}>
            <span style={s.rowLabel}>{t('settings.darkMode')}</span>
            <Toggle on={theme === 'dark'} onToggle={onToggleTheme} />
          </div>
        </div>
      </div>

      {/* Language */}
      <div style={s.section}>
        <p style={s.sectionLabel}>{t('settings.language')}</p>
        <div style={s.card}>
          <div style={s.langRow}>
            <button
              style={{ ...s.langBtn, ...(lang === 'en' ? s.langBtnActive : {}) }}
              onClick={() => setLang('en')}
            >
              🇬🇧 English
            </button>
            <button
              style={{ ...s.langBtn, ...(lang === 'es' ? s.langBtnActive : {}) }}
              onClick={() => setLang('es')}
            >
              🇪🇸 Español
            </button>
          </div>
        </div>
      </div>

      {/* Account */}
      <div style={s.section}>
        <p style={s.sectionLabel}>{t('settings.account')}</p>
        <div style={s.card}>

          {/* Change password row */}
          <button
            style={s.accountRow}
            onClick={() => { setShowPasswordForm(v => !v); setPwStatus('idle'); setPwError('') }}
          >
            <span style={s.rowLabel}>{t('settings.changePassword')}</span>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>{showPasswordForm ? '▲' : '▶'}</span>
          </button>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} style={s.pwForm}>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>{t('settings.newPassword')}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>{t('settings.confirmPassword')}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              {pwError && (
                <p style={s.pwError}>{pwError}</p>
              )}
              {pwStatus === 'success' && (
                <p style={s.pwSuccess}>{t('settings.passwordSuccess')}</p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={s.pwSaveBtn} disabled={pwStatus === 'saving'}>
                  {pwStatus === 'saving' ? t('settings.savingPassword') : t('settings.savePassword')}
                </button>
                <button
                  type="button"
                  style={s.pwCancelBtn}
                  onClick={() => { setShowPasswordForm(false); setPwStatus('idle'); setPwError('') }}
                >
                  {t('settings.cancel')}
                </button>
              </div>
            </form>
          )}

          <div style={s.divider} />

          {/* Sign out */}
          <button style={{ ...s.accountRow, color: 'var(--danger)' }} onClick={handleSignOut}>
            <span>{t('settings.signOut')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <button
      style={{ ...s.toggle, ...(on ? s.toggleOn : {}) }}
      onClick={onToggle}
      aria-label="Toggle"
    >
      <span style={{
        ...s.thumb,
        transform: on ? 'translateX(22px)' : 'translateX(2px)',
      }} />
    </button>
  )
}

const s = {
  section: { marginBottom: 24 },
  sectionLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: 10,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
  },
  row: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountRow: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: 500,
    color: 'var(--text)',
  },
  divider: {
    height: 1,
    background: 'var(--border)',
    margin: '0 16px',
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    background: 'var(--border-strong)',
    border: 'none',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background .2s',
    flexShrink: 0,
  },
  toggleOn: { background: 'var(--accent)' },
  thumb: {
    position: 'absolute',
    top: 2,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,.2)',
    transition: 'transform .2s',
    display: 'block',
  },
  langRow: {
    padding: '10px 12px',
    display: 'flex',
    gap: 8,
  },
  langBtn: {
    flex: 1,
    padding: '9px 12px',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--muted)',
    cursor: 'pointer',
    transition: 'all .15s',
    fontFamily: "'DM Sans', sans-serif",
  },
  langBtnActive: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: 'var(--accent-text)',
    fontWeight: 700,
  },
  pwForm: {
    padding: '0 16px 14px',
  },
  pwError: {
    fontSize: 12,
    color: 'var(--danger)',
    fontFamily: "'DM Mono', monospace",
    background: 'var(--danger-bg)',
    padding: '8px 10px',
    borderRadius: 6,
    marginBottom: 10,
  },
  pwSuccess: {
    fontSize: 12,
    color: 'var(--success)',
    fontFamily: "'DM Mono', monospace",
    background: 'var(--accent-bg)',
    padding: '8px 10px',
    borderRadius: 6,
    marginBottom: 10,
  },
  pwSaveBtn: {
    flex: 1,
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 8,
    padding: '10px',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--accent-text)',
    cursor: 'pointer',
  },
  pwCancelBtn: {
    flex: 1,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
}

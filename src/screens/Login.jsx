import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../contexts/LanguageContext'

export default function Login() {
  const { t } = useT()
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError(err.message)
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) setError(err.message)
      else setConfirmed(true)
    }

    setLoading(false)
  }

  const switchMode = () => {
    setMode(m => m === 'signin' ? 'signup' : 'signin')
    setError('')
    setConfirmed(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src="/logo.svg" alt="Ultimate Tracker" style={styles.logo} />
        <h1 style={styles.title}>
          {t('login.title').split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </h1>
        <p style={styles.sub}>{t('login.sub')}</p>

        {confirmed ? (
          <p style={styles.successMsg}>{t('login.confirmationSent')}</p>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div className="field">
              <label>{t('login.email')}</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>{t('login.password')}</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && <p style={styles.errorMsg}>{error}</p>}

            <button type="submit" style={styles.btn} disabled={loading}>
              {loading
                ? (mode === 'signin' ? t('login.signingIn') : t('login.creatingAccount'))
                : (mode === 'signin' ? t('login.signIn') : t('login.signUp'))}
            </button>
          </form>
        )}

        <button style={styles.switchBtn} onClick={switchMode}>
          {mode === 'signin' ? t('login.switchToSignUp') : t('login.switchToSignIn')}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px',
    background: 'var(--bg)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '40px 32px',
    boxShadow: 'var(--shadow)',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    display: 'block',
    margin: '0 auto 16px',
  },
  title: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 32,
    letterSpacing: '-.02em',
    lineHeight: 1.1,
    color: 'var(--text)',
    textAlign: 'center',
    marginBottom: 4,
  },
  sub: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: '.12em',
    color: 'var(--muted)',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  errorMsg: {
    marginTop: 10,
    fontSize: 13,
    color: 'var(--danger)',
    fontFamily: "'DM Mono', monospace",
    background: 'var(--danger-bg)',
    padding: '8px 12px',
    borderRadius: 8,
  },
  successMsg: {
    fontSize: 13,
    color: 'var(--success)',
    fontFamily: "'DM Mono', monospace",
    background: 'var(--accent-bg)',
    padding: '12px',
    borderRadius: 8,
    lineHeight: 1.5,
    marginBottom: 16,
  },
  btn: {
    marginTop: 20,
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '13px',
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--accent-text)',
    letterSpacing: '.02em',
    transition: 'opacity .2s',
    cursor: 'pointer',
  },
  switchBtn: {
    marginTop: 20,
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    fontSize: 13,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '.02em',
    textDecoration: 'underline',
  },
}

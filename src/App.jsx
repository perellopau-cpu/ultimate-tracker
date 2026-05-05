import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from './lib/supabase'
import { useTheme } from './hooks/useTheme'
import { fmtKey, todayKey, emptyDay, BLOCKS, ordinalDate } from './lib/utils'
import { useT } from './contexts/LanguageContext'
import Login from './screens/Login'
import Home from './screens/Home'
import Settings from './screens/Settings'
import SleepLog from './screens/blocks/SleepLog'
import NutritionLog from './screens/blocks/NutritionLog'
import ExerciseLog from './screens/blocks/ExerciseLog'
import FormationLog from './screens/blocks/FormationLog'
import VicesLog from './screens/blocks/VicesLog'
import Dashboard from './screens/Dashboard'
import './styles/globals.css'

// ── Save indicator ────────────────────────────────────────────────────
function SaveIndicator({ status }) {
  const { t } = useT()
  if (status === 'idle') return null
  return (
    <div className={`save-indicator ${status === 'saved' ? 'saved' : ''}`}>
      {status === 'saving' && t('save.saving')}
      {status === 'saved'  && t('save.saved')}
      {status === 'error'  && t('save.error')}
    </div>
  )
}

// ── Log screen wrapper ────────────────────────────────────────────────
const BLOCK_LABEL_KEY = {
  sleep: 'block.sleep', nutrition: 'block.nutrition',
  exercise: 'block.exercise', formation: 'block.formation', vices: 'block.vices',
}

function LogScreen({ block, dayData, date, isToday, userId, onBack, onSave, lastWeight }) {
  const { t, lang } = useT()
  const b = BLOCKS.find(b => b.id === block)
  const val = dayData[block]

  return (
    <div className="screen">
      <div className="log-header">
        <button className="back-btn" onClick={onBack}>‹</button>
        <div>
          <div className="log-title">{b.emoji} {t(BLOCK_LABEL_KEY[block])}</div>
        </div>
      </div>

      <SaveIndicator status={onSave.status} />

      <div className={`date-badge ${isToday ? 'today' : ''}`}>
        {isToday ? '● Today' : `● ${ordinalDate(date, lang)}`}
      </div>

      {block === 'sleep'     && <SleepLog     val={val} onChange={v => onSave.update(block, v)} />}
      {block === 'nutrition' && <NutritionLog  val={val} onChange={v => onSave.update(block, v)} lastWeight={lastWeight} />}
      {block === 'exercise'  && <ExerciseLog   val={val} onChange={v => onSave.update(block, v)} />}
      {block === 'formation' && <FormationLog  val={val} onChange={v => onSave.update(block, v)} />}
      {block === 'vices'     && <VicesLog      val={val} onChange={v => onSave.update(block, v)} />}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────
export default function App() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useT()
  const [session, setSession]       = useState(undefined)
  const [screen, setScreen]         = useState('home')
  const [activeBlock, setActiveBlock] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [allData, setAllData]       = useState({})
  const [dataLoading, setDataLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle')
  const saveTimer = useRef(null)

  // ── Auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN') setScreen('home')
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Load logs ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) { setDataLoading(false); return }
    const fetchLogs = async () => {
      setDataLoading(true)
      const { data, error } = await supabase
        .from('daily_logs')
        .select('date, sleep, nutrition, exercise, formation, vices')
        .eq('user_id', session.user.id)
      if (!error && data) {
        const map = {}
        data.forEach(row => {
          map[row.date] = {
            sleep:     row.sleep     || emptyDay().sleep,
            nutrition: row.nutrition || emptyDay().nutrition,
            exercise:  row.exercise  || emptyDay().exercise,
            formation: row.formation || emptyDay().formation,
            vices:     row.vices     || emptyDay().vices,
          }
        })
        setAllData(map)
      }
      setDataLoading(false)
    }
    fetchLogs()
  }, [session])

  // ── Last known weight (for placeholder pre-fill) ─────────────────────
  const lastWeight = useMemo(() => {
    const currentKey = fmtKey(selectedDate)
    const keys = Object.keys(allData).sort().reverse()
    for (const k of keys) {
      if (k === currentKey) continue
      const w = allData[k]?.nutrition?.weight
      if (w) return w
    }
    return ''
  }, [allData, selectedDate])

  // ── Auto-save ─────────────────────────────────────────────────────
  const updateBlock = useCallback((block, val) => {
    const dateKey = fmtKey(selectedDate)

    // Optimistic update
    setAllData(prev => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || emptyDay()), [block]: val },
    }))

    // Debounced Supabase upsert
    clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from('daily_logs')
        .upsert(
          { user_id: session.user.id, date: dateKey, [block]: val },
          { onConflict: 'user_id,date' }
        )
      setSaveStatus(error ? 'error' : 'saved')
      if (!error) setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
  }, [selectedDate, session])

  // ── Loading / auth gates ──────────────────────────────────────────
  if (session === undefined || dataLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--muted)' }}>Loading…</span>
      </div>
    )
  }

  if (!session) return <Login />

  const dateKey  = fmtKey(selectedDate)
  const dayData  = allData[dateKey] || emptyDay()
  const loggedDates = new Set(Object.keys(allData))
  const isToday  = todayKey() === dateKey

  const openBlock = (id) => { setSaveStatus('idle'); setActiveBlock(id); setScreen('log') }
  const goHome    = () => { setScreen('home'); setActiveBlock(null) }

  const saveHandle = { status: saveStatus, update: updateBlock }

  return (
    <div className="app">
      {screen === 'home' && (
        <Home
          selectedDate={selectedDate}
          onSelectDate={(d) => { setSelectedDate(d); setScreen('home') }}
          dayData={dayData}
          loggedDates={loggedDates}
          onOpenBlock={openBlock}
        />
      )}

      {screen === 'log' && activeBlock && (
        <LogScreen
          block={activeBlock}
          dayData={dayData}
          date={selectedDate}
          isToday={isToday}
          userId={session.user.id}
          onBack={goHome}
          onSave={saveHandle}
          lastWeight={lastWeight}
        />
      )}

      {screen === 'dashboard' && (
        <Dashboard allData={allData} />
      )}

      {screen === 'settings' && (
        <Settings theme={theme} onToggleTheme={toggleTheme} onBack={goHome} />
      )}

      {screen !== 'settings' && (
        <nav className="nav">
          <button
            className={`nav-btn ${screen === 'home' || screen === 'log' ? 'active' : ''}`}
            onClick={goHome}
          >
            <span>⊞</span><span className="label">{t('nav.log')}</span>
          </button>
          <button
            className={`nav-btn ${screen === 'dashboard' ? 'active' : ''}`}
            onClick={() => setScreen('dashboard')}
          >
            <span>◈</span><span className="label">{t('nav.stats')}</span>
          </button>
          <button className="nav-btn" onClick={() => setScreen('settings')}>
            <span>⚙</span><span className="label">{t('nav.settings')}</span>
          </button>
        </nav>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from './lib/supabase'
import { useTheme } from './hooks/useTheme'
import { fmtKey, todayKey, emptyDay, BLOCKS, ordinalDate } from './lib/utils'
import { useT } from './contexts/LanguageContext'

// ── Offline helpers ───────────────────────────────────────────────────
const CACHE_KEY = 'ut_offline_data'
const QUEUE_KEY = 'ut_offline_queue'

const loadCachedData  = ()    => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} } }
const saveCachedData  = (d)   => localStorage.setItem(CACHE_KEY, JSON.stringify(d))
const loadQueue       = ()    => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] } }
const saveQueue       = (q)   => localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
import Login from './screens/Login'
import Home from './screens/Home'
import Settings from './screens/Settings'
import SleepLog from './screens/blocks/SleepLog'
import NutritionLog from './screens/blocks/NutritionLog'
import ExerciseLog from './screens/blocks/ExerciseLog'
import FormationLog from './screens/blocks/FormationLog'
import VicesLog from './screens/blocks/VicesLog'
import Dashboard from './screens/Dashboard'
import Challenges from './screens/Challenges'
import './styles/globals.css'

// ── Save indicator ────────────────────────────────────────────────────
function SaveIndicator({ status }) {
  const { t } = useT()
  if (status === 'idle') return null
  return (
    <div className={`save-indicator ${status === 'saved' ? 'saved' : ''}`}>
      {status === 'saving' && t('save.saving')}
      {status === 'saved'  && t('save.saved')}
      {status === 'queued' && t('save.queued')}
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

      // Offline: serve from local cache immediately
      if (!navigator.onLine) {
        setAllData(loadCachedData())
        setDataLoading(false)
        return
      }

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
        saveCachedData(map)       // keep local cache fresh
      } else {
        setAllData(loadCachedData()) // network error → fall back to cache
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

    // Optimistic update + always persist locally
    setAllData(prev => {
      const next = { ...prev, [dateKey]: { ...(prev[dateKey] || emptyDay()), [block]: val } }
      saveCachedData(next)
      return next
    })

    // Debounced Supabase upsert (or queue if offline)
    clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(async () => {
      if (!navigator.onLine) {
        // Deduplicate queue: keep only latest value per block+date
        const q = loadQueue().filter(i => !(i.dateKey === dateKey && i.block === block))
        saveQueue([...q, { dateKey, block, val }])
        setSaveStatus('queued')
        return
      }
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

  // ── Flush offline queue when connection returns ────────────────────
  useEffect(() => {
    if (!session) return
    const syncQueue = async () => {
      const q = loadQueue()
      if (!q.length) return
      setSaveStatus('saving')
      const failed = []
      for (const item of q) {
        const { error } = await supabase
          .from('daily_logs')
          .upsert(
            { user_id: session.user.id, date: item.dateKey, [item.block]: item.val },
            { onConflict: 'user_id,date' }
          )
        if (error) failed.push(item)
      }
      saveQueue(failed)
      setSaveStatus(failed.length ? 'error' : 'saved')
      if (!failed.length) setTimeout(() => setSaveStatus('idle'), 2000)
    }
    window.addEventListener('online', syncQueue)
    return () => window.removeEventListener('online', syncQueue)
  }, [session])

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

      {screen === 'challenges' && <Challenges session={session} />}

      {(
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
          <button
            className={`nav-btn ${screen === 'challenges' ? 'active' : ''}`}
            onClick={() => setScreen('challenges')}
          >
            <span>◎</span><span className="label">{t('nav.challenges')}</span>
          </button>
          <button className="nav-btn" onClick={() => setScreen('settings')}>
            <span>⊙</span><span className="label">{t('nav.settings')}</span>
          </button>
        </nav>
      )}
    </div>
  )
}

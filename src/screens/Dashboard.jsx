import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, ComposedChart, Line, LineChart,
  XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { useT } from '../contexts/LanguageContext'
import { fmtKey, calcHoursSlept, emptyDay } from '../lib/utils'

// ── Constants ─────────────────────────────────────────────────────────
const PERIOD_DAYS = { '7d': 7, '28d': 28, '3m': 91, '1y': 365 }
const CHART_BASE  = 21  // Y-axis starts at 21:00 (9 pm)

// Exercise colours
const EX_COLOR = {
  push: 'var(--exercise)', pull: 'var(--exercise)', leg: 'var(--exercise)',
  rest: '#f5c842',
  run: 'var(--nutrition)', cycling: 'var(--nutrition)',
}

// ── Helpers ───────────────────────────────────────────────────────────
function getDays(n, period, offset) {
  if (period === '7d') {
    // Calendar Mon→Sun weeks: offset=0 = current week, offset=1 = last week, etc.
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dow = today.getDay() // 0=Sun, 1=Mon … 6=Sat
    const sun = new Date(today)
    sun.setDate(today.getDate() + (dow === 0 ? 0 : 7 - dow) - offset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sun)
      d.setDate(sun.getDate() - 6 + i)
      return { key: fmtKey(d), date: d }
    })
  }
  // Rolling window for other periods
  const end = new Date()
  end.setDate(end.getDate() - offset * n)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end)
    d.setDate(end.getDate() - (n - 1 - i))
    return { key: fmtKey(d), date: d }
  })
}

function fmtHours(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function periodRangeLabel(days) {
  if (!days.length) return ''
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(days[0].date)} – ${fmt(days[days.length - 1].date)}`
}

function xLabel(date, period) {
  if (period === '7d')  return date.toLocaleDateString('en-GB', { weekday: 'short' })
  if (period === '28d') return `${date.getDate()}/${date.getMonth() + 1}`
  if (period === '3m')  return `${date.getDate()}/${date.getMonth() + 1}`
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

function labelStep(period) {
  return { '7d': 1, '28d': 4, '3m': 14, '1y': 30 }[period]
}

function getWeekKey(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return fmtKey(d)
}

// Parse iPhone screen time strings → decimal hours (null if unrecognised)
function parseScreenTime(str) {
  if (!str || !str.trim()) return null
  const s = str.trim().toLowerCase()
  const hm = s.match(/(\d+(?:\.\d+)?)\s*h(?:r|ours?)?\s*(?:(\d+)\s*m(?:in)?)?/)
  if (hm) return parseFloat(hm[1]) + (hm[2] ? parseInt(hm[2]) / 60 : 0)
  const m = s.match(/^(\d+(?:\.\d+)?)\s*m(?:in)?$/)
  if (m) return parseFloat(m[1]) / 60
  const h = s.match(/^(\d+(?:\.\d+)?)$/)
  if (h) return parseFloat(h[1])
  return null
}

// Convert "HH:MM" → decimal hours (e.g. "23:30" → 23.5)
function timeToH(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

// Convert decimal offset from CHART_BASE back to "HH:MM" for Y-axis ticks
function offsetToTime(offset) {
  const total = (CHART_BASE + offset) % 24
  const h = Math.floor(total)
  const m = Math.round((total % 1) * 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// ── Shared tooltip style ──────────────────────────────────────────────
const TT = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 12px',
  fontFamily: "'DM Mono', monospace", fontSize: 12,
  color: 'var(--text)', boxShadow: 'var(--shadow-sm)',
}

// ── Chart card ────────────────────────────────────────────────────────
function ChartCard({ emoji, title, sub, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 16px', marginBottom: 14, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{emoji}</span>{title}
      </div>
      {sub && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>{sub}</div>}
      {children}
    </div>
  )
}

// ── Streak dots ───────────────────────────────────────────────────────
function StreakDots({ days, getValue, noColor }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 8 }}>
      {days.map(({ key }) => {
        const v = getValue(key)
        const bg = v === 'yes' ? 'var(--accent)'
          : v === 'no' ? (noColor || 'var(--danger)')
          : 'var(--border)'
        return (
          <div key={key} title={key} style={{
            width: 14, height: 14, borderRadius: 3,
            background: bg,
            opacity: v === 'no' ? 0.7 : 1,
          }} />
        )
      })}
    </div>
  )
}

// ── Stat row ──────────────────────────────────────────────────────────
function StatRow({ stats }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
      {stats.map(s => (
        <div key={s.label} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px 12px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: s.color }}>{s.value}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--muted)', marginTop: 2, letterSpacing: '.06em', textTransform: 'uppercase' }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Period tabs ───────────────────────────────────────────────────────
function PeriodTabs({ period, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
      {[['7d','7D'],['28d','28D'],['3m','3M'],['1y','1Y']].map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} style={{
          flex: 1, padding: '8px',
          background: period === id ? 'var(--accent)' : 'var(--surface2)',
          border: `1px solid ${period === id ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11,
          letterSpacing: '.06em', cursor: 'pointer',
          color: period === id ? 'var(--accent-text)' : 'var(--muted)',
          fontWeight: period === id ? 700 : 400, transition: 'all .15s',
        }}>{label}</button>
      ))}
    </div>
  )
}

// ── Period navigation ─────────────────────────────────────────────────
function PeriodNav({ days, offset, onPrev, onNext }) {
  const navBtn = (disabled) => ({
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 8, width: 32, height: 32, cursor: disabled ? 'default' : 'pointer',
    color: 'var(--text)', fontSize: 16, display: 'flex', alignItems: 'center',
    justifyContent: 'center', opacity: disabled ? 0.3 : 1, transition: 'opacity .15s',
    fontFamily: 'inherit',
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: -8 }}>
      <button style={navBtn(false)} onClick={onPrev}>‹</button>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
        {periodRangeLabel(days)}
      </span>
      <button style={navBtn(offset === 0)} onClick={onNext} disabled={offset === 0}>›</button>
    </div>
  )
}

// ── Sleep floating-bar tooltip ────────────────────────────────────────
function SleepTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d?.bedtime) return null
  return (
    <div style={TT}>
      <div style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 4 }}>{d.dayLabel}</div>
      <div>🌙 {d.bedtime} → {d.waketime}</div>
      <div style={{ color: 'var(--sleep)', fontWeight: 700, marginTop: 2 }}>{d.hoursLabel}</div>
    </div>
  )
}

// ── Nutrition dual-axis tooltip ───────────────────────────────────────
function NutritionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TT}>
      <div style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 4 }}>{label}</div>
      {payload.map(p => p.value != null && (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.dataKey === 'kg' ? `${p.value} kg` : `${p.value} kcal`}
        </div>
      ))}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────
export default function Dashboard({ allData }) {
  const { t } = useT()
  const [period, setPeriod] = useState('7d')
  const [offset, setOffset] = useState(0)
  const [screenTime, setScreenTime] = useState(() => localStorage.getItem(`ut_screen_${getWeekKey(new Date())}`) || '')

  const changePeriod = (p) => { setPeriod(p); setOffset(0) }

  const n    = PERIOD_DAYS[period]
  const days = getDays(n, period, offset)

  // Key for the week currently visible in the 7D view (Monday of that week)
  const viewedWeekKey = period === '7d' ? fmtKey(days[0].date) : getWeekKey(new Date())
  const saveScreenTime = (val) => localStorage.setItem(`ut_screen_${viewedWeekKey}`, val)

  // Sync input whenever the viewed week changes
  useEffect(() => {
    setScreenTime(localStorage.getItem(`ut_screen_${viewedWeekKey}`) || '')
  }, [viewedWeekKey])

  // Build phone screen time chart from all stored weekly entries
  const phoneChartData = useMemo(() => {
    const weeksToShow = { '7d': 7, '28d': 4, '3m': 13, '1y': 52 }[period]
    const result = []
    for (let w = weeksToShow - 1; w >= 0; w--) {
      const d = new Date()
      d.setDate(d.getDate() - w * 7)
      const key  = getWeekKey(d)
      const raw  = localStorage.getItem(`ut_screen_${key}`) || ''
      const hrs  = parseScreenTime(raw)
      const label = new Date(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      result.push({ week: label, hrs, raw })
    }
    return result
  }, [period, screenTime])
  const step = labelStep(period)
  const get  = (key) => allData[key] || emptyDay()

  // ── 1. Sleep floating-bar data ──────────────────────────────────────
  // Each bar spans bedtime → wake time on a clock axis starting at CHART_BASE (20:00)
  const sleepData = days.map(({ key, date }, i) => {
    const s = get(key).sleep
    const xl = i % step === 0 ? xLabel(date, period) : ''
    const dayLabel = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    if (!s.bedtime || !s.waketime) return { x: xl, bottom: null, duration: null, bedtime: null, waketime: null, hoursLabel: null, dayLabel }

    let bed  = timeToH(s.bedtime)
    let wake = timeToH(s.waketime)
    if (wake < bed) wake += 24          // midnight crossing
    if (bed  < CHART_BASE) bed  += 24  // e.g. 2am beds → 26
    if (wake < bed) wake += 24

    const bottom   = bed - CHART_BASE
    const duration = wake - bed
    const hours    = calcHoursSlept(s.bedtime, s.waketime)

    return { x: xl, bottom, duration, bedtime: s.bedtime, waketime: s.waketime, hoursLabel: hours?.label, dayLabel }
  })

  const validSleep  = sleepData.filter(d => d.duration != null)
  const avgSleepDec = validSleep.length ? validSleep.reduce((a, d) => a + d.duration, 0) / validSleep.length : null
  const avgSleepLbl = avgSleepDec
    ? `${Math.floor(avgSleepDec)}h ${Math.round((avgSleepDec % 1) * 60).toString().padStart(2,'0')}m`
    : '—'

  // Y-axis domain: 0 → 15 offset = 21:00 → 12:00 (noon)
  const sleepDomain = [0, 15]
  const sleepTicks  = [0, 3, 6, 9, 12, 15]   // 21:00, 00:00, 03:00, 06:00, 09:00, 12:00

  // ── 2. Nutrition dual-axis data ─────────────────────────────────────
  const nutritionData = days.map(({ key, date }, i) => {
    const nu = get(key).nutrition
    return {
      x:    i % step === 0 ? xLabel(date, period) : '',
      kg:   parseFloat(nu.weight) || null,
      kcal: parseInt(nu.kcal)     || null,
    }
  })
  // Most recent weight across ALL data (not just current period)
  const actualWeight = useMemo(() => {
    const keys = Object.keys(allData).sort().reverse()
    for (const k of keys) {
      const w = parseFloat(allData[k]?.nutrition?.weight)
      if (w) return w
    }
    return null
  }, [allData])

  const suppStreak = (key) => {
    const nu = get(key).nutrition
    if (nu.o3 && nu.zmb6 && nu.creatine) return 'yes'
    if (!nu.o3 && !nu.zmb6 && !nu.creatine) return ''
    return 'no'
  }
  const suppDays = days.filter(({ key }) => suppStreak(key) === 'yes').length

  const fruitvegStreak = (key) => {
    const nu = get(key).nutrition
    const count = (nu.fruitveg1 ? 1 : 0) + (nu.fruitveg2 ? 1 : 0)
    if (count === 2) return 'yes'
    if (count === 1) return 'no'
    return ''
  }
  const fruitvegDays = days.filter(({ key }) => fruitvegStreak(key) === 'yes').length

  // ── 3. Exercise data ────────────────────────────────────────────────
  const exerciseData = days.map(({ key, date }, i) => {
    const type = get(key).exercise.type || ''
    return { x: i % step === 0 ? xLabel(date, period) : '', value: type ? 1 : 0, type }
  })
  const trainingDays = exerciseData.filter(d => d.type && d.type !== 'rest').length
  const typeCounts   = {}
  exerciseData.forEach(d => { if (d.type) typeCounts[d.type] = (typeCounts[d.type] || 0) + 1 })
  const typeBreakdown = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v}× ${k}`).join(' · ')

  // ── 4. Formation data ────────────────────────────────────────────────
  const formationData = days.map(({ key, date }, i) => {
    const f = get(key).formation
    return { x: i % step === 0 ? xLabel(date, period) : '', study: parseInt(f.study) || 0, reading: parseInt(f.reading) || 0 }
  })
  const totalStudy   = formationData.reduce((a, d) => a + d.study,   0)
  const totalReading = formationData.reduce((a, d) => a + d.reading, 0)

  // ── 5. Vices data ────────────────────────────────────────────────────
  const vicesData    = days.map(({ key, date }, i) => {
    const v = get(key).vices
    // backward-compat: old data used v.cigarettes (number), new uses v.cigaretteCount
    const cigs   = parseInt(v.cigaretteCount || v.cigarettes) || 0
    const drinks = v.alcoholCount === '0' ? 0 : parseInt(v.alcoholCount) || 0
    return {
      x: i % step === 0 ? xLabel(date, period) : '',
      cigs,
      drinks,
    }
  })
  const totalCigs   = vicesData.reduce((a, d) => a + d.cigs,   0)
  const totalDrinks = vicesData.reduce((a, d) => a + d.drinks, 0)
  const socialStreak = (key) => {
    const v = get(key).vices.socialMediaUnder30
    return v === true ? 'yes' : v === false ? 'no' : ''
  }

  const hasData = Object.keys(allData).length > 0
  if (!hasData) return (
    <div className="screen">
      <p className="page-title">{t('dash.title')}</p>
      <p className="page-sub">{t('dash.sub')}</p>
      <div className="empty-state"><div className="es-icon">📊</div><p>{t('dash.emptyNoData')}</p></div>
    </div>
  )

  const axisTick = { fontSize: 9, fontFamily: 'DM Mono', fill: 'var(--muted)' }

  return (
    <div className="screen">
      <p className="page-title">{t('dash.title')}</p>
      <p className="page-sub">{t('dash.sub')}</p>

      <PeriodTabs period={period} onChange={changePeriod} />
      <PeriodNav days={days} offset={offset} onPrev={() => setOffset(o => o + 1)} onNext={() => setOffset(o => Math.max(0, o - 1))} />

      <StatRow stats={[
        { label: 'Avg Sleep', value: avgSleepLbl,                          color: 'var(--sleep)'     },
        { label: 'Sessions',  value: trainingDays,                         color: 'var(--exercise)'  },
        { label: 'Study',     value: `${Math.floor(totalStudy / 60)}h`,    color: 'var(--formation)' },
      ]} />

      {/* ── Sleep: floating bar (bedtime → wake time) ── */}
      <ChartCard emoji="🌙" title={t('block.sleep')} sub={`Avg ${avgSleepLbl} · target 7h 30m`}>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={sleepData} margin={{ top: 8, right: 4, left: -10, bottom: 0 }} barCategoryGap="20%">
            <XAxis dataKey="x" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis
              domain={sleepDomain}
              ticks={sleepTicks}
              tickFormatter={offsetToTime}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={46}
            />
            <Tooltip content={<SleepTooltip />} />
            <ReferenceLine y={7.5} stroke="var(--accent)" strokeDasharray="4 3" strokeOpacity={0.4} />
            <Bar dataKey="bottom" stackId="s" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="duration" stackId="s" radius={[4, 4, 4, 4]} isAnimationActive={false}>
              {sleepData.map((d, i) => (
                <Cell key={i} fill={d.duration != null ? 'var(--sleep)' : 'transparent'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div style={{ marginTop: 10, fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
          Wake-up speed ⚡ fast · slow
        </div>
        <StreakDots days={days} getValue={key => {
          const s = get(key).sleep
          if (s.wakeUpSpeed === 'fast') return 'yes'
          if (s.wakeUpSpeed === 'slow') return 'no'
          return ''
        }} />
      </ChartCard>

      {/* ── Nutrition: dual Y-axis (weight + kcal) ── */}
      <ChartCard emoji="⚖️" title={t('block.nutrition')} sub={`Actual weight ${actualWeight != null ? actualWeight + ' kg' : '—'} · goal 80 kg`}>
        <ResponsiveContainer width="100%" height={140}>
          <ComposedChart data={nutritionData} margin={{ top: 8, right: 36, left: -10, bottom: 0 }}>
            <XAxis dataKey="x" tick={axisTick} tickLine={false} axisLine={false} />

            {/* Left Y: weight */}
            <YAxis yAxisId="kg" domain={[70, 80]} ticks={[70, 72, 74, 76, 78, 80]} tick={axisTick} tickLine={false} axisLine={false} width={28} />

            {/* Right Y: kcal */}
            <YAxis yAxisId="kcal" orientation="right" domain={[2400, 3200]} ticks={[2400, 2800, 3200]} tick={axisTick} tickLine={false} axisLine={false} width={34} />

            <Tooltip content={<NutritionTooltip />} />

            {/* Goal line at 80 kg */}
            <ReferenceLine yAxisId="kg" y={80} stroke="var(--nutrition)" strokeDasharray="4 3" strokeOpacity={0.4} />

            {/* Weight line */}
            <Line yAxisId="kg" type="monotone" dataKey="kg"
              stroke="var(--nutrition)" strokeWidth={2}
              dot={{ r: 3, fill: 'var(--nutrition)', strokeWidth: 0 }}
              connectNulls={false} activeDot={{ r: 5 }} />

            {/* Kcal line */}
            <Line yAxisId="kcal" type="monotone" dataKey="kcal"
              stroke="var(--exercise)" strokeWidth={2} strokeDasharray="0"
              dot={{ r: 3, fill: 'var(--exercise)', strokeWidth: 0 }}
              connectNulls={false} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 2, background: 'var(--nutrition)', display: 'inline-block', borderRadius: 2 }} />
            Weight (kg)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 2, background: 'var(--exercise)', display: 'inline-block', borderRadius: 2 }} />
            Kcal
          </span>
        </div>

        <div style={{ marginTop: 12, fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
          Supplements (O3 + ZMB6 + Creatine) — {suppDays}/{days.length} days
        </div>
        <StreakDots days={days} getValue={suppStreak} />

        <div style={{ marginTop: 10, fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
          Fruit &amp; Veg (2 pieces) — {fruitvegDays}/{days.length} days
        </div>
        <StreakDots days={days} getValue={fruitvegStreak} />
      </ChartCard>

      {/* ── Exercise: color-coded bars ── */}
      <ChartCard emoji="💪" title={t('block.exercise')} sub={`${trainingDays} sessions${typeBreakdown ? ' · ' + typeBreakdown : ''}`}>
        {/* Color legend */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--muted)' }}>
          {[['var(--exercise)','Gym'], ['#f5c842','Rest'], ['var(--nutrition)','Cardio']].map(([color, label]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={exerciseData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="x" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 1]} hide />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload
              if (!d?.type) return null
              const isCardio = d.type === 'run' || d.type === 'cycling'
              const isRest   = d.type === 'rest'
              const color    = isCardio ? 'var(--nutrition)' : isRest ? '#f5c842' : 'var(--exercise)'
              return (
                <div style={TT}>
                  <span style={{ color, fontWeight: 700, textTransform: 'capitalize' }}>{d.type}</span>
                </div>
              )
            }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {exerciseData.map((d, i) => {
                const isCardio = d.type === 'run' || d.type === 'cycling'
                const isRest   = d.type === 'rest'
                const fill = !d.type ? 'var(--border)' : isCardio ? 'var(--nutrition)' : isRest ? '#f5c842' : 'var(--exercise)'
                return <Cell key={i} fill={fill} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 12, fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
          Sauna 🧖
        </div>
        <StreakDots
          days={days}
          noColor="#f5c842"
          getValue={key => {
            const r = get(key).exercise.saunaRounds
            if (r === '1' || r === '2' || r === '3') return 'yes'
            if (r === 'no') return 'no'
            return ''
          }}
        />
      </ChartCard>

      {/* ── Formation ── */}
      <ChartCard emoji="📚" title={t('block.formation')} sub={`${fmtHours(totalStudy)} study · ${fmtHours(totalReading)} reading`}>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={formationData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <XAxis dataKey="x" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div style={TT}>
                  <div style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 4 }}>{label}</div>
                  {payload.map(p => (
                    <div key={p.name} style={{ color: p.fill, fontWeight: 600 }}>{p.name}: {p.value}m</div>
                  ))}
                </div>
              )
            }} />
            <Bar dataKey="study"   stackId="a" fill="var(--formation)" radius={[0,0,0,0]} name="Study" />
            <Bar dataKey="reading" stackId="a" fill="var(--formation)" fillOpacity={0.4} radius={[4,4,0,0]} name="Reading" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Vices ── */}
      <ChartCard emoji="🍺" title={t('block.vices')} sub={`${totalCigs} cigs · ${totalDrinks} drinks`}>
        {/* Color legend */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--muted)' }}>
          {[['var(--vices)', 'Cigarettes'], ['#60a5fa', 'Drinks']].map(([color, label]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={vicesData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barCategoryGap="20%">
            <XAxis dataKey="x" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload
              return (
                <div style={TT}>
                  {d.cigs > 0   && <div>🚬 {d.cigs} cigs</div>}
                  {d.drinks > 0 && <div>🍺 {d.drinks} drinks</div>}
                  {d.cigs === 0 && d.drinks === 0 && <div style={{ color: 'var(--muted)' }}>No vices</div>}
                </div>
              )
            }} />
            <Bar dataKey="cigs" radius={[4, 4, 0, 0]}>
              {vicesData.map((d, i) => <Cell key={i} fill={d.cigs === 0 ? 'var(--border)' : 'var(--vices)'} />)}
            </Bar>
            <Bar dataKey="drinks" radius={[4, 4, 0, 0]}>
              {vicesData.map((d, i) => <Cell key={i} fill={d.drinks === 0 ? 'var(--border)' : '#60a5fa'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div style={{ marginTop: 12, fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
          Social media &lt;30 min
        </div>
        <StreakDots days={days} getValue={socialStreak} />

        {/* ── Avg screen time picker ── */}
        {(() => {
          const hrs = parseScreenTime(screenTime) ?? 0
          const curH = Math.min(12, Math.floor(hrs))
          const curM = [0, 15, 30, 45].reduce((p, c) => Math.abs(c - Math.round((hrs % 1) * 60)) < Math.abs(p - Math.round((hrs % 1) * 60)) ? c : p, 0)
          const update = (h, m) => {
            const h2 = Math.max(0, Math.min(12, h))
            const str = h2 === 0 && m === 0 ? '' : m === 0 ? `${h2}h` : h2 === 0 ? `${m}m` : `${h2}h ${m}m`
            setScreenTime(str); saveScreenTime(str)
          }
          const btnStyle = (active) => ({
            padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
            fontFamily: "'DM Mono', monospace", border: '1px solid var(--border)',
            background: active ? 'var(--accent)' : 'var(--surface2)',
            color: active ? 'var(--accent-text)' : 'var(--muted)',
            fontWeight: active ? 700 : 400,
          })
          return (
            <div style={{ marginTop: 14, marginBottom: 4 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                📱 Avg screen time / day
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Hours stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button style={btnStyle(false)} onClick={() => update(curH - 1, curM)}>‹</button>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--text)', minWidth: 28, textAlign: 'center', fontWeight: 600 }}>{curH}h</span>
                  <button style={btnStyle(false)} onClick={() => update(curH + 1, curM)}>›</button>
                </div>
                {/* Minutes buttons */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 15, 30, 45].map(m => (
                    <button key={m} style={btnStyle(curM === m)} onClick={() => update(curH, m)}>
                      {m === 0 ? '00m' : `${m}m`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
        {phoneChartData.filter(d => d.hrs != null).length >= 2 ? (
          <ResponsiveContainer width="100%" height={90}>
            <LineChart data={phoneChartData} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
              <XAxis dataKey="week" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={['auto', 'auto']}
                tickFormatter={v => `${v}h`} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return (
                  <div style={TT}>
                    <div style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 2 }}>{d.week}</div>
                    <div style={{ color: '#60a5fa', fontWeight: 700 }}>
                      {d.raw || `${d.hrs}h`}
                    </div>
                  </div>
                )
              }} />
              <Line type="monotone" dataKey="hrs" stroke="#60a5fa" strokeWidth={2}
                dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }}
                connectNulls={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--muted)', marginTop: 6, textAlign: 'center' }}>
            Log a few weeks to see your trend
          </p>
        )}
      </ChartCard>
    </div>
  )
}

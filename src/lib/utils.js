export const fmtKey = (d) => {
  const date = d instanceof Date ? d : new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const todayKey = () => fmtKey(new Date())

export const calcHoursSlept = (bedtime, waketime) => {
  if (!bedtime || !waketime) return null
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = waketime.split(':').map(Number)
  let mins = (wh * 60 + wm) - (bh * 60 + bm)
  if (mins < 0) mins += 1440
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return { h, m, label: `${h}h ${m.toString().padStart(2, '0')}m` }
}

export const emptyDay = () => ({
  sleep:     { bedtime: '', waketime: '', phone30: null, wakeUpSpeed: null, legsUp: null, breathwork: null, nasalStrip: null, dentalFloss: null, gratitude: null },
  nutrition: { weight: '', kcal: '', o3: false, zmb6: false, creatine: false, fruitveg1: false, fruitveg2: false },
  exercise:  { type: '', km: '', pace: '', saunaRounds: '', cold: null },
  formation: { study: '', reading: '' },
  vices:     { smokeType: null, cigaretteCount: '', cigarettes: '', alcoholCount: '', alcoholType: '', socialMediaUnder30: null },
})

export const completionOf = (block, data) => {
  if (!data) return { done: 0, total: 0 }
  switch (block) {
    case 'sleep': {
      const d = data.sleep
      return {
        done:  (d.bedtime ? 1 : 0)
             + (d.waketime ? 1 : 0)
             + (d.phone30 !== null ? 1 : 0)
             + (d.wakeUpSpeed != null ? 1 : 0)
             + (d.legsUp !== null && d.legsUp !== undefined ? 1 : 0)
             + (d.breathwork !== null && d.breathwork !== undefined ? 1 : 0)
             + (d.nasalStrip !== null && d.nasalStrip !== undefined ? 1 : 0)
             + (d.dentalFloss !== null && d.dentalFloss !== undefined ? 1 : 0)
             + (d.gratitude !== null && d.gratitude !== undefined ? 1 : 0),
        total: 9,
      }
    }
    case 'nutrition': {
      const d = data.nutrition
      const ticks = [d.o3, d.zmb6, d.creatine, d.fruitveg1, d.fruitveg2].filter(Boolean).length
      return {
        done: (d.weight ? 1 : 0) + (ticks > 0 ? 1 : 0),
        total: 2,
      }
    }
    case 'exercise': {
      const d = data.exercise
      return {
        done: (d.type ? 1 : 0) + (d.saunaRounds ? 1 : 0) + (d.cold !== null && d.cold !== undefined ? 1 : 0),
        total: 3,
      }
    }
    case 'formation': {
      const d = data.formation
      return {
        done: (d.study ? 1 : 0) + (d.reading ? 1 : 0),
        total: 2,
      }
    }
    case 'vices': {
      const d = data.vices
      // backward-compat: old data has d.cigarettes, new has d.smokeType
      const smokedFilled = (d.smokeType != null) || (d.cigarettes != null && d.cigarettes !== '')
      return {
        done: (smokedFilled ? 1 : 0) + (d.alcoholCount !== '' && d.alcoholCount != null ? 1 : 0) + (d.socialMediaUnder30 !== null ? 1 : 0),
        total: 3,
      }
    }
    default: return { done: 0, total: 0 }
  }
}

export const BLOCKS = [
  { id: 'sleep',     label: 'Sleep',     emoji: '🌙' },
  { id: 'nutrition', label: 'Nutrition', emoji: '🥗' },
  { id: 'exercise',  label: 'Exercise',  emoji: '💪' },
  { id: 'formation', label: 'Formation', emoji: '📚' },
  { id: 'vices',     label: 'Vices',     emoji: '🍺' },
]

export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const DAY_NAMES_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa']

export function ordinalDate(date, lang = 'en') {
  const n = date.getDate()
  if (lang === 'es') {
    const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' })
    const month   = date.toLocaleDateString('es-ES', { month: 'long' })
    // Capitalise weekday
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${n} de ${month}`
  }
  const suffix = ['th','st','nd','rd']
  const v = n % 100
  const s = suffix[(v - 20) % 10] || suffix[v] || suffix[0]
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const month   = date.toLocaleDateString('en-US', { month: 'long' })
  return `${weekday}, ${month} ${n}${s}`
}

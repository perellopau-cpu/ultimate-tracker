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
  sleep:     { bedtime: '', waketime: '', phone30: null },
  nutrition: { weight: '', kcal: '', o3: false, zmb6: false, creatine: false, fruitveg1: false, fruitveg2: false },
  exercise:  { type: '', km: '', pace: '', saunaRounds: '', saunaTime: '' },
  formation: { study: '', reading: '' },
  vices:     { cigarettes: '', alcoholCount: '', alcoholType: '', socialMediaUnder30: null },
})

export const completionOf = (block, data) => {
  if (!data) return { done: 0, total: 0 }
  switch (block) {
    case 'sleep': {
      const d = data.sleep
      return {
        done: (d.bedtime ? 1 : 0) + (d.waketime ? 1 : 0) + (d.phone30 !== null ? 1 : 0),
        total: 3,
      }
    }
    case 'nutrition': {
      const d = data.nutrition
      const ticks = [d.o3, d.zmb6, d.creatine, d.fruitveg1, d.fruitveg2].filter(Boolean).length
      return {
        done: (d.weight ? 1 : 0) + (d.kcal ? 1 : 0) + (ticks > 0 ? 1 : 0),
        total: 3,
      }
    }
    case 'exercise': {
      const d = data.exercise
      return {
        done: (d.type ? 1 : 0) + (d.saunaRounds || d.saunaTime ? 1 : 0),
        total: 2,
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
      return {
        done: (d.cigarettes !== '' ? 1 : 0) + (d.alcoholCount !== '' ? 1 : 0) + (d.socialMediaUnder30 !== null ? 1 : 0),
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

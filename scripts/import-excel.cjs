/**
 * Import historical Excel data into Supabase daily_logs.
 * Usage: node scripts/import-excel.cjs your@email.com yourpassword [--dry-run]
 */

const XLSX  = require('xlsx')
const path  = require('path')
const fs    = require('fs')
const { createClient } = require('@supabase/supabase-js')

// ── Load env ────────────────────────────────────────────────────────────
const envRaw = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const env = {}
envRaw.split('\n').forEach(l => {
  const [k, ...v] = l.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
})
const SUPABASE_URL = env['VITE_SUPABASE_URL']
const SUPABASE_KEY = env['VITE_SUPABASE_ANON_KEY']

const email   = process.argv[2]
const password = process.argv[3]
const DRY_RUN  = process.argv.includes('--dry-run')

if (!email || !password) {
  console.error('Usage: node scripts/import-excel.cjs email password [--dry-run]')
  process.exit(1)
}

// ── Helpers ─────────────────────────────────────────────────────────────

// Excel serial → "YYYY-MM-DD"
function excelToDate(serial) {
  const d = new Date((serial - 25569) * 86400 * 1000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Fraction-of-day → "HH:MM"
function fracToTime(frac) {
  if (frac === '' || frac === null || frac === undefined) return ''
  const mins = Math.round(frac * 24 * 60)
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

// Time value → minutes (handles fractions AND raw minute values)
function toMinutes(val) {
  if (!val || val === '-' || val === '') return 0
  if (typeof val === 'number') {
    if (val > 1) return Math.round(val)         // e.g. 35 → 35 min
    return Math.round(val * 24 * 60)            // e.g. 0.0208 → 30 min
  }
  return 0
}

// Alcohol string → total drink count
function parseAlcohol(val) {
  if (!val || val === 0 || val === '-' || val === '') return 0
  if (typeof val === 'number') return Math.round(val)
  const str = String(val)
  const nums = str.match(/\d+(?:[.,]\d+)?/g) || []
  const sum  = nums.reduce((a, n) => a + parseFloat(n.replace(',', '.')), 0)
  if (sum > 0) return Math.round(sum)
  // standalone letters with no numbers (e.g. "V") = 1 per letter group
  const groups = (str.match(/[a-zA-Z]+/g) || []).length
  return groups
}

// Cigarettes → number
function parseCigs(val) {
  if (!val || val === 0 || val === '-' || val === '') return 0
  if (typeof val === 'number') return Math.round(val)
  const m = String(val).match(/\d+/)
  return m ? parseInt(m[0]) : 0
}

// Supplements "SSS" → {o3, zmb6, creatine}
function parseSupps(val) {
  if (!val || val === '-' || val === '' || typeof val !== 'string') {
    return { o3: false, zmb6: false, creatine: false }
  }
  const s = val.toUpperCase()
  return { o3: s[0] === 'S', zmb6: s[1] === 'S', creatine: s[2] === 'S' }
}

// Social media <30 min: "Si"→true, "No"→false, fraction→check if <30 min, 0→null
function parseSM(val) {
  if (val === '' || val === null || val === undefined || val === '-') return null
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'si') return true
    if (val.toLowerCase() === 'no') return false
    return null
  }
  if (typeof val === 'number') {
    if (val === 0) return null
    return (val * 24 * 60) < 30  // fraction → minutes → check threshold
  }
  return null
}

// Exercise type → app enum
function parseExType(val) {
  if (!val || val === '-' || val === '' || typeof val === 'number') return ''
  const s = String(val).toLowerCase()
  if (s.includes('pull')) return 'pull'
  if (s.includes('leg') || s.includes('cames')) return 'leg'
  if (s.includes('bici') || s.includes('cycling')) return 'cycling'
  if (s.match(/\d[,.]?\d*\s*k(?:m|'|\s|$)/) || s.includes('run') || s.includes('hit')) return 'run'
  if (s.includes('push') || s.includes('força') || s.includes('forca') ||
      s.includes('4th day') || s.includes('fullbody') || s.includes('flexions') ||
      s.includes('bombeo') || s.includes('gym') || s.includes('abs') ||
      s.includes('pit') || s.includes('cardio bici') === false && s.includes('cardio') === false) {
    // if it's not cycling/run/rest and has gym-like words, it's push
    if (s.includes('força') || s.includes('forca') || s.includes('4th day') ||
        s.includes('fullbody') || s.includes('flexions') || s.includes('bombeo') ||
        s.includes('gym') || s.includes('push')) return 'push'
  }
  if (s.includes('rest') || s.includes('descans')) return 'rest'
  // default for unknown gym-like entries
  if (s.length > 1 && s !== '-') return 'push'
  return ''
}

// km from run string
function parseKm(val) {
  if (!val || typeof val !== 'string') return ''
  const m = val.match(/(\d+[,.]?\d*)\s*k(?:m)?/i)
  if (m) return String(parseFloat(m[1].replace(',', '.')))
  return ''
}

// pace "5'51" → "5:51"
function parsePace(val) {
  if (!val || typeof val !== 'string') return ''
  const m = val.match(/(\d+)'(\d+)/)
  if (m) return `${m[1]}:${m[2]}`
  return ''
}

// Sauna: "10 - 10" → rounds=2, time=10
function parseSauna(val) {
  if (!val || val === '-' || val === '' || (typeof val === 'number' && val > 40000)) {
    return { saunaRounds: '', saunaTime: '' }
  }
  if (typeof val === 'number') {
    return { saunaRounds: '1', saunaTime: String(Math.round(val)) }
  }
  const str = String(val)
  const dashes = (str.match(/-/g) || []).length
  const nums = str.match(/\d+/)
  if (!nums) return { saunaRounds: '', saunaTime: '' }
  return { saunaRounds: String(dashes + 1), saunaTime: nums[0] }
}

// Weight
function parseWeight(val) {
  if (!val || val === '-' || val === '') return ''
  if (typeof val === 'number' && val > 40000) return ''  // Excel date leak
  const n = parseFloat(String(val).replace(',', '.'))
  if (isNaN(n) || n < 30 || n > 250) return ''
  return String(n)
}

// Kcal
function parseKcal(val) {
  if (!val || val === '-' || val === '') return ''
  const n = parseInt(String(val))
  if (isNaN(n) || n < 200 || n > 15000) return ''
  return String(n)
}

// Skip empty rows
function isEmpty(r, ...cols) {
  return cols.every(c => !r[c] || r[c] === '-' || r[c] === '' || r[c] === 0)
}

// ── Sheet parsers ────────────────────────────────────────────────────────

// Desembre25 / Gener26 (old format, no supps, no bedtime)
// cols: 0=date, 1=sleep_h, 2=quality, 3=exercise, 4=sauna, 5=weight, 6=kcal,
//       7=study, 8=reading, 9=med, 10=journal, 11=cigs, 12=alcohol, 13=dental, [14=NF, 15=supps?]
function parseOldFormat(rows, dataStart) {
  const out = []
  for (let i = dataStart; i < rows.length; i++) {
    const r = rows[i]
    if (typeof r[0] !== 'number' || r[0] < 40000 || r[0] > 50000) continue
    if (isEmpty(r, 1, 3, 5, 6, 7, 11, 12)) continue

    const exStr  = String(r[3] || '')
    const sauna  = parseSauna(r[4])
    // Supps may appear in col 15 for some Gener26 rows
    const supps  = r[15] && typeof r[15] === 'string' && /^[SsNn]{3}/.test(r[15])
      ? parseSupps(r[15])
      : { o3: false, zmb6: false, creatine: false }

    out.push({
      date: excelToDate(r[0]),
      sleep:     { bedtime: '', waketime: '', phone30: null },
      nutrition: { weight: parseWeight(r[5]), kcal: parseKcal(r[6]), ...supps, fruitveg1: false, fruitveg2: false },
      exercise:  { type: parseExType(r[3]), km: parseKm(exStr), pace: parsePace(exStr), ...sauna },
      formation: { study: String(toMinutes(r[7])), reading: String(toMinutes(r[8])) },
      vices:     { cigarettes: String(parseCigs(r[11])), alcohol: String(parseAlcohol(r[12])), alcoholType: '', socialMediaUnder30: null },
    })
  }
  return out
}

// Febrer26 / Març26
// cols: 0=date, 1=sleep_h, 2=quality, 3=wake_8am, 4=exercise, 5=sauna, 6=weight,
//       7=kcal, 8=supps, 9=study, 10=reading, 11=cigs, 12=alcohol, 13=dental,
//       14=no_screen+1h, 15=no_screen-1h, 16=sm30, 17=nf
function parseFebMarFormat(rows, dataStart) {
  const out = []
  for (let i = dataStart; i < rows.length; i++) {
    const r = rows[i]
    if (typeof r[0] !== 'number' || r[0] < 40000 || r[0] > 50000) continue
    if (isEmpty(r, 1, 4, 6, 7, 9, 11, 12)) continue

    const exStr = String(r[4] || '')
    const sauna = parseSauna(r[5])

    // Calculate bedtime from wake time and sleep duration
    let bedtime = '', waketime = ''
    if (typeof r[3] === 'number' && r[3] > 0 && r[3] < 1 && r[1]) {
      waketime = fracToTime(r[3])
      let bedFrac = r[3] - r[1]
      if (bedFrac < 0) bedFrac += 1
      bedtime = fracToTime(bedFrac)
    }

    out.push({
      date: excelToDate(r[0]),
      sleep:     { bedtime, waketime, phone30: null },
      nutrition: { weight: parseWeight(r[6]), kcal: parseKcal(r[7]), ...parseSupps(r[8]), fruitveg1: false, fruitveg2: false },
      exercise:  { type: parseExType(r[4]), km: parseKm(exStr), pace: parsePace(exStr), ...sauna },
      formation: { study: String(toMinutes(r[9])), reading: String(toMinutes(r[10])) },
      vices:     { cigarettes: String(parseCigs(r[11])), alcohol: String(parseAlcohol(r[12])), alcoholType: '', socialMediaUnder30: parseSM(r[16]) },
    })
  }
  return out
}

// Abril26
// cols: 0=date, 1=bedtime, 2=waketime, 3=sleep_h, 4=exercise, 5=sauna, 6=weight,
//       7=kcal, 8=supps, 9=study, 10=reading, 11=cigs, 12=alcohol,
//       13=no_screen+30, 14=sm30, 15=dental, 16=cold_shower, 17=nf
function parseAprilFormat(rows, dataStart) {
  const out = []
  for (let i = dataStart; i < rows.length; i++) {
    const r = rows[i]
    if (typeof r[0] !== 'number' || r[0] < 40000 || r[0] > 50000) continue
    if (isEmpty(r, 1, 2, 4, 6, 7, 9, 11, 12)) continue

    const exStr = String(r[4] || '')
    const sauna = parseSauna(r[5])
    const bedtime  = (typeof r[1] === 'number' && r[1] > 0) ? fracToTime(r[1]) : ''
    const waketime = (typeof r[2] === 'number' && r[2] > 0) ? fracToTime(r[2]) : ''

    out.push({
      date: excelToDate(r[0]),
      sleep:     { bedtime, waketime, phone30: null },
      nutrition: { weight: parseWeight(r[6]), kcal: parseKcal(r[7]), ...parseSupps(r[8]), fruitveg1: false, fruitveg2: false },
      exercise:  { type: parseExType(r[4]), km: parseKm(exStr), pace: parsePace(exStr), ...sauna },
      formation: { study: String(toMinutes(r[9])), reading: String(toMinutes(r[10])) },
      vices:     { cigarettes: String(parseCigs(r[11])), alcohol: String(parseAlcohol(r[12])), alcoholType: '', socialMediaUnder30: parseSM(r[14]) },
    })
  }
  return out
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const wb = XLSX.readFile('C:/Users/Pau/Downloads/Ultimate tracking.xlsx')

  const allRecords = []

  // Desembre25 — 3 header rows before data
  {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Desembre25'], { header: 1, defval: '' })
    allRecords.push(...parseOldFormat(rows, 3))
  }

  // Gener26 — 4 header rows before data
  {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Gener26'], { header: 1, defval: '' })
    allRecords.push(...parseOldFormat(rows, 4))
  }

  // Febrer26 — 2 header rows before data
  {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Febrer26'], { header: 1, defval: '' })
    allRecords.push(...parseFebMarFormat(rows, 2))
  }

  // Març26 — 2 header rows before data
  {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Març26'], { header: 1, defval: '' })
    allRecords.push(...parseFebMarFormat(rows, 2))
  }

  // Abril26 — 2 header rows before data
  {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Abril26'], { header: 1, defval: '' })
    allRecords.push(...parseAprilFormat(rows, 2))
  }

  // Dedup by date (later sheets win)
  const byDate = {}
  allRecords.forEach(r => { byDate[r.date] = r })
  const records = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))

  console.log(`\n✓ Parsed ${records.length} days of data`)
  console.log(`  Date range: ${records[0]?.date} → ${records[records.length - 1]?.date}`)

  // Preview sample
  console.log('\nSample (first 3 records):')
  records.slice(0, 3).forEach(r => {
    console.log(`  ${r.date}: sleep(${r.sleep.bedtime}→${r.sleep.waketime}) ex=${r.exercise.type} w=${r.nutrition.weight} kcal=${r.nutrition.kcal} cigs=${r.vices.cigarettes} drinks=${r.vices.alcohol} study=${r.formation.study}m`)
  })
  console.log('\nSample (last 3 records):')
  records.slice(-3).forEach(r => {
    console.log(`  ${r.date}: sleep(${r.sleep.bedtime}→${r.sleep.waketime}) ex=${r.exercise.type} w=${r.nutrition.weight} kcal=${r.nutrition.kcal} cigs=${r.vices.cigarettes} drinks=${r.vices.alcohol} study=${r.formation.study}m`)
  })

  if (DRY_RUN) {
    console.log('\n⚠  Dry run — nothing written to Supabase.')
    return
  }

  // Sign in
  console.log('\nSigning in to Supabase…')
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
  if (authErr || !session) {
    console.error('Auth failed:', authErr?.message)
    process.exit(1)
  }
  console.log('✓ Signed in as', session.user.email)

  // Upsert in batches of 50
  const userId = session.user.id
  const rows   = records.map(r => ({
    user_id:   userId,
    date:      r.date,
    sleep:     r.sleep,
    nutrition: r.nutrition,
    exercise:  r.exercise,
    formation: r.formation,
    vices:     r.vices,
  }))

  const BATCH = 50
  let imported = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('daily_logs')
      .upsert(batch, { onConflict: 'user_id,date' })
    if (error) {
      console.error(`Batch ${i}–${i + BATCH} failed:`, error.message)
      process.exit(1)
    }
    imported += batch.length
    process.stdout.write(`\r  Imported ${imported}/${rows.length} rows…`)
  }
  console.log(`\n✓ Done! ${imported} days imported successfully.`)
}

main().catch(err => { console.error(err); process.exit(1) })

const XLSX = require('xlsx')
const wb = XLSX.readFile('C:/Users/Pau/Downloads/Ultimate tracking.xlsx')

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  // Find actual data rows (where col 0 is a number > 40000 = Excel date)
  const dataRows = rows.filter(r => typeof r[0] === 'number' && r[0] > 40000)
  console.log(`\n=== ${name}: ${dataRows.length} data rows ===`)
  console.log('Headers row:')
  // Find the header row (last row before first data row)
  const firstDataIdx = rows.findIndex(r => typeof r[0] === 'number' && r[0] > 40000)
  if (firstDataIdx > 0) console.log('  ', JSON.stringify(rows[firstDataIdx - 1]))
  console.log('Sample rows:')
  dataRows.slice(0, 5).forEach(r => console.log('  ', JSON.stringify(r)))
  if (dataRows.length > 5) {
    console.log('  ...')
    dataRows.slice(-3).forEach(r => console.log('  ', JSON.stringify(r)))
  }
  // Check unique exercise values
  const exCol = name === 'Abril26' ? 4 : (name === 'Febrer26' || name === 'Març26') ? 4 : 3
  const exercises = [...new Set(dataRows.map(r => r[exCol]).filter(Boolean))]
  console.log('Exercise values:', exercises.slice(0, 20))
  // Check unique alcohol values
  const alcCol = name === 'Abril26' ? 12 : (name === 'Febrer26' || name === 'Març26') ? 12 : 12
  const alcs = [...new Set(dataRows.map(r => r[alcCol]).filter(v => v !== 0 && v !== ''))]
  console.log('Alcohol values:', alcs.slice(0, 20))
})

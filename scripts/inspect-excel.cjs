const XLSX = require('xlsx')

const wb = XLSX.readFile('C:/Users/Pau/Downloads/Ultimate tracking.xlsx')
console.log('Sheets:', wb.SheetNames)

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  console.log(`\n=== Sheet: ${name} (${rows.length} rows) ===`)
  // Print first 5 rows to see headers and sample data
  rows.slice(0, 8).forEach((row, i) => {
    console.log(`Row ${i}: ${JSON.stringify(row)}`)
  })
  if (rows.length > 8) {
    console.log(`... (${rows.length - 8} more rows)`)
    // Print last 2 rows
    rows.slice(-2).forEach((row, i) => {
      console.log(`Row ${rows.length - 2 + i}: ${JSON.stringify(row)}`)
    })
  }
})

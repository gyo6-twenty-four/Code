export function delimitedText(rows, separator = ',') {
  return '\uFEFF' + rows.map(row => row.map(value => {
    const raw = String(value ?? '')
    const text = /^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw
    return '"' + text.replaceAll('"', '""') + '"'
  }).join(separator)).join('\r\n')
}
export function downloadDelimited(filename, rows, separator = ',') {
  const type = separator === '\t' ? 'text/tab-separated-values' : 'text/csv'
  const url = URL.createObjectURL(new Blob([delimitedText(rows, separator)], { type: `${type};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

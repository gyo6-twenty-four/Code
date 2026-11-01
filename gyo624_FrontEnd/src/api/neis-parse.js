export function parseNeis(payload, service) {
  const top = payload?.RESULT
  if (top?.CODE) return finish(top, [])
  const parts = payload?.[service]
  if (!Array.isArray(parts)) throw new Error('나이스 응답을 읽지 못했어요.')
  const head = parts.find(part => part.head)?.head || []
  const result = head.find(item => item.RESULT)?.RESULT
  const total = Number(head.find(item => item.list_total_count != null)?.list_total_count || 0)
  const rows = parts.find(part => Array.isArray(part.row))?.row || []
  return finish(result, rows, total)
}

function finish(result, rows, total = rows.length) {
  if (result?.CODE === 'INFO-200') return { rows: [], total: 0 }
  if (result && result.CODE !== 'INFO-000') throw new Error(result.MESSAGE || '나이스 요청이 거절됐어요.')
  return { rows, total: total || rows.length }
}

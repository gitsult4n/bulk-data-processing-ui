export function fmtInt(value: number): string {
  return value.toLocaleString()
}

export function fmtDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : '-'
}

export function fmtEta(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '-'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function shortId(id: string | null): string {
  return id ? id.slice(0, 8) : '-'
}

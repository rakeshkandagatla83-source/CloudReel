export function epochToLocalDateTime(epochSeconds: number | null): string {
  if (!epochSeconds) return '-'

  const date = new Date(epochSeconds * 1000)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date)
}

export function epochToLocalDate(epochSeconds: number | null): string {
  if (!epochSeconds) return '-'

  const date = new Date(epochSeconds * 1000)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

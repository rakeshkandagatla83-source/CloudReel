export function formatDuration(sec: number): string {
  if (!sec) return '—'
  const total = Math.round(sec)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`
}

export function formatEpoch(epoch: number): string {
  if (!epoch) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(epoch * 1000))
}

export const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  P: { label: 'Video', color: 'text-cyan-300 bg-black/75 border-cyan-400/50' },
  S: { label: 'Graphic', color: 'text-violet-300 bg-black/75 border-violet-400/50' },
}

export const CATEGORY_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'P', label: 'Videos' },
  { value: 'S', label: 'Graphics' },
]

export const SUBCATEGORY_OPTIONS = [
  { value: '', label: 'All Sub Categories' },
  { value: 'movie', label: 'Movie' },
  { value: 'program', label: 'Program' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'promo', label: 'Promo' },
  { value: 'filler', label: 'Filler' },
  { value: 'news', label: 'News' },
  { value: 'tvc', label: 'TVC' },
  { value: 'webseries', label: 'Webseries' },
]

export const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'name asc', label: 'Name A → Z' },
  { value: 'name desc', label: 'Name Z → A' },
  { value: 'filesize asc', label: 'File Size ↑' },
  { value: 'filesize desc', label: 'File Size ↓' },
  { value: 'asset_duration asc', label: 'Duration ↑' },
  { value: 'asset_duration desc', label: 'Duration ↓' },
  { value: 'uploadedon desc', label: 'Newest First' },
  { value: 'uploadedon asc', label: 'Oldest First' },
]

export function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  const parts = rounded.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `NPR ${parts.join('.')}`
}

export function formatInteger(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export function stripLeadingZero(value: string): string {
  const trimmed = value.replace(/^0+/, '')
  return trimmed === '' ? '0' : trimmed
}

export function clearZeroOnFocus(e: React.FocusEvent<HTMLInputElement>): void {
  if (e.target.value === '0') {
    e.target.value = ''
  }
}

import { FilterSelect } from '../../../components/forms/FilterBar'
import { ResponsiveDatePicker } from '../../../components/forms/ResponsiveDatePicker'

export type DatePreset =
  'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom'

export interface DateRange {
  startDate?: string
  endDate?: string
}

export interface DateRangeFilterProps {
  preset: DatePreset
  startDate?: string
  endDate?: string
  onChange: (preset: DatePreset, startDate?: string, endDate?: string) => void
}

export function getDateRange(
  preset: DatePreset,
  customStart?: string,
  customEnd?: string,
): DateRange {
  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  switch (preset) {
    case 'today': {
      const dateStr = todayUTC.toISOString().split('T')[0]
      return { startDate: dateStr, endDate: dateStr }
    }
    case 'yesterday': {
      const yesterday = new Date(todayUTC)
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)
      const dateStr = yesterday.toISOString().split('T')[0]
      return { startDate: dateStr, endDate: dateStr }
    }
    case 'last7': {
      const last7 = new Date(todayUTC)
      last7.setUTCDate(last7.getUTCDate() - 6)
      return {
        startDate: last7.toISOString().split('T')[0],
        endDate: todayUTC.toISOString().split('T')[0],
      }
    }
    case 'last30': {
      const last30 = new Date(todayUTC)
      last30.setUTCDate(last30.getUTCDate() - 29)
      return {
        startDate: last30.toISOString().split('T')[0],
        endDate: todayUTC.toISOString().split('T')[0],
      }
    }
    case 'thisMonth': {
      const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      return {
        startDate: firstDay.toISOString().split('T')[0],
        endDate: todayUTC.toISOString().split('T')[0],
      }
    }
    case 'lastMonth': {
      const firstDayLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      const lastDayLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
      return {
        startDate: firstDayLastMonth.toISOString().split('T')[0],
        endDate: lastDayLastMonth.toISOString().split('T')[0],
      }
    }
    case 'custom':
      return { startDate: customStart, endDate: customEnd }
  }
}

const presetOptions: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
]

export function DateRangeFilter({ preset, startDate, endDate, onChange }: DateRangeFilterProps) {
  const handlePresetChange = (newPreset: string) => {
    const typedPreset = newPreset as DatePreset
    if (typedPreset === 'custom') {
      onChange('custom', startDate, endDate)
    } else {
      const range = getDateRange(typedPreset)
      onChange(typedPreset, range.startDate, range.endDate)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <FilterSelect
        value={preset}
        onChange={handlePresetChange}
        options={presetOptions}
        aria-label="Date range preset"
      />

      {preset === 'custom' && (
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <ResponsiveDatePicker
            value={startDate ?? ''}
            onValueChange={(value) => onChange('custom', value || undefined, endDate)}
            className="h-10 w-full sm:flex-1 sm:min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Start date"
          />
          <ResponsiveDatePicker
            value={endDate ?? ''}
            onValueChange={(value) => onChange('custom', startDate, value || undefined)}
            className="h-10 w-full sm:flex-1 sm:min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="End date"
          />
        </div>
      )}
    </div>
  )
}

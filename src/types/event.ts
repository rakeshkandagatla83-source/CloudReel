export interface CalendarEvent {
  id: string
  title: string
  description: string
  startDateTime: number
  endDateTime: number
  eventType: 'C' | 'O'
  resolution: string
  thumbnailUrl: string
  createdAt: number
  _local?: boolean
}

export type EventStatus = 'past' | 'ongoing' | 'future'
export type CalendarView = 'month' | 'week' | 'day'

export type ModalState =
  | { mode: 'create'; dateStr: string; startEpoch?: number }
  | { mode: 'edit'; event: CalendarEvent }
  | { mode: 'view'; event: CalendarEvent }

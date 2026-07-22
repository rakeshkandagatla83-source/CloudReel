import { useEffect } from 'react'
import { EventsCalendar } from '../features/events/EventsCalendar'

export function EventsPage() {
  useEffect(()=>{document.title='CloudReel - Events'})
  return <EventsCalendar />
}

import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

function EventCard({ event }) {
  return <article className="event-card"><Link className="event-image-link" to={`/events/${event.id}`} aria-label={`View ${event.title}`}><img className="event-image" src={event.image} alt={event.imageAlt} loading="lazy" /><span className={`event-tag tag-${event.categoryKey}`}>{event.category}</span><span className="event-card-arrow"><ArrowUpRight size={17} /></span></Link><div className="event-card-body"><div className="event-date"><CalendarDays size={14} /> {event.dateShort}</div><h3><Link to={`/events/${event.id}`}>{event.title}</Link></h3><p className="event-venue"><MapPin size={14} /> {event.venue}, {event.city}</p><div className="event-card-bottom"><span>{event.price === 0 ? <strong>Free entry</strong> : <>From <strong>₹{event.price.toLocaleString('en-IN')}</strong></>}</span><Link to={`/events/${event.id}`} aria-label={`See details for ${event.title}`}><ArrowUpRight size={17} /></Link></div></div></article>
}

export default EventCard
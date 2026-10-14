import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, CreditCard, Filter, MapPin, Search, ShieldCheck, Ticket, Users, WandSparkles } from 'lucide-react'
import { categories, events } from './data/events'
import EventCard from './components/EventCard'
import SiteLayout from './components/SiteLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { useSession } from './context/SessionContext'
import { getApiError } from './services/api'
import { api } from './services/api'
import AdminVerificationDetails from './pages/AdminVerificationDetails'
import { normalizeEvent, useEventCatalog } from './hooks/useEventCatalog'
import NearMeButton from './components/NearMeButton'
import './App.css'

function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { catalog, previewOnly } = useEventCatalog()

  function searchEvents(event) {
    event.preventDefault()
    navigate(`/events${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`)
  }

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-mark" /> Make room for a good time</p>
          <h1>Find your<br /><span>next feeling.</span></h1>
          <p className="hero-description">The nights you talk about later start with a ticket. Find the music, ideas and people worth showing up for.</p>
          <form className="hero-search" onSubmit={searchEvents}>
            <Search size={19} aria-hidden="true" />
            <input aria-label="Search events, city, area, or postal code" placeholder="Events, city, area, or postal code" value={query} onChange={(event) => setQuery(event.target.value)} />
            <button className="button button-dark" type="submit">Explore events <ArrowRight size={16} /></button>
          </form>
          <div className="hero-location-row"><NearMeButton onLocated={(nearby) => navigate('/events', { state: { nearby: { ...nearby, radiusKm: 25 } } })} /><div className="hero-footnote"><span className="live-dot" /> A little something happening near you</div></div>
        </div>
        <div className="hero-art" aria-label="Crowd enjoying a live music event" role="img">
          <div className="hero-photo" />
          <div className="hero-image-shade" />
          <div className="hero-photo-caption"><span>TONIGHT LOOKS GOOD</span><ArrowDownRight size={18} /></div>
          <div className="hero-ticket"><Ticket size={19} /><span>YOUR NEXT<br />GREAT NIGHT</span><ArrowUpRight size={16} /></div>
          <div className="hero-count"><strong>01</strong><span>/ THE CITY IS YOURS</span></div>
        </div>
      </section>

      <section className="category-strip section-wrap" aria-labelledby="category-title">
        <div className="section-heading compact-heading"><div><p className="eyebrow">Pick your kind of night</p><h2 id="category-title">Something for every mood.</h2></div><Link className="text-link" to="/events">All events <ArrowUpRight size={16} /></Link></div>
        <div className="category-grid">
          {categories.map((category) => <Link className={`category-tile category-${category.key}`} key={category.key} to={`/events?category=${encodeURIComponent(category.key)}`}><span className="category-symbol">{category.symbol}</span><span>{category.label}</span><ArrowUpRight size={15} className="category-arrow" /></Link>)}
        </div>
      </section>

      <section className="featured-section">
        <div className="section-wrap">
          <div className="section-heading"><div><p className="eyebrow">Curated for your calendar</p><h2>Worth stepping out for.</h2></div><Link className="text-link" to="/events">See all events <ArrowUpRight size={16} /></Link></div>
          {previewOnly && <p className="preview-data-note">Showing sample listings because the event database is not connected.</p>}
          <div className="event-grid">{catalog.slice(0, 3).map((event) => <EventCard event={event} key={event.id} />)}</div>
        </div>
      </section>

      <section className="home-note section-wrap"><div className="note-icon"><WandSparkles size={20} /></div><p><strong>A city is only as good as its stories.</strong> Find a new one this week.</p><Link className="button button-outline" to="/events">Find your event <ArrowRight size={16} /></Link></section>
    </>
  )
}

function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigation = useLocation()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all')
  const [locationQuery, setLocationQuery] = useState(searchParams.get('location') || '')
  const [nearby, setNearby] = useState(navigation.state?.nearby || null)
  const [radiusKm, setRadiusKm] = useState(navigation.state?.nearby?.radiusKm || 25)
  const [city, setCity] = useState('all')
  const [priceType, setPriceType] = useState('all')
  const [dateWindow, setDateWindow] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [visibleCount, setVisibleCount] = useState(6)
  const { catalog, previewOnly, error: catalogError, loading: catalogLoading } = useEventCatalog({
    q: query || undefined,
    location: locationQuery || undefined,
    city: city === 'all' ? undefined : city,
    category: categories.find((category) => category.key === activeCategory)?.label,
    priceType: priceType === 'all' ? undefined : priceType,
    availability: 'available',
    from: dateWindow === 'all' ? undefined : new Date().toISOString(),
    to: dateWindow === 'all' ? undefined : new Date(Date.now() + Number(dateWindow) * 86400000).toISOString(),
    sort: nearby ? 'distance' : sortBy,
    lat: nearby?.lat,
    lng: nearby?.lng,
    radiusKm: nearby ? radiusKm : undefined,
  })
  const cities = [...new Set(catalog.map((event) => event.city))].sort()
  const filteredEvents = catalog.filter((event) => {
    const matchesCategory = activeCategory === 'all' || event.categoryKey === activeCategory
    const haystack = `${event.title} ${event.venue} ${event.city} ${event.category}`.toLowerCase()
    const matchesCity = city === 'all' || event.city === city
    const price = event.price ?? Math.min(...(event.ticketTypes || []).map((ticket) => ticket.price), 0)
    const matchesPrice = priceType === 'all' || (priceType === 'free' ? price === 0 : price > 0)
    const daysAway = (new Date(event.dateISO || event.startsAt || event.dateShort) - new Date()) / 86400000
    const matchesDate = dateWindow === 'all' || (daysAway >= 0 && daysAway <= Number(dateWindow))
    const matchesManualLocation = !locationQuery || haystack.includes(locationQuery.toLowerCase().trim())
    const matchesNearby = !nearby || (event.distanceKm != null && event.distanceKm <= radiusKm)
    return matchesCategory && matchesCity && matchesPrice && matchesDate && matchesManualLocation && matchesNearby && haystack.includes(query.toLowerCase().trim())
  })
  const sortedEvents = filteredEvents.slice().sort((first, second) => {
    if (sortBy === 'popular') return (second.popularity || second.bookingsCount || 0) - (first.popularity || first.bookingsCount || 0)
    if (sortBy === 'price-low') return first.price - second.price
    if (sortBy === 'price-high') return second.price - first.price
    return new Date(first.dateISO || first.startsAt || first.dateShort) - new Date(second.dateISO || second.startsAt || second.dateShort)
  })

  function selectCategory(key) {
    setActiveCategory(key)
    const next = new URLSearchParams(searchParams)
    if (key === 'all') next.delete('category')
    else next.set('category', key)
    setSearchParams(next)
  }

  return (
    <main className="page-main">
      <section className="listing-intro section-wrap"><p className="eyebrow">The good stuff, all in one place</p><h1>Make a date<br /><span>with the city.</span></h1><p>Small rooms, big stages, new ideas. Find the one that feels like you.</p>
        <form className="listing-search" onSubmit={(event) => event.preventDefault()}><Search size={18} /><input aria-label="Search event names and descriptions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event names and descriptions" /><span className="search-filter-icon"><Filter size={17} /> Filters</span></form>
      </section>
      <section className="listing-results section-wrap">
        {previewOnly && <p className="preview-data-note">Sample listings are shown because the event database is unavailable. {catalogError}</p>}
        <div className="filter-row"><div className="filter-chips" aria-label="Filter events by category"><button className={activeCategory === 'all' ? 'filter-chip active' : 'filter-chip'} onClick={() => selectCategory('all')}>Everything</button>{categories.map((category) => <button className={activeCategory === category.key ? `filter-chip active filter-${category.key}` : 'filter-chip'} key={category.key} onClick={() => selectCategory(category.key)}>{category.label}</button>)}</div><span className="result-count">{filteredEvents.length} events</span></div>
        <div className="location-filter-row"><label>City, area, or postal code<input value={locationQuery} onChange={(event) => { setLocationQuery(event.target.value); setNearby(null) }} placeholder="e.g. Bengaluru or 560034" /></label><NearMeButton onLocated={(coordinates) => { setNearby(coordinates); setLocationQuery('') }} /><label>Radius<select aria-label="Nearby radius" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}><option value={5}>5 km</option><option value={10}>10 km</option><option value={25}>25 km</option><option value={50}>50 km</option></select></label></div>
        {nearby && previewOnly && <p className="location-status" role="status">Sample events do not have venue coordinates, and the database is offline. Nearby distance results require connected event data; your coordinates have not been saved.</p>}
        {catalogLoading && !previewOnly && <p className="route-loading" role="status">Updating event results…</p>}
        {sortedEvents.length ? <><div className="event-grid">{sortedEvents.slice(0, visibleCount).map((event) => <EventCard event={event} key={event.id} />)}</div>{visibleCount < sortedEvents.length && <div className="load-more-wrap"><button className="button button-outline" onClick={() => setVisibleCount((count) => count + 6)}>Load more events <ArrowDownRight size={16} /></button></div>}</> : <div className="empty-state"><Search size={24} /><h2>No events found</h2><p>Try a different search or clear your filters.</p><button className="button button-outline" onClick={() => { setQuery(''); setLocationQuery(''); setNearby(null); setCity('all'); setPriceType('all'); setDateWindow('all'); selectCategory('all') }}>Clear filters</button></div>}
      </section>
    </main>
  )
}

function EventDetailsPage() {
  const { eventId } = useParams()
  const event = events.find((item) => item.id === eventId)
  const [message, setMessage] = useState('')
  if (!event) return <Navigate to="/events" replace />

  return <main className="page-main detail-page"><div className="section-wrap"><Link className="back-link" to="/events"><ArrowLeft size={16} /> Back to events</Link><div className="detail-hero"><img src={event.image} alt={event.imageAlt} /><div className="detail-overlay"><span className={`event-tag tag-${event.categoryKey}`}>{event.category}</span><h1>{event.title}</h1><p>{event.tagline}</p></div></div>
    <div className="detail-layout"><article className="detail-content"><p className="eyebrow">The details</p><h2>A night made for being there.</h2><p>{event.description}</p><div className="detail-facts"><div><CalendarDays size={19} /><span><small>DATE</small>{event.dateLong}</span></div><div><Clock3 size={19} /><span><small>DOORS OPEN</small>{event.time}</span></div><div><MapPin size={19} /><span><small>VENUE</small>{event.venue}, {event.city}</span></div></div><div className="preview-callout"><ShieldCheck size={19} /><span>This event listing is sample content for the frontend preview.</span></div></article>
      <aside className="ticket-panel"><p className="eyebrow">Be in the room</p><div className="price-line"><span>Tickets from</span><strong>₹{event.price.toLocaleString('en-IN')}</strong></div><p className="ticket-caption">per person · sample price</p><button className="button button-dark full-button" onClick={() => setMessage('Booking is not connected yet. This button is a frontend preview only.')}>Reserve a ticket <ArrowRight size={17} /></button>{message && <p className="action-notice" role="status">{message}</p>}<div className="secure-note"><Check size={15} /> No payment or booking is processed</div></aside>
    </div></div></main>
}

function AuthPage({ mode }) {
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { logIn, registerAccount } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const registering = mode === 'register'
  async function submit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (registering && data.get('password') !== data.get('confirmPassword')) {
      setNotice('Those passwords do not match. Please check and try again.')
      return
    }
    setSubmitting(true)
    setNotice('')
    try {
      const credentials = { email: data.get('email'), password: data.get('password') }
      if (registering) {
        await registerAccount({ ...credentials, name: data.get('name') })
        navigate('/bookings', { replace: true })
      } else {
        await logIn(credentials)
        navigate(location.state?.from || '/bookings', { replace: true })
      }
    } catch (error) {
      setNotice(getApiError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="auth-page"><div className="auth-image"><div className="auth-image-copy"><span className="auth-image-kicker">A GOOD NIGHT STARTS HERE</span><p>Leave the ordinary<br />at the door.</p><span className="auth-image-credit">THE CITY IS WAITING</span></div></div><section className="auth-form-side"><div className="auth-form-wrap"><p className="eyebrow">{registering ? 'Your next story starts now' : 'Good to have you back'}</p><h1>{registering ? 'Make it a night.' : 'Welcome back.'}</h1><p className="auth-subtitle">{registering ? 'Create an account to keep your plans in one place.' : 'Sign in to see what you have on the calendar.'}</p><form className="auth-form" onSubmit={submit}>
    {registering && <label>Full name<input autoComplete="name" name="name" type="text" placeholder="Your name" required minLength={2} /></label>}
    <label>Email address<input autoComplete="email" name="email" type="email" placeholder="you@example.com" required /></label>
    <label>Password<input autoComplete={registering ? 'new-password' : 'current-password'} name="password" type="password" placeholder="At least 8 characters" minLength={8} required /></label>
    {registering && <label>Confirm password<input autoComplete="new-password" name="confirmPassword" type="password" placeholder="Enter your password again" minLength={8} required /></label>}
    {notice && <p className="form-notice" role="status">{notice}</p>}
    <button className="button button-dark full-button" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : registering ? 'Create account' : 'Sign in'} {!submitting && <ArrowRight size={16} />}</button>
  </form><p className="auth-switch">{registering ? 'Already have an account?' : 'New around here?'} <Link to={registering ? '/login' : '/register'}>{registering ? 'Sign in' : 'Create an account'}</Link></p><p className="auth-demo"><ShieldCheck size={15} /> Sessions use an HTTP-only cookie. No tokens are saved in browser storage.</p></div></section></main>
}

function BookingsPage() {
  const [bookings, setBookings] = useState(null)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState('')

  useEffect(() => {
    api.get('/bookings/mine')
      .then((response) => setBookings(response.data.data.bookings))
      .catch((requestError) => setError(getApiError(requestError)))
  }, [])

  async function cancelBooking(booking) {
    if (!window.confirm(`Cancel reservation ${booking.reference}?`)) return
    setCancelling(booking.reference)
    setError('')
    try {
      await api.post(`/bookings/${booking.reference}/cancel`)
      setBookings((current) => current.map((item) => item.reference === booking.reference ? { ...item, status: 'cancelled' } : item))
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setCancelling('')
    }
  }

  return <main className="page-main dashboard-page"><div className="section-wrap"><div className="dashboard-heading"><div><p className="eyebrow">Your plans, in one place</p><h1>My bookings<span className="heading-period">.</span></h1><p>Booking history linked to your account.</p></div><Link className="button button-dark" to="/events">Find an event <ArrowRight size={16} /></Link></div>
    {error && <p className="api-notice" role="alert">{error}</p>}
    {bookings === null ? <p className="route-loading" role="status">Loading your bookings…</p> : bookings.length === 0 ? <div className="empty-state"><Ticket size={25} /><h2>No bookings yet</h2><p>When you reserve tickets, they will appear here.</p><Link className="button button-dark" to="/events">Explore events <ArrowRight size={16} /></Link></div> : <div className="booking-list">{bookings.map((booking) => {
      const event = booking.event
      const canCancel = booking.status === 'reserved-unpaid' && event?.startsAt && new Date(event.startsAt).getTime() - Date.now() >= 24 * 60 * 60 * 1000
      return <article className="booking-row" key={booking.reference}><img src={event?.coverImage || events[0].image} alt={event?.title || 'Event'} /><div className="booking-info"><span className={`booking-status ${booking.status === 'reserved-unpaid' ? 'status-upcoming' : ''}`}>{booking.status.replaceAll('-', ' ')}</span><h2>{event?.title || 'Event listing unavailable'}</h2><p><CalendarDays size={15} /> {event?.startsAt ? new Date(event.startsAt).toLocaleString() : 'Date unavailable'} <span className="booking-divider">·</span><MapPin size={15} /> {event?.city || 'Venue unavailable'}</p><small>Reference {booking.reference} · {booking.quantity} {booking.quantity === 1 ? 'ticket' : 'tickets'} · {booking.ticketTypeName}</small></div><div className="booking-price"><span>Unpaid reservation</span><strong>₹{booking.total.toLocaleString('en-IN')}</strong>{event && <Link to={`/events/${event.id}`}>View event <ArrowUpRight size={14} /></Link>}{canCancel && <button className="cancel-booking" disabled={cancelling === booking.reference} onClick={() => cancelBooking(booking)}>{cancelling === booking.reference ? 'Cancelling…' : 'Cancel reservation'}</button>}</div></article>
    })}</div>}
    <div className="dashboard-help"><CircleHelp size={19} /><div><strong>Need a hand?</strong><p>Contact support if a reservation status looks incorrect.</p></div></div></div></main>
}

function AdminPage() {
  const [overview, setOverview] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [pendingEvents, setPendingEvents] = useState([])
  const [reasons, setReasons] = useState({})
  const [busyAction, setBusyAction] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const [overviewResponse, profileResponse, eventResponse] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/organizers/verification'),
        api.get('/admin/events/pending'),
      ])
      setOverview(overviewResponse.data.data)
      setProfiles(profileResponse.data.data.profiles)
      setPendingEvents(eventResponse.data.data.events)
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function reviewOrganizer(profile, action) {
    const reason = reasons[profile.id] || ''
    if (['reject', 'request-info'].includes(action) && reason.trim().length < 3) {
      setError('Enter a reason before rejecting or requesting more information.')
      return
    }
    setBusyAction(`${profile.id}:${action}`)
    try {
      await api.patch(`/admin/organizers/verification/${profile.id}`, { action, reason })
      await refresh()
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setBusyAction('')
    }
  }

  async function reviewEvent(event, action) {
    const reason = reasons[event.id] || ''
    if (action === 'reject' && reason.trim().length < 3) {
      setError('Enter a reason before rejecting an event.')
      return
    }
    setBusyAction(`${event.id}:${action}`)
    try {
      await api.patch(`/admin/events/${event.id}/review`, { action, reason })
      await refresh()
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setBusyAction('')
    }
  }

  if (loading) return <main className="route-loading" role="status">Loading platform data…</main>

  return <main className="page-main admin-page"><div className="section-wrap"><div className="dashboard-heading"><div><p className="eyebrow">EVENTORA / CONTROL CENTER</p><h1>Platform overview<span className="heading-period">.</span></h1><p>Counts and queues from the current database.</p></div><button className="button button-outline" onClick={refresh}>Refresh data</button></div>
    {error && <p className="api-notice" role="alert">{error}</p>}
    <div className="admin-metrics"><article><span><Users size={18} /> Users</span><strong>{overview?.users ?? '—'}</strong><small>All account roles</small></article><article><span><ShieldCheck size={18} /> Organizers</span><strong>{overview?.organizers ?? '—'}</strong><small>{overview?.pendingVerification ?? 0} awaiting review</small></article><article><span><CalendarDays size={18} /> Published events</span><strong>{overview?.publishedEvents ?? '—'}</strong><small>{overview?.pendingEvents ?? 0} awaiting approval</small></article><article><span><Ticket size={18} /> Reservations</span><strong>{overview?.bookings ?? '—'}</strong><small>All recorded bookings</small></article></div>
    <div className="dashboard-banner"><CreditCard size={18} /><span>Revenue is hidden until a payment gateway and verified payment records are configured.</span></div>
    <section className="admin-table-section"><div className="table-heading"><div><p className="eyebrow">Identity checks</p><h2>Organizer verification queue</h2></div><span>{profiles.length} pending</span></div>
      {profiles.length === 0 ? <p className="admin-empty">No organizer applications are awaiting review.</p> : <div className="moderation-list">{profiles.map((profile) => <article className="moderation-row" key={profile.id}><div className="moderation-identity"><strong>{profile.organizationName}</strong><span>{profile.user?.name} · {profile.user?.email}</span><small>{profile.verificationStatus} · submitted {new Date(profile.createdAt).toLocaleDateString()}</small><Link to={`/admin/organizers/${profile.id}`}>Review application details</Link></div><label>Decision reason<input value={reasons[profile.id] || ''} onChange={(event) => setReasons((current) => ({ ...current, [profile.id]: event.target.value }))} placeholder="Required for rejection or info request" /></label><div className="moderation-actions"><button className="button button-dark" disabled={busyAction.startsWith(profile.id)} onClick={() => reviewOrganizer(profile, 'approve')}>Approve</button><button className="button button-outline" disabled={busyAction.startsWith(profile.id)} onClick={() => reviewOrganizer(profile, 'request-info')}>Request info</button><button className="button button-danger" disabled={busyAction.startsWith(profile.id)} onClick={() => reviewOrganizer(profile, 'reject')}>Reject</button></div></article>)}</div>}
    </section>
    <section className="admin-table-section"><div className="table-heading"><div><p className="eyebrow">Event moderation</p><h2>Events awaiting approval</h2></div><span>{pendingEvents.length} pending</span></div>
      {pendingEvents.length === 0 ? <p className="admin-empty">No events are awaiting approval.</p> : <div className="moderation-list">{pendingEvents.map((event) => <article className="moderation-row" key={event.id}><div className="moderation-identity"><strong>{event.title}</strong><span>{event.organizer?.name} · {event.venue}, {event.city}</span><small>{new Date(event.startsAt).toLocaleString()}</small></div><label>Decision reason<input value={reasons[event.id] || ''} onChange={(inputEvent) => setReasons((current) => ({ ...current, [event.id]: inputEvent.target.value }))} placeholder="Required for rejection" /></label><div className="moderation-actions"><button className="button button-dark" disabled={busyAction.startsWith(event.id)} onClick={() => reviewEvent(event, 'approve')}>Approve</button><button className="button button-danger" disabled={busyAction.startsWith(event.id)} onClick={() => reviewEvent(event, 'reject')}>Reject</button></div></article>)}</div>}
    </section></div></main>

  /*
  return <main className="page-main admin-page"><div className="section-wrap"><div className="dashboard-heading"><div><p className="eyebrow">Workspace / Overview</p><h1>Event manager<span className="heading-period">.</span></h1><p>A quick look at what is on the calendar.</p></div><button className="button button-dark" onClick={() => window.alert('Event management is a frontend preview. Changes are not saved.')}>+ Add an event</button></div><div className="dashboard-banner"><ShieldCheck size={18} /><span>Demo admin dashboard. Metrics and listings below are sample data; event changes are not saved.</span></div><div className="admin-metrics"><article><span><CalendarDays size={18} /> Total events</span><strong>12</strong><small>Across 4 categories</small></article><article><span><Ticket size={18} /> Tickets sold</span><strong>846</strong><small>Sample total · this month</small></article><article><span><CreditCard size={18} /> Gross revenue</span><strong>₹4.2L</strong><small>Sample total · this month</small></article><article><span><Users size={18} /> Attendees</span><strong>731</strong><small>Sample total · this month</small></article></div><section className="admin-table-section"><div className="table-heading"><div><p className="eyebrow">Your calendar</p><h2>Recent events</h2></div><button className="table-filter" onClick={() => window.alert('Filtering will be available when the admin data is connected.')}><Filter size={15} /> Filter <ChevronDown size={14} /></button></div><div className="table-scroll"><table><thead><tr><th>Event</th><th>Date</th><th>Tickets</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{events.slice(0, 5).map((event, index) => <tr key={event.id}><td><div className="table-event"><img src={event.image} alt="" /><span><strong>{event.title}</strong><small>{event.venue}</small></span></div></td><td>{event.dateShort}</td><td>{[124, 86, 210, 64, 142][index]} sold</td><td><span className={`admin-status ${index === 3 ? 'status-draft' : ''}`}>{index === 3 ? 'Draft' : 'Published'}</span></td><td><button className="row-action" title="Edit event" aria-label={`Edit ${event.title}`} onClick={() => window.alert('Event editing is not connected yet.')}>•••</button></td></tr>)}</tbody></table></div></section></div></main>
*/
}

function NotFoundPage() {
  return <main className="empty-state not-found"><span className="eyebrow">That page took a different turn</span><h1>Nothing here yet.</h1><Link className="button button-dark" to="/">Back home <ArrowRight size={16} /></Link></main>
}

function App() {
  return <SiteLayout><Routes><Route path="/" element={<HomePage />} /><Route path="/events" element={<EventsPage />} /><Route path="/events/:eventId" element={<EventDetailsPage />} /><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/register" element={<AuthPage mode="register" />} /><Route path="/bookings" element={<ProtectedRoute roles={['user', 'organizer']}><BookingsPage /></ProtectedRoute>} /><Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} /><Route path="/admin/organizers/:profileId" element={<ProtectedRoute roles={['admin']}><AdminVerificationDetails /></ProtectedRoute>} /><Route path="*" element={<NotFoundPage />} /></Routes></SiteLayout>
}

export default App

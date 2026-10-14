
import { useEffect, useState } from 'react'
import { events as previewEvents } from '../data/events'
import { api, getApiError } from '../services/api'

const categoryKeys = {
  'live music': 'music',
  'food & drink': 'food',
  'art & culture': 'arts',
  wellness: 'wellness',
}

export function normalizeEvent(event) {
  if (event.id && event.dateShort) return event

  const startDate = new Date(event.startsAt)
  const dateLabel = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
  const dateLong = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const prices = (event.ticketTypes || []).map(
    (ticketType) => ticketType.price
  )
  const category = event.category || 'Events'

  return {
    ...event,
    id: String(event._id),
    category,
    categoryKey: categoryKeys[category.toLowerCase()] || 'arts',
    dateShort: dateLabel.format(startDate).toUpperCase(),
    dateLong: dateLong.format(startDate),
    dateISO: startDate.toISOString(),
    time: startDate.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    }),
    image: event.coverImage || previewEvents[0].image,
    imageAlt: `${event.title} event cover`,
    price: prices.length ? Math.min(...prices) : 0,
    popularity: event.bookingsCount || 0,
    tagline: event.tagline || `${event.category} in ${event.city}`,
  }
}

export function useEventCatalog(filters = {}) {
  const [catalog, setCatalog] = useState(previewEvents)
  const [previewOnly, setPreviewOnly] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    const controller = new AbortController()

    let parsedFilters
    try {
      parsedFilters = JSON.parse(filterKey)
    } catch {
      setError('Invalid event filters.')
      setLoading(false)
      return () => controller.abort()
    }

    api.get('/events', {
      params: { limit: 100, ...parsedFilters },
      signal: controller.signal,
    })
      .then((response) => {
        const events = response.data?.data?.events
        if (!Array.isArray(events)) {
          throw new Error('Unexpected events API response.')
        }

        setCatalog(events.map(normalizeEvent))
        setPreviewOnly(false)
        setError('')
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return
        setCatalog(previewEvents)
        setPreviewOnly(true)
        setError(getApiError(requestError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [filterKey])

  return { catalog, previewOnly, loading, error }
}

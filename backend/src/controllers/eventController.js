import mongoose from 'mongoose'
import { Event } from '../models/Event.js'
import { AppError } from '../utils/AppError.js'

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildPublicEventFilter(query) {
  const filter = { status: 'published' }
  const clauses = [{ startsAt: { $gte: new Date() } }]

  if (query.q && String(query.q).length <= 100) {
    const pattern = new RegExp(escapeRegex(String(query.q).trim()), 'i')
    clauses.push({ $or: [{ title: pattern }, { description: pattern }, { venue: pattern }, { city: pattern }, { address: pattern }, { postalCode: pattern }] })
  }
  if (query.location && String(query.location).length <= 100) {
    const pattern = new RegExp(escapeRegex(String(query.location).trim()), 'i')
    clauses.push({ $or: [{ city: pattern }, { address: pattern }, { postalCode: pattern }, { venue: pattern }] })
  }
  if (query.city) filter.city = String(query.city).slice(0, 100)
  if (query.category) filter.category = String(query.category).slice(0, 80)
  if (query.from && Number.isFinite(Date.parse(query.from))) clauses[0].startsAt.$gte = new Date(query.from)
  if (query.to && Number.isFinite(Date.parse(query.to))) clauses[0].startsAt.$lte = new Date(query.to)
  const ticketConditions = {}
  if (query.priceType === 'free') ticketConditions.price = 0
  if (query.priceType === 'paid') ticketConditions.price = { $gt: 0 }
  if (query.availability === 'available') ticketConditions.remaining = { $gt: 0 }
  if (Object.keys(ticketConditions).length) filter.ticketTypes = { $elemMatch: ticketConditions }
  if (clauses.length) filter.$and = clauses
  return filter
}

export function geoCoordinates(query) {
  const hasLatitude = query.lat !== undefined
  const hasLongitude = query.lng !== undefined
  if (hasLatitude !== hasLongitude) throw new AppError(400, 'Latitude and longitude must be provided together.')
  if (!hasLatitude) return null

  const latitude = Number(query.lat)
  const longitude = Number(query.lng)
  const radiusKm = Number(query.radiusKm ?? 25)
  const allowedRadii = new Set([5, 10, 25, 50])
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new AppError(400, 'The supplied coordinates are invalid.')
  }
  if (!allowedRadii.has(radiusKm)) throw new AppError(400, 'Radius must be 5, 10, 25, or 50 km.')
  return { latitude, longitude, radiusKm }
}

export async function listPublicEvents(request, response) {
  const { sort = 'date' } = request.query
  const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
  const limit = Math.min(24, Math.max(1, Number.parseInt(request.query.limit, 10) || 12))
  const coordinates = geoCoordinates(request.query)
  const filter = buildPublicEventFilter(request.query)
  if (coordinates) {
    filter.venueLocation = {
      $near: {
        $geometry: { type: 'Point', coordinates: [coordinates.longitude, coordinates.latitude] },
        $maxDistance: coordinates.radiusKm * 1000,
      },
    }
  }

  const sortMap = {
    date: { startsAt: 1 },
    popular: { bookingsCount: -1, startsAt: 1 },
    'price-low': { 'ticketTypes.price': 1, startsAt: 1 },
    'price-high': { 'ticketTypes.price': -1, startsAt: 1 },
  }
  let events
  let total
  if (coordinates) {
    const geoNearStage = () => ({ $geoNear: {
      near: { type: 'Point', coordinates: [coordinates.longitude, coordinates.latitude] },
      distanceField: '_distanceMeters',
      maxDistance: coordinates.radiusKm * 1000,
      spherical: true,
      key: 'venueLocation',
      query: filter,
    } })
    const [results, count] = await Promise.all([
      Event.aggregate([
        geoNearStage(),
        { $addFields: { distanceKm: { $round: [{ $divide: ['$_distanceMeters', 1000] }, 1] } } },
        { $unset: '_distanceMeters' },
        ...(sort === 'popular' ? [{ $sort: { bookingsCount: -1 } }] : sort === 'price-low' ? [{ $sort: { 'ticketTypes.price': 1 } }] : sort === 'price-high' ? [{ $sort: { 'ticketTypes.price': -1 } }] : []),
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]),
      Event.aggregate([geoNearStage(), { $count: 'total' }]),
    ])
    events = results
    total = count[0]?.total || 0
  } else {
    const [results, count] = await Promise.all([
      Event.find(filter).sort(sortMap[sort] || sortMap.date).skip((page - 1) * limit).limit(limit).populate('organizer', 'name').lean(),
      Event.countDocuments(filter),
    ])
    events = results
    total = count
  }

  response.json({ data: { events }, meta: { page, limit, total, pages: Math.ceil(total / limit) } })
}

export async function getPublicEvent(request, response) {
  if (!mongoose.isValidObjectId(request.params.eventId)) throw new AppError(404, 'Event not found.')
  const event = await Event.findOne({ _id: request.params.eventId, status: 'published' })
    .populate('organizer', 'name')
    .lean()
  if (!event) throw new AppError(404, 'Event not found.')
  response.json({ data: { event } })
}

function normalizedTicketTypes(ticketTypes) {
  return ticketTypes.map((ticketType) => ({
    ...ticketType,
    remaining: ticketType.capacity,
  }))
}

export async function createDraft(request, response) {
  const event = await Event.create({
    ...request.body,
    organizer: request.user.id,
    ticketTypes: normalizedTicketTypes(request.body.ticketTypes),
    status: 'draft',
  })
  response.status(201).json({ data: { event } })
}

export async function updateDraft(request, response) {
  if (!mongoose.isValidObjectId(request.params.eventId)) throw new AppError(404, 'Event not found.')
  const event = await Event.findOne({ _id: request.params.eventId, organizer: request.user.id })
  if (!event) throw new AppError(404, 'Event not found.')
  if (!['draft', 'rejected'].includes(event.status)) throw new AppError(409, 'Only draft or rejected events can be edited.')

  Object.assign(event, request.body)
  event.ticketTypes = normalizedTicketTypes(request.body.ticketTypes)
  event.status = 'draft'
  event.moderationMessage = ''
  await event.save()
  response.json({ data: { event } })
}

export async function submitForApproval(request, response) {
  if (!mongoose.isValidObjectId(request.params.eventId)) throw new AppError(404, 'Event not found.')
  const event = await Event.findOne({ _id: request.params.eventId, organizer: request.user.id })
  if (!event) throw new AppError(404, 'Event not found.')
  if (!['draft', 'rejected'].includes(event.status)) throw new AppError(409, 'This event cannot be submitted in its current status.')

  const { OrganizerProfile } = await import('../models/OrganizerProfile.js')
  const profile = await OrganizerProfile.findOne({ user: request.user.id }).select('verificationStatus')
  if (!profile || profile.verificationStatus !== 'approved' || request.user.role !== 'organizer') {
    throw new AppError(403, 'Organizer verification approval is required before event submission.')
  }
  if (event.startsAt <= new Date()) throw new AppError(400, 'An event must start in the future.')
  if (!event.ticketTypes.length || event.ticketTypes.some((ticket) => ticket.capacity < 1)) {
    throw new AppError(400, 'Add at least one ticket type with available inventory.')
  }

  event.status = 'pending-approval'
  await event.save()
  response.json({ data: { event } })
}
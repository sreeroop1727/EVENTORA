import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import { Booking } from '../models/Booking.js'
import { Event } from '../models/Event.js'
import { AppError } from '../utils/AppError.js'

function createReference() {
  return `EVT-${randomBytes(7).toString('hex').toUpperCase()}`
}

function reservationWindowIsOpen(ticketType, now) {
  return (!ticketType.salesStart || ticketType.salesStart <= now)
    && (!ticketType.salesEnd || ticketType.salesEnd >= now)
}

export async function createReservation(request, response) {
  if (!mongoose.isValidObjectId(request.params.eventId)) throw new AppError(404, 'Event not found.')
  const idempotencyKey = request.get('Idempotency-Key')
  if (!idempotencyKey || idempotencyKey.length > 128 || !/^[a-zA-Z0-9._:-]+$/.test(idempotencyKey)) {
    throw new AppError(400, 'Send a valid Idempotency-Key header for this reservation.')
  }

  const previous = await Booking.findOne({ user: request.user.id, idempotencyKey })
  if (previous) return response.status(200).json({ data: { booking: previous, idempotentReplay: true } })

  const { ticketTypeId, quantity } = request.body
  const ticketObjectId = new mongoose.Types.ObjectId(ticketTypeId)
  const now = new Date()
  const event = await Event.findOneAndUpdate({
    _id: request.params.eventId,
    status: 'published',
    startsAt: { $gt: now },
    ticketTypes: { $elemMatch: { _id: ticketObjectId, remaining: { $gte: quantity } } },
  }, {
    $inc: { 'ticketTypes.$.remaining': -quantity, bookingsCount: 1 },
  }, { new: true })

  if (!event) throw new AppError(409, 'This event or ticket type is unavailable, or there is not enough inventory.')
  const ticketType = event.ticketTypes.find((item) => item._id.equals(ticketObjectId))
  if (!ticketType || !reservationWindowIsOpen(ticketType, now)) {
    await Event.updateOne({ _id: event.id, 'ticketTypes._id': ticketObjectId }, {
      $inc: { 'ticketTypes.$.remaining': quantity, bookingsCount: -1 },
    })
    throw new AppError(409, 'Ticket reservations are not open for this ticket type.')
  }

  try {
    const [booking] = await Booking.create([{
      reference: createReference(),
      idempotencyKey,
      user: request.user.id,
      event: event.id,
      ticketTypeId,
      ticketTypeName: ticketType.name,
      quantity,
      unitPrice: ticketType.price,
      total: ticketType.price * quantity,
      status: 'reserved-unpaid',
    }])
    return response.status(201).json({ data: { booking, payment: 'not-configured' } })
  } catch (error) {
    await Event.updateOne({ _id: event.id, 'ticketTypes._id': ticketObjectId }, {
      $inc: { 'ticketTypes.$.remaining': quantity, bookingsCount: -1 },
    })
    if (error.code === 11000) {
      const replay = await Booking.findOne({ user: request.user.id, idempotencyKey })
      if (replay) return response.status(200).json({ data: { booking: replay, idempotentReplay: true } })
    }
    throw error
  }
}

export async function listMyBookings(request, response) {
  const bookings = await Booking.find({ user: request.user.id })
    .populate('event', 'title startsAt endsAt venue city coverImage status')
    .sort({ createdAt: -1 })
    .lean()
  response.json({ data: { bookings } })
}

export async function getMyBooking(request, response) {
  const booking = await Booking.findOne({ reference: request.params.reference, user: request.user.id })
    .populate('event', 'title startsAt endsAt venue city coverImage status')
    .lean()
  if (!booking) throw new AppError(404, 'Booking not found.')
  response.json({ data: { booking } })
}

export async function cancelMyBooking(request, response) {
  const booking = await Booking.findOne({ reference: request.params.reference, user: request.user.id })
  if (!booking) throw new AppError(404, 'Booking not found.')
  if (booking.status !== 'reserved-unpaid') throw new AppError(409, 'This booking cannot be cancelled in its current status.')

  const event = await Event.findById(booking.event).select('startsAt')
  if (!event || event.startsAt.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
    throw new AppError(409, 'Reservations can be cancelled at least 24 hours before the event.')
  }

  const cancelled = await Booking.findOneAndUpdate({ _id: booking.id, user: request.user.id, status: 'reserved-unpaid' }, {
    $set: { status: 'cancelled' },
  }, { new: true })
  if (!cancelled) throw new AppError(409, 'This booking has already changed.')

  await Event.updateOne({ _id: booking.event, 'ticketTypes._id': booking.ticketTypeId }, {
    $inc: { 'ticketTypes.$.remaining': booking.quantity, bookingsCount: -1 },
  })
  response.json({ data: { booking: cancelled, inventoryRestored: true } })
}
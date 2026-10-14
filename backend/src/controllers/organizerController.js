import { readFile, rm } from 'node:fs/promises'
import { basename } from 'node:path'
import mongoose from 'mongoose'
import { Booking } from '../models/Booking.js'
import { Event } from '../models/Event.js'
import { OrganizerProfile } from '../models/OrganizerProfile.js'
import { AppError } from '../utils/AppError.js'
import { privateUploadDirectory, validDocumentSignature } from '../middleware/privateDocuments.js'

export async function getMyVerification(request, response) {
  const profile = await OrganizerProfile.findOne({ user: request.user.id }).lean()
  response.json({ data: { profile: profile || null } })
}

export async function submitVerification(request, response) {
  const files = request.files || []
  try {
    if (files.length === 0) throw new AppError(400, 'Upload at least one verification document.')
    for (const file of files) {
      const bytes = await readFile(file.path)
      if (!validDocumentSignature(bytes, file.mimetype)) throw new AppError(400, 'A document does not match its declared file type.')
    }

    let profile = await OrganizerProfile.findOne({ user: request.user.id })
    if (profile && !['not-submitted', 'rejected'].includes(profile.verificationStatus)) {
      throw new AppError(409, 'A verification request is already active or approved.')
    }

    const documents = files.map((file) => ({
      storageName: file.filename,
      originalName: basename(file.originalname).slice(0, 160),
      mimeType: file.mimetype,
      size: file.size,
    }))

    if (!profile) profile = new OrganizerProfile({ user: request.user.id })
    profile.organizationName = request.body.organizationName
    profile.description = request.body.description
    profile.contactPhone = request.body.contactPhone
    profile.documents = documents
    profile.verificationStatus = 'pending'
    profile.reviewMessage = ''
    profile.reviewedBy = null
    profile.reviewedAt = null
    await profile.save()

    response.status(201).json({ data: { profile: {
      id: profile.id,
      organizationName: profile.organizationName,
      verificationStatus: profile.verificationStatus,
      documents: profile.documents.map(({ originalName, mimeType, size }) => ({ originalName, mimeType, size })),
    } } })
  } catch (error) {
    await Promise.all(files.map((file) => rm(file.path, { force: true })))
    throw error
  }
}

export async function listMyEvents(request, response) {
  const events = await Event.find({ organizer: request.user.id }).sort({ updatedAt: -1 }).lean()
  response.json({ data: { events } })
}

async function getOwnedEvent(eventId, organizerId) {
  if (!mongoose.isValidObjectId(eventId)) throw new AppError(404, 'Event not found.')
  const event = await Event.findOne({ _id: eventId, organizer: organizerId }).select('_id title startsAt')
  if (!event) throw new AppError(404, 'Event not found.')
  return event
}

export async function listEventAttendees(request, response) {
  const event = await getOwnedEvent(request.params.eventId, request.user.id)
  const bookings = await Booking.find({ event: event.id })
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .lean()
  response.json({ data: { event: { id: event.id, title: event.title }, attendees: bookings.map((booking) => ({
    reference: booking.reference,
    name: booking.user?.name || 'Deleted account',
    email: booking.user?.email || '',
    ticketType: booking.ticketTypeName,
    quantity: booking.quantity,
    status: booking.status,
    checkedInAt: booking.checkedInAt,
  })) } })
}

function csvCell(value) {
  const safeValue = String(value ?? '').replace(/^[=+\-@]/, "'$&")
  return `"${safeValue.replaceAll('"', '""')}"`
}

export async function exportEventAttendees(request, response) {
  const event = await getOwnedEvent(request.params.eventId, request.user.id)
  const bookings = await Booking.find({ event: event.id }).populate('user', 'name email').sort({ createdAt: -1 }).lean()
  const rows = [
    ['Booking reference', 'Attendee name', 'Email', 'Ticket type', 'Quantity', 'Status'],
    ...bookings.map((booking) => [booking.reference, booking.user?.name, booking.user?.email, booking.ticketTypeName, booking.quantity, booking.status]),
  ]
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  response.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="event-attendees.csv"', 'Cache-Control': 'no-store' })
  response.send(csv)
}

export async function checkInAttendee(request, response) {
  const event = await getOwnedEvent(request.params.eventId, request.user.id)
  const booking = await Booking.findOne({ reference: request.params.reference, event: event.id })
  if (!booking) throw new AppError(404, 'Ticket not found for this event.')
  if (booking.status === 'reserved-unpaid') throw new AppError(409, 'Check-in is disabled for unpaid reservation-only tickets until payments are configured.')
  if (booking.status !== 'confirmed') throw new AppError(409, 'This ticket is cancelled or has already been checked in.')
  booking.status = 'checked-in'
  booking.checkedInAt = new Date()
  await booking.save()
  response.json({ data: { reference: booking.reference, status: booking.status, checkedInAt: booking.checkedInAt } })
}
import { readFile } from 'node:fs/promises'
import { basename, relative, resolve, sep } from 'node:path'
import mongoose from 'mongoose'
import { AuditLog } from '../models/AuditLog.js'
import { Booking } from '../models/Booking.js'
import { Event } from '../models/Event.js'
import { OrganizerProfile } from '../models/OrganizerProfile.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { privateUploadDirectory } from '../middleware/privateDocuments.js'

export async function listVerificationQueue(request, response) {
  const status = ['pending', 'under-review', 'approved', 'rejected', 'suspended'].includes(request.query.status)
    ? request.query.status
    : 'pending'
  const profileDocuments = await OrganizerProfile.find({ verificationStatus: status })
    .populate('user', 'name email createdAt')
    .sort({ createdAt: 1 })
    .lean()
  const profiles = profileDocuments.map((profile) => ({ ...profile, id: String(profile._id) }))
  response.json({ data: { profiles } })
}

export async function getVerificationDetails(request, response) {
  if (!mongoose.isValidObjectId(request.params.profileId)) throw new AppError(404, 'Verification request not found.')
  const profile = await OrganizerProfile.findById(request.params.profileId)
    .select('+documents.storageName')
    .populate('user', 'name email phone createdAt')
    .lean()
  if (!profile) throw new AppError(404, 'Verification request not found.')
  response.json({ data: { profile } })
}

export async function downloadVerificationDocument(request, response) {
  if (!mongoose.isValidObjectId(request.params.profileId)) throw new AppError(404, 'Document not found.')
  const profile = await OrganizerProfile.findById(request.params.profileId).select('+documents.storageName')
  const document = profile?.documents.find((item) => item.storageName === request.params.storageName)
  if (!document) throw new AppError(404, 'Document not found.')

  const filePath = resolve(privateUploadDirectory, document.storageName)
  const safeRelativePath = relative(privateUploadDirectory, filePath)
  if (safeRelativePath.startsWith(`..${sep}`) || safeRelativePath === '..') throw new AppError(400, 'Invalid document path.')
  const file = await readFile(filePath)
  response.set({
    'Content-Type': document.mimeType,
    'Content-Length': file.length,
    'Content-Disposition': `attachment; filename="${basename(document.originalName).replace(/["\\\r\n]/g, '_')}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.send(file)
}

export async function reviewOrganizer(request, response) {
  if (!mongoose.isValidObjectId(request.params.profileId)) throw new AppError(404, 'Verification request not found.')
  const profile = await OrganizerProfile.findById(request.params.profileId)
  if (!profile) throw new AppError(404, 'Verification request not found.')

  const stateByAction = {
    approve: 'approved',
    reject: 'rejected',
    'request-info': 'under-review',
    suspend: 'suspended',
  }
  const status = stateByAction[request.body.action]
  profile.verificationStatus = status
  profile.reviewMessage = request.body.reason
  profile.reviewedBy = request.user.id
  profile.reviewedAt = new Date()
  await profile.save()

  const userStatus = status === 'suspended' ? 'suspended' : 'active'
  const userRole = status === 'approved' ? 'organizer' : status === 'rejected' ? 'user' : undefined
  await User.updateOne({ _id: profile.user }, { $set: { status: userStatus, ...(userRole ? { role: userRole } : {}) } })
  await AuditLog.create({ actor: request.user.id, action: `organizer.${request.body.action}`, targetType: 'OrganizerProfile', targetId: profile.id, reason: request.body.reason })

  response.json({ data: { profile: {
    id: profile.id,
    organizationName: profile.organizationName,
    verificationStatus: profile.verificationStatus,
    reviewMessage: profile.reviewMessage,
    reviewedAt: profile.reviewedAt,
  } } })
}

export async function listPendingEvents(request, response) {
  const eventDocuments = await Event.find({ status: 'pending-approval' })
    .populate('organizer', 'name email')
    .sort({ createdAt: 1 })
    .lean()
  const events = eventDocuments.map((event) => ({ ...event, id: String(event._id) }))
  response.json({ data: { events } })
}

export async function reviewEvent(request, response) {
  if (!mongoose.isValidObjectId(request.params.eventId)) throw new AppError(404, 'Event not found.')
  const event = await Event.findById(request.params.eventId)
  if (!event) throw new AppError(404, 'Event not found.')
  if (event.status !== 'pending-approval') throw new AppError(409, 'Only pending events can be moderated.')

  const statusByAction = { approve: 'published', reject: 'rejected', suspend: 'suspended', cancel: 'cancelled' }
  if (request.body.action === 'approve') {
    const { OrganizerProfile: Profile } = await import('../models/OrganizerProfile.js')
    const profile = await Profile.findOne({ user: event.organizer }).select('verificationStatus')
    if (!profile || profile.verificationStatus !== 'approved') throw new AppError(403, 'Only verified organizers can publish events.')
    if (event.startsAt <= new Date()) throw new AppError(400, 'Past events cannot be published.')
    event.publishedAt = new Date()
  }

  event.status = statusByAction[request.body.action]
  event.moderationMessage = request.body.reason
  event.approvedBy = request.user.id
  await event.save()
  await AuditLog.create({ actor: request.user.id, action: `event.${request.body.action}`, targetType: 'Event', targetId: event.id, reason: request.body.reason })
  response.json({ data: { event } })
}

export async function getAuditLogs(request, response) {
  const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
  const logs = await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50).lean()
  response.json({ data: { logs, page, limit: 50 } })
}

export async function getAdminOverview(request, response) {
  const [users, organizers, pendingVerification, approvedOrganizers, rejectedOrganizers, pendingEvents, publishedEvents, bookings, recentActivity] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'organizer' }),
    OrganizerProfile.countDocuments({ verificationStatus: { $in: ['pending', 'under-review'] } }),
    OrganizerProfile.countDocuments({ verificationStatus: 'approved' }),
    OrganizerProfile.countDocuments({ verificationStatus: 'rejected' }),
    Event.countDocuments({ status: 'pending-approval' }),
    Event.countDocuments({ status: 'published' }),
    Booking.countDocuments(),
    AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(10).lean(),
  ])

  response.json({ data: {
    users,
    organizers,
    pendingVerification,
    approvedOrganizers,
    rejectedOrganizers,
    pendingEvents,
    publishedEvents,
    bookings,
    revenue: { amount: null, status: 'payments-not-configured' },
    recentActivity,
  } })
}

export async function listUsers(request, response) {
  const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 25))
  const filter = {}
  if (['user', 'organizer', 'admin'].includes(request.query.role)) filter.role = request.query.role
  if (['active', 'suspended'].includes(request.query.status)) filter.status = request.query.status
  if (request.query.q && String(request.query.q).length <= 100) {
    const pattern = new RegExp(String(request.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: pattern }, { email: pattern }]
  }
  const [users, total] = await Promise.all([
    User.find(filter).select('name email role status createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ])
  response.json({ data: { users }, meta: { page, limit, total, pages: Math.ceil(total / limit) } })
}

export async function changeUserStatus(request, response) {
  if (!mongoose.isValidObjectId(request.params.userId)) throw new AppError(404, 'User not found.')
  if (request.params.userId === request.user.id) throw new AppError(409, 'You cannot change your own account status.')
  const target = await User.findById(request.params.userId)
  if (!target || target.role === 'admin') throw new AppError(404, 'User not found.')
  target.status = request.body.status
  await target.save()
  await AuditLog.create({ actor: request.user.id, action: `user.${request.body.status}`, targetType: 'User', targetId: target.id, reason: request.body.reason })
  response.json({ data: { user: { id: target.id, name: target.name, email: target.email, role: target.role, status: target.status } } })
}


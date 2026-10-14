import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { Event } from '../models/Event.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'

export async function updateMyProfile(request, response) {
  const user = await User.findByIdAndUpdate(request.user.id, { $set: request.body }, {
    new: true,
    runValidators: true,
    select: 'name email role status phone createdAt',
  }).lean()
  response.json({ data: { user } })
}

export async function changeMyPassword(request, response) {
  const user = await User.findById(request.user.id).select('+passwordHash')
  if (!await bcrypt.compare(request.body.currentPassword, user.passwordHash)) {
    throw new AppError(400, 'The current password is incorrect.')
  }
  user.passwordHash = await bcrypt.hash(request.body.newPassword, 12)
  await user.save()
  response.status(204).end()
}

export async function listMyWishlist(request, response) {
  const user = await User.findById(request.user.id).populate({
    path: 'wishlist',
    match: { status: 'published' },
    select: 'title category startsAt venue city coverImage ticketTypes status',
  }).lean()
  response.json({ data: { events: user.wishlist.filter(Boolean) } })
}

export async function addWishlistEvent(request, response) {
  if (!mongoose.isValidObjectId(request.params.eventId)) throw new AppError(404, 'Event not found.')
  const eventExists = await Event.exists({ _id: request.params.eventId, status: 'published' })
  if (!eventExists) throw new AppError(404, 'Event not found.')
  await User.updateOne({ _id: request.user.id }, { $addToSet: { wishlist: request.params.eventId } })
  response.status(204).end()
}

export async function removeWishlistEvent(request, response) {
  if (!mongoose.isValidObjectId(request.params.eventId)) throw new AppError(404, 'Event not found.')
  await User.updateOne({ _id: request.user.id }, { $pull: { wishlist: request.params.eventId } })
  response.status(204).end()
}
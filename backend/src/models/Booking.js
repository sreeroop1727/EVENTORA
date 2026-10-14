import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, index: true },
  idempotencyKey: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  ticketTypeName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, max: 10 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['reserved-unpaid', 'confirmed', 'cancelled', 'checked-in'], default: 'reserved-unpaid', index: true },
  checkedInAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false })

bookingSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true })
bookingSchema.index({ event: 1, status: 1 })

export const Booking = mongoose.model('Booking', bookingSchema)
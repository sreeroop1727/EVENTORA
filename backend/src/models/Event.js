import mongoose from 'mongoose'

const ticketTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  price: { type: Number, required: true, min: 0 },
  capacity: { type: Number, required: true, min: 1 },
  remaining: { type: Number, required: true, min: 0 },
  salesStart: { type: Date, default: null },
  salesEnd: { type: Date, default: null },
}, { timestamps: true })

const eventSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160, index: 'text' },
  description: { type: String, required: true, trim: true, maxlength: 12000 },
  category: { type: String, required: true, trim: true, maxlength: 80, index: true },
  coverImage: { type: String, trim: true, maxlength: 2000, default: '' },
  gallery: [{ type: String, trim: true, maxlength: 2000 }],
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true },
  venue: { type: String, required: true, trim: true, maxlength: 200 },
  address: { type: String, trim: true, maxlength: 500, default: '' },
  city: { type: String, required: true, trim: true, maxlength: 100, index: true },
  postalCode: { type: String, trim: true, maxlength: 24, default: '' },
  venueLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], validate: { validator: (value) => value.length === 2, message: 'GeoJSON coordinates must be [longitude, latitude].' } },
  },
  ticketTypes: { type: [ticketTypeSchema], default: [] },
  status: { type: String, enum: ['draft', 'pending-approval', 'published', 'rejected', 'cancelled', 'completed', 'suspended'], default: 'draft', index: true },
  moderationMessage: { type: String, trim: true, maxlength: 2000, default: '' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  publishedAt: { type: Date, default: null },
  bookingsCount: { type: Number, min: 0, default: 0 },
  cancellationPolicy: { type: String, trim: true, maxlength: 3000, default: '' },
}, { timestamps: true, versionKey: false })

eventSchema.index({ status: 1, city: 1, startsAt: 1 })
eventSchema.index({ status: 1, bookingsCount: -1 })
eventSchema.index({ venueLocation: '2dsphere' })

export const Event = mongoose.model('Event', eventSchema)
export const ticketTypeSchemaDefinition = ticketTypeSchema
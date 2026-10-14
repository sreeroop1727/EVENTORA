import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema({
  storageName: { type: String, required: true, select: false },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
}, { _id: false })

const organizerProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  organizationName: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  contactPhone: { type: String, required: true, trim: true, maxlength: 32 },
  verificationStatus: { type: String, enum: ['not-submitted', 'pending', 'under-review', 'approved', 'rejected', 'suspended'], default: 'not-submitted', index: true },
  documents: { type: [documentSchema], default: [] },
  reviewMessage: { type: String, trim: true, maxlength: 2000, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false })

export const OrganizerProfile = mongoose.model('OrganizerProfile', organizerProfileSchema)
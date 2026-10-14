import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'organizer', 'admin'], default: 'user', required: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', required: true },
  phone: { type: String, trim: true, maxlength: 32, default: '' },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
}, { timestamps: true, versionKey: false })

export const User = mongoose.model('User', userSchema)
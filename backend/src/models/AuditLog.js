import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, maxlength: 100 },
  targetType: { type: String, required: true, maxlength: 80 },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reason: { type: String, maxlength: 2000, default: '' },
}, { timestamps: true, versionKey: false })

auditLogSchema.index({ createdAt: -1 })

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
import { model, Schema } from 'mongoose'

export const AuditLog = model('AuditLog', new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
  action: { type: String, required: true },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', index: true },
  metadata: Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
}))

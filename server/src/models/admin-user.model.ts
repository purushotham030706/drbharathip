import { InferSchemaType, model, Schema } from 'mongoose'

const adminUserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['DOCTOR', 'STAFF'], default: 'DOCTOR' },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
}, { timestamps: true })

export type AdminUserDocument = InferSchemaType<typeof adminUserSchema>
export const AdminUser = model('AdminUser', adminUserSchema)

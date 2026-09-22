import { InferSchemaType, model, Schema } from 'mongoose'

const doctorSchema = new Schema({
  name: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  education: [{ type: String, trim: true }],
  bio: { type: String, trim: true },
  specializations: [{ type: String, trim: true }],
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  profileImageUrl: { type: String, trim: true },
  isPlaceholder: { type: Boolean, default: false },
}, { timestamps: true })

export type DoctorDocument = InferSchemaType<typeof doctorSchema>
export const Doctor = model('Doctor', doctorSchema)

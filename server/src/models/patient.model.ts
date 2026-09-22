import { InferSchemaType, model, Schema } from 'mongoose'

const medicalHistorySchema = new Schema({
  previousPregnancies: String,
  previousSurgeries: String,
  medicalConditions: String,
  currentMedications: String,
  allergies: String,
  additionalNotes: String,
}, { _id: false })

const patientSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  age: { type: Number, min: 0, max: 120 },
  medicalHistory: medicalHistorySchema,
}, { timestamps: true })

patientSchema.index({ phone: 1 })

export type PatientDocument = InferSchemaType<typeof patientSchema>
export const Patient = model('Patient', patientSchema)

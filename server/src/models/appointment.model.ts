import { InferSchemaType, model, Schema } from 'mongoose'

export const APPOINTMENT_STATUSES = ['REQUESTED', 'UNDER_REVIEW', 'CONFIRMED', 'REJECTED', 'RESCHEDULE_REQUESTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as const
const locationSnapshotSchema = new Schema({ name: String, address: String, phone: String }, { _id: false })

const appointmentSchema = new Schema({
  referenceNumber: { type: String, required: true, unique: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  locationId: { type: Schema.Types.ObjectId, ref: 'PracticeLocation', required: true },
  reason: { type: String, required: true, trim: true },
  reasonDetail: { type: String, trim: true },
  requestedDate: { type: Date, required: true },
  requestedTime: { type: String, required: true },
  confirmedDate: Date,
  confirmedTime: String,
  confirmedLocationSnapshot: locationSnapshotSchema,
  status: { type: String, enum: APPOINTMENT_STATUSES, default: 'REQUESTED', index: true },
  doctorNotes: String,
  patientNotes: String,
  rejectionReason: String,
  cancelledBy: { type: String, enum: ['DOCTOR', 'PATIENT'] },
  cancellationReason: String,
}, { timestamps: true })

appointmentSchema.index({ locationId: 1, requestedDate: 1 })
appointmentSchema.index({ locationId: 1, confirmedDate: 1, confirmedTime: 1 }, { unique: true, partialFilterExpression: { status: 'CONFIRMED' } })

export type AppointmentDocument = InferSchemaType<typeof appointmentSchema>
export const Appointment = model('Appointment', appointmentSchema)

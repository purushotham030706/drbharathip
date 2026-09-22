import { InferSchemaType, model, Schema, Types } from 'mongoose'

export const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
const scheduleSlotSchema = new Schema({
  dayOfWeek: { type: String, enum: DAYS_OF_WEEK, required: true },
  session: { type: String, enum: ['MORNING', 'AFTERNOON', 'EVENING'], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  slotMinutes: { type: Number, default: 30, min: 5 },
  active: { type: Boolean, default: true },
})

const practiceLocationSchema = new Schema({
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  name: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  phone: { type: String, trim: true },
  mapUrl: { type: String, trim: true },
  active: { type: Boolean, default: true },
  weeklySchedule: [scheduleSlotSchema],
  scheduleIsDemoData: { type: Boolean, default: false },
}, { timestamps: true })

practiceLocationSchema.index({ doctorId: 1, name: 1 }, { unique: true })

export type ScheduleSlot = InferSchemaType<typeof scheduleSlotSchema>
export type PracticeLocationDocument = InferSchemaType<typeof practiceLocationSchema> & { doctorId: Types.ObjectId }
export const PracticeLocation = model('PracticeLocation', practiceLocationSchema)

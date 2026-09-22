import { randomInt } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { Appointment } from '../models/appointment.model.js'
import { Doctor } from '../models/doctor.model.js'
import { Patient } from '../models/patient.model.js'
import { PracticeLocation } from '../models/practice-location.model.js'

export const publicRouter = Router()

const appointmentSchema = z.object({
  patient: z.object({ fullName: z.string().trim().min(2).max(120), phone: z.string().trim().regex(/^\d{10}$/, 'Enter a valid 10-digit phone number'), email: z.string().email().max(254).optional(), age: z.number().int().min(0).max(120) }),
  locationId: z.string().regex(/^[a-f\d]{24}$/i), requestedDate: z.string().date(), requestedTime: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
  reason: z.string().trim().min(2).max(120), reasonDetail: z.string().trim().max(1_000).optional(), medicalHistory: z.object({ previousPregnancies: z.string().max(2_000).optional(), previousSurgeries: z.string().max(2_000).optional(), medicalConditions: z.string().max(2_000).optional(), currentMedications: z.string().max(2_000).optional(), allergies: z.string().max(2_000).optional(), additionalNotes: z.string().max(2_000).optional() }).optional(), consent: z.literal(true),
})

function referenceNumber(): string { return `BRH-${new Date().getFullYear()}-${randomInt(100000, 1_000_000)}` }

publicRouter.get('/doctor', async (_request, response, next) => {
  try { const doctor = await Doctor.findOne().select('name title education bio specializations profileImageUrl').lean(); response.json({ doctor }) } catch (error) { next(error) }
})

publicRouter.get('/locations', async (_request, response, next) => {
  try { const locations = await PracticeLocation.find({ active: true }).select('name city weeklySchedule scheduleIsDemoData').lean(); response.json({ locations }) } catch (error) { next(error) }
})

publicRouter.post('/appointments', async (request, response, next) => {
  try {
    const data = appointmentSchema.parse(request.body)
    const location = await PracticeLocation.findOne({ _id: data.locationId, active: true })
    if (!location) { response.status(404).json({ error: { code: 'LOCATION_NOT_FOUND', message: 'That consultation location is unavailable.' } }); return }
    const patient = await Patient.findOneAndUpdate({ phone: data.patient.phone }, { ...data.patient, ...(data.medicalHistory ? { medicalHistory: data.medicalHistory } : {}) }, { upsert: true, new: true, setDefaultsOnInsert: true })
    const appointment = await Appointment.create({ referenceNumber: referenceNumber(), patientId: patient._id, locationId: location._id, requestedDate: new Date(`${data.requestedDate}T00:00:00.000Z`), requestedTime: data.requestedTime, reason: data.reason, reasonDetail: data.reasonDetail, patientNotes: data.reasonDetail })
    response.status(201).json({ referenceNumber: appointment.referenceNumber, status: appointment.status })
  } catch (error) { next(error) }
})

const statusLookupSchema = z.object({ referenceNumber: z.string().trim().regex(/^BRH-\d{4}-\d{6}$/), phone: z.string().trim().regex(/^\d{10}$/) })
publicRouter.post('/appointments/status', async (request, response, next) => {
  try {
    const { referenceNumber, phone } = statusLookupSchema.parse(request.body)
    const appointment = await Appointment.findOne({ referenceNumber }).populate({ path: 'patientId', match: { phone }, select: 'phone' }).populate('locationId', 'name').lean()
    if (!appointment || !appointment.patientId) { response.status(404).json({ error: { code: 'NOT_FOUND', message: 'No matching appointment request was found.' } }); return }
    const location = appointment.status === 'CONFIRMED' ? appointment.confirmedLocationSnapshot?.name : (appointment.locationId as unknown as { name: string }).name
    response.json({ referenceNumber: appointment.referenceNumber, status: appointment.status, location: { name: location }, requestedDate: appointment.requestedDate, requestedTime: appointment.requestedTime, confirmedDate: appointment.confirmedDate ?? null, confirmedTime: appointment.confirmedTime ?? null, ...(appointment.patientNotes ? { patientNotes: appointment.patientNotes } : {}) })
  } catch (error) { next(error) }
})

import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { Doctor } from '../models/doctor.model.js'
import { PracticeLocation } from '../models/practice-location.model.js'
import { jssSchedule, nirmalaSchedule } from './schedule.js'

async function seed(): Promise<void> {
  await connectDatabase()
  const doctor = await Doctor.findOneAndUpdate(
    { name: 'Dr. Bharathi P' },
    { name: 'Dr. Bharathi P', title: 'Obstetrician & Gynaecologist', education: ['MBBS — Mysore Medical College, Mysuru', 'Postgraduate medical training — KMC, Mangalore', 'Additional training in infertility care — Medline Academy'], isPlaceholder: false },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  await PracticeLocation.findOneAndUpdate({ doctorId: doctor._id, name: 'Nirmala Multi Specialty Hospital' }, { doctorId: doctor._id, name: 'Nirmala Multi Specialty Hospital', city: 'Mysuru', active: true, weeklySchedule: nirmalaSchedule, scheduleIsDemoData: false }, { upsert: true, new: true, setDefaultsOnInsert: true })
  await PracticeLocation.findOneAndUpdate({ doctorId: doctor._id, name: 'JSS Hospital, Chamarajanagar' }, { doctorId: doctor._id, name: 'JSS Hospital, Chamarajanagar', city: 'Chamarajanagar', active: true, weeklySchedule: jssSchedule, scheduleIsDemoData: false }, { upsert: true, new: true, setDefaultsOnInsert: true })
  console.info('Verified doctor profile and consultation schedules seeded.')
}

seed().then(disconnectDatabase).catch(async (error: unknown) => { console.error(error); await disconnectDatabase(); process.exit(1) })

import type { ScheduleSlot } from '../models/practice-location.model.js'

const slot = (dayOfWeek: ScheduleSlot['dayOfWeek'], session: ScheduleSlot['session'], startTime: string, endTime: string): ScheduleSlot => ({ dayOfWeek, session, startTime, endTime, slotMinutes: 30, active: true })

export const nirmalaSchedule: ScheduleSlot[] = [
  slot('MONDAY', 'MORNING', '09:30', '13:00'),
  slot('TUESDAY', 'MORNING', '09:30', '13:00'), slot('TUESDAY', 'AFTERNOON', '13:00', '19:00'),
  slot('WEDNESDAY', 'MORNING', '09:30', '13:00'),
  slot('THURSDAY', 'MORNING', '09:30', '13:00'), slot('THURSDAY', 'AFTERNOON', '13:00', '19:00'),
  slot('FRIDAY', 'MORNING', '09:30', '13:00'),
  slot('SATURDAY', 'MORNING', '09:30', '13:00'), slot('SATURDAY', 'AFTERNOON', '13:00', '19:00'),
]

export const jssSchedule: ScheduleSlot[] = [
  slot('MONDAY', 'AFTERNOON', '15:00', '19:00'),
  slot('WEDNESDAY', 'AFTERNOON', '15:00', '19:00'),
  slot('FRIDAY', 'AFTERNOON', '15:00', '19:00'),
]

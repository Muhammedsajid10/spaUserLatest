// src/calendar/bookingUtils.js
import { getEmployeeShiftHours } from './shiftUtils';
import { localDateKey } from './dateUtils';

// Convert "HH:MM" -> minutes since midnight
export const timeToMinutes = (timeStr) => {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return h * 60 + m;
};

// Add minutes to "HH:MM"
export const addMinutesToTime = (timeStr, minutes) => {
  const total = timeToMinutes(timeStr) + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Check overlap between [start, start+duration) and existing bookings
export const isTimeSlotConflicting = (startTime, duration, existingBookings = []) => {
  const s = timeToMinutes(startTime);
  const e = s + duration;
  return existingBookings.some(b => {
    const bs = timeToMinutes(b.startTime);
    const be = timeToMinutes(b.endTime);
    return s < be && e > bs;
  });
};

// Build candidate start times inside an employee's shifts.
// intervalMinutes controls stepping (10 = every 10 minutes).
export const getValidTimeSlotsForProfessional = (employee, date, serviceDuration, appointments = {}) => {
  const shifts = getEmployeeShiftHours(employee, date); // [{start: "09:00", end: "17:00"}, ...]
  if (!shifts || shifts.length === 0) return [];

  // existing persisted bookings for this pro on the day
  const dayKey = localDateKey(date);
  const persisted = (appointments?.[employee._id] && appointments[employee._id][dayKey])
    ? Object.values(appointments[employee._id][dayKey]).map(a => ({
        startTime: a.startTime || a.time || a.slot || a.keyStart || a._start || a.start, // adapt shape
        endTime: a.endTime || addMinutesToTime(a.startTime || a.time, a.duration || 30),
      }))
    : [];

  const intervalMinutes = 10;
  const slots = [];

  shifts.forEach(shift => {
    let cursor = shift.start; // "HH:MM"
    while (timeToMinutes(cursor) + serviceDuration <= timeToMinutes(shift.end)) {
      // ensure doesn't conflict with persisted bookings
      if (!isTimeSlotConflicting(cursor, serviceDuration, persisted)) {
        slots.push(cursor);
      }
      cursor = addMinutesToTime(cursor, intervalMinutes);
    }
  });

  return slots;
};

// Filter professionals that have at least one slot
export const getAvailableProfessionalsForService = (serviceId, date, employees, appointments, services) => {
  const svc = services.find(s => s._id === serviceId);
  if (!svc) return [];

  return employees
    .map(emp => {
      const slots = getValidTimeSlotsForProfessional(emp, date, svc.duration, appointments);
      return { professional: emp, slots };
    })
    .filter(x => x.slots && x.slots.length > 0);
};
// src/calendar/bookingUtils.js
// removed imports that may be missing:
// import { getEmployeeShiftHours } from './shiftUtils';
// import { localDateKey } from './dateUtils';

import { employeesAPI, bookingsAPI } from './services/api';

/**
 * Utility helpers (declared as functions so they are hoisted and safe to call from other funcs)
 */

// Convert Date -> local YYYY-MM-DD (use local date, not UTC)
export function localDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Convert various time/date representations -> local "HH:MM"
export function toLocalHHMM(val) {
  if (!val) return null;
  if (typeof val !== 'string') val = String(val);
  if (val.includes('T')) {
    const dt = new Date(val);
    if (isNaN(dt)) return null;
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  if (val.includes(':')) {
    const parts = val.split(':');
    return `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}`;
  }
  return null;
}

// Convert "HH:MM" -> minutes since midnight
export function timeToMinutesFn(timeStr) {
  const [h = 0, m = 0] = (timeStr || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
export const timeToMinutes = timeToMinutesFn; // backward-friendly name

// Convert minutes -> "HH:MM"
export function minutesToTime(min) {
  const hh = String(Math.floor(min / 60)).padStart(2, '0');
  const mm = String(min % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Add minutes to HH:MM
export function addMinutesToTime(timeStr, minutes) {
  const total = timeToMinutesFn(timeStr) + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Round up a time to interval
export function roundUpTimeToInterval(timeStr, interval) {
  const mins = timeToMinutesFn(timeStr);
  const rem = mins % interval;
  if (rem === 0) return timeStr;
  const next = mins + (interval - rem);
  const h = Math.floor(next / 60) % 24;
  const m = next % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
export function ceilToInterval(min, interval) { return Math.ceil(min / interval) * interval; }
export function floorToInterval(min, interval) { return Math.floor(min / interval) * interval; }

// Check overlap between [start, start+duration) and existing bookings
export function isTimeSlotConflicting(startTime, duration, existingBookings = []) {
  const s = timeToMinutesFn(startTime);
  const e = s + duration;
  return existingBookings.some(b => {
    const bs = timeToMinutesFn(b.startTime);
    const be = timeToMinutesFn(b.endTime);
    return s < be && e > bs;
  });
}

/**
 * Parse employee shift/schedule objects into array of { start: "HH:MM", end: "HH:MM" }
 */
export function getEmployeeShiftHours(employee, date) {
  if (!employee) return [];
  const schedule =
    employee.workSchedule ||
    employee.schedule ||
    employee.shifts ||
    employee.work_hours ||
    employee.availability;
  if (!schedule) return [];

  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayIndex = (date instanceof Date ? date : new Date(date)).getDay();
  const dayKey = dayNames[dayIndex];
  const shortKey = dayKey.slice(0,3);

  let dayEntry = null;
  if (typeof schedule === 'object' && !Array.isArray(schedule)) {
    dayEntry = schedule[dayKey] ?? schedule[shortKey] ?? schedule[String(dayIndex)] ?? schedule[`day${dayIndex}`];
  }

  if (!dayEntry && Array.isArray(schedule)) {
    const matches = schedule.filter(s => {
      const sday = String((s.day || s.weekDay || s.week || '')).toLowerCase();
      if (!sday) return true;
      return sday === dayKey || sday === shortKey || Number(sday) === dayIndex;
    });
    dayEntry = matches.length ? matches : null;
  }

  if (!dayEntry) return [];

  if (dayEntry && !Array.isArray(dayEntry)) {
    if ('isWorking' in dayEntry && dayEntry.isWorking === false) return [];
    if (Array.isArray(dayEntry.shiftsData) && dayEntry.shiftsData.length) {
      return dayEntry.shiftsData.map(s => {
        const start = s.startTime || s.start || s.from || s.open;
        const end = s.endTime || s.end || s.to || s.close;
        const fmt = (t) => (typeof t === 'string' && t.includes(':')) ? t : String(t).padStart(4,'0').replace(/^(\d{2})(\d{2})$/,'$1:$2');
        return { start: fmt(start), end: fmt(end) };
      }).filter(s => {
        const [sh, sm] = s.start.split(':').map(Number);
        const [eh, em] = s.end.split(':').map(Number);
        return (eh*60+em) > (sh*60+sm);
      });
    }
    const start = dayEntry.startTime || dayEntry.start || dayEntry.from || dayEntry.open;
    const end = dayEntry.endTime || dayEntry.end || dayEntry.to || dayEntry.close;
    if (!start || !end) return [];
    const fmt = (t) => (typeof t === 'string' && t.includes(':')) ? t : String(t).padStart(4,'0').replace(/^(\d{2})(\d{2})$/,'$1:$2');
    const sObj = { start: fmt(start), end: fmt(end) };
    const [sh, sm] = sObj.start.split(':').map(Number);
    const [eh, em] = sObj.end.split(':').map(Number);
    if ((eh*60+em) <= (sh*60+sm)) return [];
    return [sObj];
  }

  if (Array.isArray(dayEntry)) {
    return dayEntry.map(s => {
      const start = s.start || s.from || s.open || s.startTime;
      const end = s.end || s.to || s.close || s.endTime;
      const fmt = (t) => (typeof t === 'string' && t.includes(':')) ? t : String(t).padStart(4,'0').replace(/^(\d{2})(\d{2})$/,'$1:$2');
      return { start: fmt(start), end: fmt(end) };
    }).filter(s => {
      const [sh, sm] = s.start.split(':').map(Number);
      const [eh, em] = s.end.split(':').map(Number);
      return (eh*60+em) > (sh*60+sm);
    });
  }

  return [];
}

/**
 * Build candidate start times inside an employee's shifts.
 * intervalMinutes controls stepping (15 = every 15 minutes).
 */
export function getValidTimeSlotsForProfessional(employee, date, serviceDuration, appointments = {}) {
  const dateLocal = (date instanceof Date) ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : new Date(date);
  const dayKey = localDateKey(dateLocal);
  const intervalMinutes = 15;

  console.debug('[bookingUtils] getValidTimeSlotsForProfessional start', {
    employeeId: employee?._id || employee?.id || employee,
    date: dayKey,
    serviceDuration
  });

  const shifts = getEmployeeShiftHours(employee, dateLocal);
  console.debug('[bookingUtils] employee shifts found', { employeeId: employee?._id, shifts });

  if (!shifts || shifts.length === 0) {
    console.debug('[bookingUtils] no shifts for employee on', dayKey, '=> skipping');
    return [];
  }

  const persisted = (appointments?.[employee._id] && appointments[employee._id][dayKey])
    ? Object.values(appointments[employee._id][dayKey]).map(a => {
        const rawStart = a.startTime || a.time || a.slot || a.start || a.appointmentDate;
        const startHHMM = toLocalHHMM(rawStart) || (a.startTime && a.startTime.includes(':') ? a.startTime : null);
        const duration = a.duration || a.totalDuration || (a.services && a.services[0] && a.services[0].duration) || 30;
        const endHHMM = startHHMM ? addMinutesToTime(startHHMM, duration) : null;
        return {
          startTime: startHHMM,
          endTime: endHHMM
        };
      }).filter(x => x.startTime && x.endTime)
    : [];

  console.debug('[bookingUtils] persisted bookings for day', { employeeId: employee._id, dayKey, persistedCount: persisted.length });

  const todayLocalKey = localDateKey(new Date());
  const isToday = (dayKey === todayLocalKey);
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const slots = [];

  shifts.forEach(shift => {
    const shiftStart = shift.start;
    const shiftEnd = shift.end;
    let cursor = shiftStart;
    if (isToday) {
      const roundedNow = roundUpTimeToInterval(nowHHMM, intervalMinutes);
      if (timeToMinutesFn(roundedNow) + serviceDuration > timeToMinutesFn(shiftEnd)) {
        return;
      }
      cursor = (timeToMinutesFn(roundedNow) > timeToMinutesFn(shiftStart)) ? roundedNow : shiftStart;
    }

    while (timeToMinutesFn(cursor) + serviceDuration <= timeToMinutesFn(shiftEnd)) {
      if (!isTimeSlotConflicting(cursor, serviceDuration, persisted)) {
        // ensure cursor is aligned to interval grid
        const aligned = roundUpTimeToInterval(cursor, intervalMinutes);
        if (aligned === cursor) slots.push(cursor);
        else {
          // if cursor not aligned, push aligned next (but ensure within shift)
          if (timeToMinutesFn(aligned) + serviceDuration <= timeToMinutesFn(shiftEnd)) slots.push(aligned);
        }
      }
      cursor = addMinutesToTime(cursor, intervalMinutes);
    }
  });

  console.debug('[bookingUtils] getValidTimeSlotsForProfessional slots computed count', slots.length);
  // unique and sorted
  const uniq = Array.from(new Set(slots)).sort((a,b) => timeToMinutesFn(a) - timeToMinutesFn(b));
  return uniq;
}

/**
 * Filter professionals that have at least one slot for the given service on the date.
 */
export function getAvailableProfessionalsForService(serviceId, date, employees, appointments, services) {
  const svc = services.find(s => s._id === serviceId || s.id === serviceId);
  if (!svc) return [];
  return employees
    .map(emp => {
      const duration = svc.duration || svc.minutes || 30;
      const slots = getValidTimeSlotsForProfessional(emp, date, duration, appointments);
      return { professional: emp, slots };
    })
    .filter(x => x.slots && x.slots.length > 0);
}

/**
 * Compute sequential start times with bookings/shifts considered for each professional.
 * Returns sequences where each service start is available for its assigned professional.
 */
export async function computeSequentialServiceStartTimesWithBookings(servicesOrdered = [], professionalsMap = {}, date = new Date(), appointmentsIndex = {}) {
  console.log('[bookingUtils] computeSequentialServiceStartTimesWithBookings start', {
    services: servicesOrdered.map(s => s._id || s.id),
    date: localDateKey(date),
    professionalsMapKeys: Object.keys(professionalsMap || {})
  });

  if (!Array.isArray(servicesOrdered) || servicesOrdered.length === 0) return [];

  const perServiceSlots = {};
  for (const svc of servicesOrdered) {
    const emp = professionalsMap?.[svc._id];
    if (!emp) {
      console.warn('[bookingUtils] computeSequential... missing professional for service', svc._id);
      return [];
    }
    const duration = svc.duration || svc.minutes || 30;
    const employeeId = emp._id || emp.id;
    const empAppointments = (appointmentsIndex && appointmentsIndex[employeeId]) || {};
    try {
      const slots = getValidTimeSlotsForProfessional(emp, date, duration, empAppointments || {});
      console.log('[bookingUtils] slots for service', svc._id, 'employee', employeeId, 'count', slots && slots.length ? slots.length : 0);
      perServiceSlots[svc._id] = new Set(Array.isArray(slots) ? slots : []);
    } catch (err) {
      console.error('[bookingUtils] error computing slots for', svc._id, employeeId, err);
      perServiceSlots[svc._id] = new Set();
    }
  }

  const firstSvc = servicesOrdered[0];
  const candidates = Array.from(perServiceSlots[firstSvc._id] || []).sort((a,b) => timeToMinutesFn(a) - timeToMinutesFn(b));
  if (!candidates.length) return [];

  const offsets = [];
  let acc = 0;
  for (let i = 0; i < servicesOrdered.length; i++) {
    offsets.push(acc);
    acc += servicesOrdered[i].duration || servicesOrdered[i].minutes || 30;
  }

  const sequences = [];
  candidateLoop:
  for (const start of candidates) {
    if (!start) continue;
    const seq = [];
    for (let i = 0; i < servicesOrdered.length; i++) {
      const svc = servicesOrdered[i];
      const offsetMinutes = offsets[i];
      const tStart = addMinutesToTime(start, offsetMinutes);
      const tEnd = addMinutesToTime(tStart, svc.duration || svc.minutes || 30);
      const slotsSet = perServiceSlots[svc._id] || new Set();
      if (!slotsSet.has(tStart)) {
        continue candidateLoop;
      }
      const emp = professionalsMap[svc._id];
      const employeeId = emp._id || emp.id;
      seq.push({
        serviceId: svc._id,
        employeeId,
        startTime: tStart,
        endTime: tEnd,
        duration: svc.duration || svc.minutes || 30
      });
    }
    sequences.push({ startTime: start, sequence: seq });
    if (sequences.length >= 80) break;
  }

  console.log('[bookingUtils] computed sequences count', sequences.length);
  return sequences;
}

/**
 * Simpler sequential computation that reuses getValidTimeSlotsForProfessional (kept for compatibility).
 */
export async function computeSequentialServiceStartTimes(servicesOrdered = [], professionalsMap = {}, date = new Date(), appointments = {}) {
  // Validate
  if (!Array.isArray(servicesOrdered) || servicesOrdered.length === 0) return [];
  const dateObj = (typeof date === 'string') ? new Date(date) : new Date(date);

  const perServiceSlots = {};
  for (const svc of servicesOrdered) {
    const emp = professionalsMap?.[svc._id];
    if (!emp || (!emp._id && !emp.id)) return [];
    const duration = svc.duration || svc.minutes || 30;
    const slots = getValidTimeSlotsForProfessional(emp, dateObj, duration, appointments);
    perServiceSlots[svc._id] = new Set(Array.isArray(slots) ? slots : []);
  }

  const firstSvc = servicesOrdered[0];
  const candidates = Array.from(perServiceSlots[firstSvc._id] || []);
  if (!candidates.length) return [];

  const offsets = [];
  let acc = 0;
  for (let i = 0; i < servicesOrdered.length; i++) {
    offsets.push(acc);
    acc += servicesOrdered[i].duration || servicesOrdered[i].minutes || 30;
  }

  const sequences = [];
  candidateLoop:
  for (const start of candidates) {
    if (!start || typeof start !== 'string') continue;
    const seq = [];
    for (let i = 0; i < servicesOrdered.length; i++) {
      const svc = servicesOrdered[i];
      const emp = professionalsMap[svc._id];
      const offsetMinutes = offsets[i];
      const tStart = addMinutesToTime(start, offsetMinutes);
      const slotsSet = perServiceSlots[svc._id] || new Set();
      if (!slotsSet.has(tStart)) {
        continue candidateLoop;
      }
      const duration = svc.duration || svc.minutes || 30;
      const tEnd = addMinutesToTime(tStart, duration);
      seq.push({
        serviceId: svc._id,
        employeeId: emp._id || emp.id,
        startTime: tStart,
        endTime: tEnd,
        duration
      });
    }
    sequences.push({ startTime: start, sequence: seq });
    if (sequences.length >= 40) break;
  }

  return sequences;
}
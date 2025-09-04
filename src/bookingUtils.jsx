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
 * Enhanced to handle 24-hour shifts and complex admin schedule formats
 */
export function getEmployeeShiftHours(employee, date) {
  if (!employee) return [];
  
  console.log('[SHIFT DEBUG] Employee data:', {
    id: employee._id || employee.id,
    name: employee.name || `${employee.user?.firstName || ''} ${employee.user?.lastName || ''}`.trim(),
    workSchedule: employee.workSchedule,
    schedule: employee.schedule,
    shifts: employee.shifts,
    work_hours: employee.work_hours,
    availability: employee.availability
  });
  
  // Try multiple possible schedule property names
  const schedule =
    employee.workSchedule ||
    employee.schedule ||
    employee.shifts ||
    employee.work_hours ||
    employee.availability;
  
  if (!schedule) {
    console.warn('[bookingUtils] No schedule found for employee', employee._id || employee.id, '- using 24/7 availability');
    // Return 24-hour availability instead of standard business hours
    return [{ start: '00:00', end: '23:59' }];
  }

  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayIndex = (date instanceof Date ? date : new Date(date)).getDay();
  const dayKey = dayNames[dayIndex];
  const shortKey = dayKey.slice(0,3);

  let dayEntry = null;
  
  // Handle object-based schedules (most common in admin side)
  if (typeof schedule === 'object' && !Array.isArray(schedule)) {
    // PRIORITY 1: Check for specific date override (YYYY-MM-DD format)
    const dateStr = localDateKey(date); // e.g., "2025-09-04"
    dayEntry = schedule[dateStr];
    
    if (!dayEntry) {
      // PRIORITY 2: Check regular day names
      dayEntry = schedule[dayKey] ?? schedule[shortKey] ?? schedule[String(dayIndex)] ?? schedule[`day${dayIndex}`];
    }
    
    console.debug('[bookingUtils] Schedule lookup for', dayKey, dateStr, {
      hasSpecificDate: !!schedule[dateStr],
      hasDayName: !!schedule[dayKey],
      usingEntry: dayEntry ? (schedule[dateStr] ? 'specific-date' : 'day-name') : 'none'
    });
  }

  // Handle array-based schedules
  if (!dayEntry && Array.isArray(schedule)) {
    const matches = schedule.filter(s => {
      const sday = String((s.day || s.weekDay || s.week || '')).toLowerCase();
      if (!sday) return true;
      return sday === dayKey || sday === shortKey || Number(sday) === dayIndex;
    });
    dayEntry = matches.length ? matches : null;
  }

  if (!dayEntry) {
    console.warn('[bookingUtils] No day entry for', dayKey, 'in schedule', schedule, '- using 24/7 availability');
    // Return 24-hour availability instead of standard business hours
    return [{ start: '00:00', end: '23:59' }];
  }

  // Handle single day entry (not array)
  if (dayEntry && !Array.isArray(dayEntry)) {
    // Check if not working
    if ('isWorking' in dayEntry && dayEntry.isWorking === false) return [];
    
    // Handle shiftsData array (admin format) - PRIORITY 1
    if (Array.isArray(dayEntry.shiftsData) && dayEntry.shiftsData.length) {
      console.debug('[bookingUtils] Found shiftsData array for', dayKey, dayEntry.shiftsData);
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
    
    // Handle dash-separated shifts string (admin format) - PRIORITY 2 
    if (typeof dayEntry.shifts === 'string' && dayEntry.shifts.includes(' - ')) {
      console.debug('[bookingUtils] Found dash-separated shifts for', dayKey, dayEntry.shifts);
      const parts = dayEntry.shifts.split(' - ').map(s => s.trim());
      if (parts.length === 2) {
        const fmt = (t) => (typeof t === 'string' && t.includes(':')) ? t : String(t).padStart(4,'0').replace(/^(\d{2})(\d{2})$/,'$1:$2');
        const shift = { start: fmt(parts[0]), end: fmt(parts[1]) };
        const [sh, sm] = shift.start.split(':').map(Number);
        const [eh, em] = shift.end.split(':').map(Number);
        if ((eh*60+em) > (sh*60+sm)) {
          console.debug('[bookingUtils] Parsed dash-separated shift:', shift);
          return [shift];
        }
      }
    }
    
    // Handle comma-separated shifts string (admin format) - PRIORITY 3
    if (typeof dayEntry.shifts === 'string' && dayEntry.shifts.includes(',')) {
      console.debug('[bookingUtils] Found comma-separated shifts for', dayKey, dayEntry.shifts);
      const shiftPairs = dayEntry.shifts.split(',').map(s => s.trim());
      const shifts = [];
      for (let i = 0; i < shiftPairs.length; i += 2) {
        if (shiftPairs[i] && shiftPairs[i + 1]) {
          const start = shiftPairs[i];
          const end = shiftPairs[i + 1];
          const fmt = (t) => (typeof t === 'string' && t.includes(':')) ? t : String(t).padStart(4,'0').replace(/^(\d{2})(\d{2})$/,'$1:$2');
          shifts.push({ start: fmt(start), end: fmt(end) });
        }
      }
      console.debug('[bookingUtils] Parsed comma-separated shifts:', shifts);
      return shifts.filter(s => {
        const [sh, sm] = s.start.split(':').map(Number);
        const [eh, em] = s.end.split(':').map(Number);
        return (eh*60+em) > (sh*60+sm);
      });
    }
    
    // Handle single shift (startTime/endTime) - PRIORITY 4
    const start = dayEntry.startTime || dayEntry.start || dayEntry.from || dayEntry.open;
    const end = dayEntry.endTime || dayEntry.end || dayEntry.to || dayEntry.close;
    if (!start || !end) {
      console.debug('[bookingUtils] No start/end time found in dayEntry', dayEntry);
      return [];
    }
    const fmt = (t) => (typeof t === 'string' && t.includes(':')) ? t : String(t).padStart(4,'0').replace(/^(\d{2})(\d{2})$/,'$1:$2');
    const sObj = { start: fmt(start), end: fmt(end) };
    const [sh, sm] = sObj.start.split(':').map(Number);
    const [eh, em] = sObj.end.split(':').map(Number);
    if ((eh*60+em) <= (sh*60+sm)) {
      console.debug('[bookingUtils] Invalid time range', sObj);
      return [];
    }
    console.debug('[bookingUtils] Single shift found:', sObj);
    return [sObj];
  }

  // Handle array of day entries
  if (Array.isArray(dayEntry)) {
    console.debug('[bookingUtils] Processing array of day entries', dayEntry);
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

  console.debug('[bookingUtils] No valid shifts found for', dayKey);
  return [];
}

/**
 * Build candidate start times inside an employee's shifts.
 * intervalMinutes controls stepping (15 = every 15 minutes).
 * Enhanced to support 24-hour shifts from admin schedule data.
 */
export function getValidTimeSlotsForProfessional(employee, date, serviceDuration, appointments = {}) {
  const dateLocal = (date instanceof Date) ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : new Date(date);
  const dayKey = localDateKey(dateLocal);
  const intervalMinutes = 15;

  console.debug('[bookingUtils] getValidTimeSlotsForProfessional start', {
    employeeId: employee?._id || employee?.id || employee,
    date: dayKey,
    serviceDuration,
    employee: employee ? {
      id: employee._id || employee.id,
      name: employee.name || employee.user?.firstName,
      workSchedule: employee.workSchedule ? Object.keys(employee.workSchedule) : 'none'
    } : 'null'
  });

  const shifts = getEmployeeShiftHours(employee, dateLocal);
  console.debug('[bookingUtils] employee shifts found', { 
    employeeId: employee?._id, 
    dayKey,
    shifts,
    shiftsCount: shifts.length,
    shiftsDetail: shifts.map(s => `${s.start}-${s.end}`)
  });

  if (!shifts || shifts.length === 0) {
    console.debug('[bookingUtils] no shifts for employee on', dayKey, '=> returning empty slots');
    return [];
  }

  // Extract existing appointments for this employee on this day
  const empId = employee._id || employee.id;
  const persisted = (appointments?.[empId] && appointments[empId][dayKey])
    ? Object.values(appointments[empId][dayKey]).map(a => {
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

  console.debug('[bookingUtils] existing appointments for employee on day', { 
    employeeId: empId, 
    dayKey, 
    persistedCount: persisted.length,
    persisted: persisted.slice(0, 3) // Log first 3 for debugging
  });

  // Check if today and handle "now" constraint
  const todayLocalKey = localDateKey(new Date());
  const isToday = (dayKey === todayLocalKey);
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const slots = [];

  // Process each shift period
  shifts.forEach((shift, shiftIndex) => {
    const shiftStart = shift.start;
    const shiftEnd = shift.end;
    
    console.debug('[bookingUtils] processing shift', shiftIndex, { shiftStart, shiftEnd, isToday, nowHHMM });
    
    let cursor = shiftStart;
    
    // If today, start from current time (rounded up to next interval)
    if (isToday) {
      const roundedNow = roundUpTimeToInterval(nowHHMM, intervalMinutes);
      console.debug('[bookingUtils] today constraint', { nowHHMM, roundedNow, shiftStart, shiftEnd });
      
      // Check if there's enough time left in shift for the service
      if (timeToMinutesFn(roundedNow) + serviceDuration > timeToMinutesFn(shiftEnd)) {
        console.debug('[bookingUtils] not enough time in shift after now', { roundedNow, shiftEnd, serviceDuration });
        return; // Skip this shift
      }
      
      // Start from later of rounded now or shift start
      cursor = (timeToMinutesFn(roundedNow) > timeToMinutesFn(shiftStart)) ? roundedNow : shiftStart;
    }

    console.debug('[bookingUtils] starting cursor at', cursor, 'for shift', shiftStart, '-', shiftEnd);

    let slotCount = 0;
    const maxSlotsPerShift = 200; // Safety limit
    
    // Generate time slots within this shift
    while (timeToMinutesFn(cursor) + serviceDuration <= timeToMinutesFn(shiftEnd) && slotCount < maxSlotsPerShift) {
      // Check for conflicts with existing appointments
      const hasConflict = isTimeSlotConflicting(cursor, serviceDuration, persisted);
      
      if (!hasConflict) {
        // Ensure cursor is aligned to interval grid
        const aligned = roundUpTimeToInterval(cursor, intervalMinutes);
        if (aligned === cursor) {
          slots.push(cursor);
          slotCount++;
        } else {
          // If cursor not aligned, push aligned next (but ensure within shift)
          if (timeToMinutesFn(aligned) + serviceDuration <= timeToMinutesFn(shiftEnd)) {
            slots.push(aligned);
            slotCount++;
          }
        }
      }
      
      // Move to next interval
      cursor = addMinutesToTime(cursor, intervalMinutes);
    }
    
    console.debug('[bookingUtils] shift', shiftIndex, 'generated', slotCount, 'slots');
  });

  console.debug('[bookingUtils] total slots before deduplication', slots.length);
  
  // Remove duplicates and sort
  const uniq = Array.from(new Set(slots)).sort((a,b) => timeToMinutesFn(a) - timeToMinutesFn(b));
  
  console.debug('[bookingUtils] getValidTimeSlotsForProfessional final result', {
    employeeId: empId,
    dayKey,
    totalSlots: uniq.length,
    firstFew: uniq.slice(0, 10),
    lastFew: uniq.slice(-5),
    shifts: shifts.map(s => `${s.start}-${s.end}`),
    employeeName: employee?.name || employee?.user?.firstName
  });
  
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
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

  // Trim and normalize spaces
  const input = val.trim();

  // 1) ISO datetime (contains 'T') -> convert to local HH:mm
  if (input.includes('T')) {
    // Extract the raw time portion after the 'T' (strip timezone offsets like 'Z' or '+02:00')
    const afterT = input.split('T')[1] || '';
    const rawTimeMatch = afterT.replace(/Z|[+-]\d{2}:?\d{2}$/, '').match(/^(\d{1,2}:\d{2})/);
    const rawHHMM = rawTimeMatch ? rawTimeMatch[1].padStart(5, '0') : null;

    const dt = new Date(input);
    // If date parsing fails, fall back to raw HH:MM
    if (isNaN(dt)) return rawHHMM;

    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    const parsedHHMM = `${hh}:${mm}`;

    // If the raw time in the ISO string differs from the parsed local time,
    // that usually indicates the backend serialized a local time as UTC (added 'Z')
    // or included an offset. In that case prefer the raw HH:MM (admin-entered local time)
    // to avoid shifting times unexpectedly in the UI.
    if (rawHHMM && rawHHMM !== parsedHHMM) {
      console.warn('[bookingUtils] ISO time mismatch: parsed local time differs from raw ISO time. Using raw time to avoid timezone shift.', { input, rawHHMM, parsedHHMM });
      return rawHHMM;
    }

    return parsedHHMM;
  }

  // 2) AM/PM patterns like "2:30 PM", "12:00 am"
  const ampm = input.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (ampm) {
    let hh = parseInt(ampm[1], 10);
    const mm = ampm[2];
    const period = ampm[3].toUpperCase();
    if (period === 'AM' && hh === 12) hh = 0;
    if (period === 'PM' && hh !== 12) hh += 12;
    return `${String(hh).padStart(2, '0')}:${mm}`;
  }

  // 3) HH:mm or H:mm possibly with stray AM/PM suffix
  if (input.includes(':')) {
    const [hRaw, mRaw] = input.split(':');
    // Drop anything after minutes that's not numeric (e.g., "30 PM")
    const mmOnly = String((mRaw || '').trim()).replace(/[^0-9].*$/, '');
    const hh = String(parseInt(hRaw, 10) || 0).padStart(2, '0');
    const mm = String(parseInt(mmOnly, 10) || 0).padStart(2, '0');
    return `${hh}:${mm}`;
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

// Format time from 24-hour to 12-hour AM/PM format
export function formatTimeToAMPM(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return timeStr;
  
  const [hours, minutes] = timeStr.split(':').map(num => parseInt(num) || 0);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
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
  // Always normalize to HH:mm first per rules
  const normStart = toLocalHHMM(startTime) || startTime;
  const s = timeToMinutesFn(normStart);
  const e = s + duration;
  return (existingBookings || []).some(b => {
    const normBs = toLocalHHMM(b.startTime) || b.startTime;
    const normBe = toLocalHHMM(b.endTime) || b.endTime;
    const bs = timeToMinutesFn(normBs);
    const be = timeToMinutesFn(normBe);
    // Overlap if slotStart < bookingEnd && slotEnd > bookingStart
    return s < be && e > bs;
  });
}

/**
 * Parse employee shift/schedule objects into array of { start: "HH:MM", end: "HH:MM" }
 * Enhanced to handle 24-hour shifts and complex admin schedule formats
 */
export function getEmployeeShiftHours(employee, date) {
  if (!employee) return [];
  
  // Check if employee is active - return empty schedule if not active
  if (employee.isActive === false) {
    console.log('[SHIFT DEBUG] Employee is inactive, returning no shifts:', {
      id: employee._id || employee.id,
      name: employee.name || `${employee.user?.firstName || ''} ${employee.user?.lastName || ''}`.trim(),
      isActive: employee.isActive
    });
    return [];
  }
  
  console.log('[SHIFT DEBUG] Employee data:', {
    id: employee._id || employee.id,
    name: employee.name || `${employee.user?.firstName || ''} ${employee.user?.lastName || ''}`.trim(),
    isActive: employee.isActive,
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
    console.warn('[bookingUtils] No schedule found for employee', employee._id || employee.id, '- using 24-hour availability (00:00-23:59)');
    // Return 24-hour availability for all active employees without schedules
    // return [{ start: '00:00', end: '23:59' }];
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
    console.warn('[bookingUtils] No day entry for', dayKey, 'in schedule', schedule, '- using 24-hour availability (00:00-23:59)');
    // Return 24-hour availability for employees with schedules but no specific day entry
    // return [{ start: '00:00', end: '23:59' }];
  }

  // Handle single day entry (not array)
  if (dayEntry && !Array.isArray(dayEntry)) {
    // NOTE: Do not bail out early when dayEntry.isWorking===false here.
    // Previously we returned an empty array which hid the fact the
    // employee was explicitly marked as not working. We prefer to
    // continue parsing available shift fields so higher-level UI can
    // surface a clearer message (eg: "professional not working on
    // this date"). Keep a debug trace for visibility.
    if ('isWorking' in dayEntry && dayEntry.isWorking === false) {
      console.debug('[bookingUtils] dayEntry marked not working - continuing to parse shifts to allow explicit UI messaging', dayEntry);
      // intentionally continue (do not return []). Shift parsing will
      // still run if shift fields exist. If no shifts are found the
      // caller will receive an empty list and can use the explicit
      // marker via helper `isEmployeeMarkedNotWorking` added below.
    }
    
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
  // Robust lookup: appointment data keys may be stored as strings, numbers,
  // or alternate ids (eg: with prefixes). Try multiple strategies to find
  // the correct appointments bucket for this employee.
  const resolveAppointmentsForEmployee = () => {
    if (!appointments) return null;
    // direct lookup
    if (appointments[empId] && appointments[empId][dayKey]) return appointments[empId][dayKey];
    // stringified id
    const sId = String(empId);
    if (appointments[sId] && appointments[sId][dayKey]) return appointments[sId][dayKey];
    // search for a key that endsWith the empId (handles variations like "user_1234")
    const altKey = Object.keys(appointments).find(k => String(k).endsWith(sId));
    if (altKey && appointments[altKey] && appointments[altKey][dayKey]) return appointments[altKey][dayKey];
    // finally, check for any key that loosely matches when trimmed
    const looseKey = Object.keys(appointments).find(k => String(k).includes(sId));
    if (looseKey && appointments[looseKey] && appointments[looseKey][dayKey]) return appointments[looseKey][dayKey];
    return null;
  };

  const persistedBucket = resolveAppointmentsForEmployee();
  const persisted = persistedBucket
    ? Object.values(persistedBucket).map(a => {
        const rawStart = a.startTime || a.time || a.slot || a.start || a.appointmentDate;
        const startHHMM = toLocalHHMM(rawStart) || (a.startTime && a.startTime.includes(':') ? a.startTime : null);
        const duration = a.duration || a.totalDuration || (a.services && a.services[0] && a.services[0].duration) || 30;
        const endHHMM = startHHMM ? addMinutesToTime(startHHMM, duration) : null;
        return {
          startTime: startHHMM,
          endTime: endHHMM,
          // Keep the original raw value and duration to aid debugging timezone/format issues
          _raw: rawStart,
          _duration: duration
        };
      }).filter(x => x.startTime && x.endTime)
    : [];

  console.debug('[bookingUtils] existing appointments for employee on day', { 
    employeeId: empId, 
    dayKey, 
    persistedCount: persisted.length,
    // Show original raw payloads with parsed times to diagnose timezone shifts
    persisted: persisted.slice(0, 6).map(p => ({ startTime: p.startTime, endTime: p.endTime, raw: p._raw, duration: p._duration }))
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
      // Always align candidate to the interval grid first. We only want
      // to evaluate aligned start times for both fitting the service and
      // for conflicts.
      const aligned = roundUpTimeToInterval(cursor, intervalMinutes);

      // If the aligned start plus service duration doesn't fit in the
      // shift, then no further aligned starts (which are >= aligned)
      // will fit either, so we can stop processing this shift.
      if (timeToMinutesFn(aligned) + serviceDuration > timeToMinutesFn(shiftEnd)) {
        break;
      }

      // Check for conflicts on the aligned candidate (not the unaligned cursor)
      const hasConflict = isTimeSlotConflicting(aligned, serviceDuration, persisted);

      if (!hasConflict) {
        slots.push(aligned);
        slotCount++;
      }

      // Move the cursor forward by one interval to consider the next candidate
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
    .filter(emp => emp.isActive !== false) // Only include active employees
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

// Helper: Report whether an employee/day entry is explicitly marked not working
export function isEmployeeMarkedNotWorking(employee, date) {
  if (!employee) return false;
  const schedule = employee.workSchedule || employee.schedule || employee.shifts || employee.work_hours || employee.availability;
  if (!schedule) return false;
  const dateStr = localDateKey(date);
  if (typeof schedule === 'object' && !Array.isArray(schedule)) {
    const dayEntry = schedule[dateStr] || schedule[dateStr.replace(/\s+/g,'')] || null;
    if (dayEntry && typeof dayEntry === 'object' && ('isWorking' in dayEntry) && dayEntry.isWorking === false) return true;
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayIndex = (date instanceof Date ? date : new Date(date)).getDay();
    const dayKey = dayNames[dayIndex];
    const shortKey = dayKey.slice(0,3);
    const entry = schedule[dayKey] ?? schedule[shortKey] ?? schedule[String(dayIndex)];
    if (entry && typeof entry === 'object' && ('isWorking' in entry) && entry.isWorking === false) return true;
  }
  return false;
}

/**
 * Convert a UTC time (ISO string or Date) to the user's local HH:mm string.
 * Example: '2025-09-27T07:00:00.000Z' -> '12:30' for IST (UTC+5:30) when run
 * in an environment with that local timezone.
 */
export function utcToLocalHHMM(utcInput) {
  if (!utcInput) return null;
  const d = (utcInput instanceof Date) ? utcInput : new Date(utcInput);
  if (isNaN(d)) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Filter generated UTC time slots against existing bookings (both in UTC).
 * - bookings: array of booking objects containing rawStartTime/rawEndTime or startTime/endTime (UTC ISO strings or Date)
 * - timeSlots: array of candidate slots with startTime/endTime in UTC (ISO string or Date)
 * - shiftEndUtc: optional UTC ISO string or Date marking the employee's shift end (slot must end <= shiftEndUtc)
 * - options.keepUnavailable: if true, slots that conflict or overflow shift end are returned with available:false
 *
 * Returns an array of slots in the form:
 * { time: 'HH:mm' (local), startTime: <UTC ISO>, endTime: <UTC ISO>, available: true|false }
 *
 * Comparison is done using UTC timestamps (Date.getTime()). Slots that overlap even partially
 * with any booking (bookingStart < slotEnd && bookingEnd > slotStart) are considered conflicting.
 */
export function filterSlotsAgainstBookingsUTC(bookings = [], timeSlots = [], shiftEndUtc = null, options = {}) {
  const keepUnavailable = !!options.keepUnavailable;

  // Normalize bookings into ms ranges (UTC-based)
  const bookingRanges = (bookings || []).map(b => {
    // Support multiple possible property names
    const rawStart = b.rawStartTime || b.startTime || b.start || b.appointmentDate;
    const rawEnd = b.rawEndTime || b.endTime || b.end || b._end || null;
    const startDate = rawStart ? new Date(rawStart) : null;
    let endDate = rawEnd ? new Date(rawEnd) : null;
    // If end not provided but duration is, compute end
    if ((!endDate || isNaN(endDate)) && b.duration && startDate && !isNaN(startDate)) {
      endDate = new Date(startDate.getTime() + (Number(b.duration) || 0) * 60000);
    }
    if (!startDate || isNaN(startDate) || !endDate || isNaN(endDate)) return null;
    return { startMs: startDate.getTime(), endMs: endDate.getTime() };
  }).filter(Boolean);

  const shiftEndMs = shiftEndUtc ? new Date(shiftEndUtc).getTime() : null;

  const out = [];
  for (const slot of (timeSlots || [])) {
    // Expect slot.startTime / slot.endTime to be UTC ISO strings or Date
    const sDate = slot.startTime ? new Date(slot.startTime) : null;
    const eDate = slot.endTime ? new Date(slot.endTime) : null;
    if (!sDate || isNaN(sDate) || !eDate || isNaN(eDate)) continue;

    const sMs = sDate.getTime();
    const eMs = eDate.getTime();

    // Enforce shift-end: slot must fully finish on or before shiftEndMs
    if (shiftEndMs && eMs > shiftEndMs) {
      if (keepUnavailable) {
        out.push({
          time: utcToLocalHHMM(sDate),
          startTime: sDate.toISOString(),
          endTime: eDate.toISOString(),
          available: false
        });
      }
      continue;
    }

    // Check overlap with any booking (UTC-based comparison)
    const conflicts = bookingRanges.some(br => (br.startMs < eMs && br.endMs > sMs));
    if (conflicts) {
      if (keepUnavailable) {
        out.push({
          time: utcToLocalHHMM(sDate),
          startTime: sDate.toISOString(),
          endTime: eDate.toISOString(),
          available: false
        });
      }
      continue;
    }

    // Slot is available
    out.push({
      time: utcToLocalHHMM(sDate),
      startTime: sDate.toISOString(),
      endTime: eDate.toISOString(),
      available: true
    });
  }

  return out;
}
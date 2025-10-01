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
export function toLocalHHMM(val, timeZone) {
  if (!val) return null;
  if (typeof val !== 'string') val = String(val);

  // If no explicit timezone provided, use user's runtime timezone
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Trim and normalize spaces
  const input = val.trim();

  // 1) ISO datetime (contains 'T') -> convert to target timezone HH:mm
  if (input.includes('T')) {
    // Extract raw time part (admin-entered)
    const afterT = input.split('T')[1] || '';
    const rawTimeMatch = afterT.replace(/Z|[+-]\d{2}:?\d{2}$/, '').match(/^(\d{1,2}:\d{2})/);
    const rawHHMM = rawTimeMatch ? rawTimeMatch[1].padStart(5, '0') : null;

    const dt = new Date(input);
    if (isNaN(dt)) return rawHHMM;

    try {
      // Format in the requested timezone to get hours/minutes as the user expects
      const formatted = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(dt);
      const parsedHHMM = formatted.replace(/\u200E/g, '').trim(); // strip possible LTR marks
      // Prefer raw admin-entered time when it differs (preserve admin intention)
      if (rawHHMM && rawHHMM !== parsedHHMM) {
        console.warn('[bookingUtils] ISO time mismatch: using raw admin time to avoid shift', { input, rawHHMM, parsedHHMM, timeZone: tz });
        return rawHHMM;
      }
      return parsedHHMM;
    } catch (e) {
      // Intl might fail for unexpected timezone strings; fallback to Date-derived local time
      const hh = String(dt.getHours()).padStart(2, '0');
      const mm = String(dt.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
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
// ============================================
// UPDATED: getValidTimeSlotsForProfessional
// ============================================

export function getValidTimeSlotsForProfessional(employee, date, serviceDuration, appointments = {}) {
  const dateLocal = (date instanceof Date) ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : new Date(date);
  const dayKey = localDateKey(dateLocal);
  const intervalMinutes = 15;

  console.debug('[bookingUtils] getValidTimeSlotsForProfessional start', {
    employeeId: employee?._id || employee?.id || employee,
    date: dayKey,
    serviceDuration,
    lastAllowedSlot: '21:45 (09:45 PM)'
  });

  const shifts = getEmployeeShiftHours(employee, dateLocal);
  
  if (!shifts || shifts.length === 0) {
    console.debug('[bookingUtils] no shifts for employee on', dayKey);
    return [];
  }

  const empId = employee._id || employee.id;
  
  // Resolve appointments for this employee
  const resolveAppointmentsForEmployee = () => {
    if (!appointments) return null;
    if (appointments[empId] && appointments[empId][dayKey]) return appointments[empId][dayKey];
    const sId = String(empId);
    if (appointments[sId] && appointments[sId][dayKey]) return appointments[sId][dayKey];
    const altKey = Object.keys(appointments).find(k => String(k).endsWith(sId));
    if (altKey && appointments[altKey] && appointments[altKey][dayKey]) return appointments[altKey][dayKey];
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
          _raw: rawStart,
          _duration: duration
        };
      }).filter(x => x.startTime && x.endTime)
    : [];

  const todayLocalKey = localDateKey(new Date());
  const isToday = (dayKey === todayLocalKey);
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const slots = [];
  let totalGenerated = 0;
  let totalBlocked = 0;

  // Process each shift period
  shifts.forEach((shift, shiftIndex) => {
    const shiftStart = shift.start;
    const shiftEnd = shift.end;
    
    console.debug('[bookingUtils] processing shift', shiftIndex, { 
      shiftStart, 
      shiftEnd, 
      isToday, 
      nowHHMM,
      serviceDuration 
    });
    
    let cursor = shiftStart;
    
    // If today, start from current time (rounded up)
    if (isToday) {
      const roundedNow = roundUpTimeToInterval(nowHHMM, intervalMinutes);
      
      // Check if there's enough time left in shift for the service
      if (timeToMinutesFn(roundedNow) + serviceDuration > timeToMinutesFn(shiftEnd)) {
        console.debug('[bookingUtils] not enough time in shift after now');
        return;
      }
      
      cursor = (timeToMinutesFn(roundedNow) > timeToMinutesFn(shiftStart)) ? roundedNow : shiftStart;
    }

    let slotCount = 0;
    const maxSlotsPerShift = 200;
    
    // Generate time slots within this shift
    while (timeToMinutesFn(cursor) + serviceDuration <= timeToMinutesFn(shiftEnd) && slotCount < maxSlotsPerShift) {
      const aligned = roundUpTimeToInterval(cursor, intervalMinutes);
      totalGenerated++;

      // CRITICAL CHECK 1: Verify slot doesn't exceed 10:45 PM (considering service duration)
      if (exceedsLastAllowedSlot(aligned, serviceDuration)) {
        console.debug('[bookingUtils] ⛔ Stopping slot generation: slot would exceed 10:45 PM limit', {
          slotTime: aligned,
          serviceDuration: `${serviceDuration} min`,
          wouldEndAt: addMinutesToTime(aligned, serviceDuration)
        });
        totalBlocked++;
        break; // Stop generating more slots - we've reached the daily cutoff
      }

      // Check if slot fits within shift end
      if (timeToMinutesFn(aligned) + serviceDuration > timeToMinutesFn(shiftEnd)) {
        break;
      }

      // CRITICAL CHECK 2: Check for booking conflicts
      const hasConflict = isTimeSlotConflicting(aligned, serviceDuration, persisted);

      if (!hasConflict) {
        slots.push(aligned);
      } else {
        totalBlocked++;
      }

      cursor = addMinutesToTime(cursor, intervalMinutes);
      slotCount++;
    }
  });

  console.debug('[bookingUtils] Slot generation summary', {
    totalGenerated,
    totalBlocked,
    validSlots: slots.length,
    blockedByTimeLimit: totalBlocked,
    lastSlotGenerated: slots[slots.length - 1],
    serviceDuration: `${serviceDuration} min`
  });
  
  // Remove duplicates and sort
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
    .filter(emp => emp.isActive !== false) // Only include active employees
    .map(emp => {
      const duration = svc.duration || svc.minutes || 30;
      const slots = getValidTimeSlotsForProfessional(emp, date, duration, appointments);
      return { professional: emp, slots };
    })
    .filter(x => x.slots && x.slots.length > 0);
}

/**
 * Compute sequential start times with bookings/shifts considered.
 * Returns sequences that fit before 10:45 PM cutoff.
 */
export function computeSequentialServiceStartTimesWithBookings(services, professionalsMap, date, appointmentsIndex) {
  console.log('[bookingUtils] computeSequentialServiceStartTimesWithBookings start', {
    services: services.map(s => s._id),
    date: localDateKey(date),
    lastAllowedSlot: '22:45 (10:45 PM)'
  });

  if (!Array.isArray(services) || services.length === 0) return [];

  // Calculate total duration needed
  const totalDuration = services.reduce((sum, svc) => sum + (svc.duration || 30), 0);
  
  // Calculate the latest possible start time
  const lastAllowedStart = timeToMinutes("22:45") - totalDuration;
  const lastStartTime = minutesToTime(lastAllowedStart);

  console.log('[bookingUtils] Duration calculation:', {
    totalDuration,
    lastPossibleStart: lastStartTime,
    services: services.map(s => ({
      name: s.name,
      duration: s.duration
    }))
  });

  let validSequences = [];
  let totalCandidates = 0;
  let blockedByTimeLimit = 0;

  // Generate time slots in 15-minute intervals
  for (let minutes = 9 * 60; minutes <= lastAllowedStart; minutes += 15) {
    totalCandidates++;
    const startTime = minutesToTime(minutes);
    
    // Check if sequence would exceed 10:45 PM
    const sequenceEndMinutes = minutes + totalDuration;
    if (sequenceEndMinutes > timeToMinutes("22:45")) {
      blockedByTimeLimit++;
      console.log('[TIME CONSTRAINT] Sequence rejected:', {
        startTime,
        totalDuration: `${totalDuration} min`,
        wouldEndAt: minutesToTime(sequenceEndMinutes),
        lastAllowed: "22:45",
      });
      continue;
    }

    // Build the sequence
    let currentTime = startTime;
    let sequence = [];
    let isValid = true;

    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      const professional = professionalsMap[service._id];
      const duration = service.duration || 30;

      // Verify each service fits within allowed time
      const serviceEndMinutes = timeToMinutes(currentTime) + duration;
      if (serviceEndMinutes > timeToMinutes("22:45")) {
        isValid = false;
        break;
      }

      sequence.push({
        serviceId: service._id,
        startTime: currentTime,
        endTime: minutesToTime(serviceEndMinutes),
        duration,
        professional
      });

      currentTime = minutesToTime(serviceEndMinutes);
    }

    if (isValid) {
      validSequences.push({
        startTime,
        sequence
      });
    }
  }

  console.log('[bookingUtils] Sequential sequences summary', {
    totalCandidates,
    validSequences: validSequences.length,
    blockedByTimeLimit,
    totalDuration: `${totalDuration} min`
  });

  return validSequences;
}
// ============================================
// CRITICAL CONSTRAINT: Last booking slot enforcement
// ============================================

/**
 * Check if a time slot would exceed the last allowed booking time (10:45 PM)
 * IMPORTANT: This checks if the SERVICE WOULD END after 10:45 PM, not just if it starts after
 * 
 * @param {string} startTimeStr - Start time in "HH:MM" format (24-hour)
 * @param {number} durationMinutes - Service duration in minutes
 * @returns {boolean} - True if the service would end after 10:45 PM
 */
export function exceedsLastAllowedSlot(startTimeStr, durationMinutes = 0) {
  const LAST_ALLOWED_TIME = "23:00"; // 10:45 PM in 24-hour format
  
  // Convert start time to minutes
  const startMinutes = timeToMinutesFn(startTimeStr);
  
  // Calculate when the service would end
  const endMinutes = startMinutes + durationMinutes;
  
  // Convert last allowed time to minutes
  const lastAllowedMinutes = timeToMinutesFn(LAST_ALLOWED_TIME);
  
  // Service is invalid if it would START after 10:45 PM OR END after 10:45 PM
  const wouldExceed = startMinutes > lastAllowedMinutes || endMinutes > lastAllowedMinutes;
  
  if (wouldExceed) {
    console.log('[TIME CONSTRAINT] Slot exceeds 10:45 PM limit:', {
      startTime: startTimeStr,
      duration: `${durationMinutes} min`,
      endTime: minutesToTime(endMinutes),
      lastAllowed: LAST_ALLOWED_TIME,
      reason: startMinutes > lastAllowedMinutes ? 
        'Starts after 10:45 PM' : 
        `Ends at ${minutesToTime(endMinutes)}, exceeding 10:45 PM limit`
    });
  }
  
  return wouldExceed;
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
export function utcToLocalHHMM(utcInput, timeZone) {
  if (!utcInput) return null;
  const d = (utcInput instanceof Date) ? utcInput : new Date(utcInput);
  if (isNaN(d)) return null;
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const formatted = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(d);
    return formatted.replace(/\u200E/g, '').trim();
  } catch (e) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
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

/**
 * Validate candidate start slots against bookings for a chain of services.
 * - bookings: array of confirmed bookings (UTC ISO string or Date) with rawStartTime/rawEndTime or startTime/endTime
 * - shifts: array of { start: <UTC ISO string or Date>, end: <UTC ISO string or Date> } (employee shift windows in UTC)
 * - services: array of services [{ id, duration }] to be scheduled sequentially (in minutes)
 * - timeSlots: candidate start slots in UTC (each slot must contain startTime and endTime as UTC ISO string or Date)
 * - options.keepUnavailable: if true, return unavailable slots with available:false instead of filtering them out
 *
 * Rules:
 * - All checks are performed in UTC using Date.getTime().
 * - A slot is valid only if the entire chain (sum of service durations) fits inside one of the provided shifts
 *   and none of the chained service intervals overlap any existing booking.
 * - Returned slot objects are in the shape:
 *   { time: 'HH:mm' (local display), startTime: <UTC ISO>, endTime: <UTC ISO>, available: true|false }
 */
export function filterSequentialSlotsAgainstBookingsUTC(bookings = [], shifts = [], services = [], timeSlots = [], options = {}) {
  const keepUnavailable = !!options.keepUnavailable;

  // Normalize bookings into [startMs, endMs]
  const bookingRanges = (bookings || []).map(b => {
    const sRaw = b.rawStartTime ?? b.startTime ?? b.start ?? b.appointmentDate;
    const eRaw = b.rawEndTime ?? b.endTime ?? b.end;
    const s = sRaw ? new Date(sRaw).getTime() : null;
    const e = eRaw ? new Date(eRaw).getTime() : null;
    if (!s || !e || isNaN(s) || isNaN(e)) return null;
    return [s, e];
  }).filter(Boolean);

  // Accept shifts as either an array of {start,end} or a single {start,end}
  let shiftRanges = [];
  if (!shifts) shiftRanges = [];
  else if (Array.isArray(shifts)) {
    shiftRanges = shifts.map(sh => {
      const s = sh && (sh.start ?? sh.startTime) ? new Date(sh.start ?? sh.startTime).getTime() : null;
      const e = sh && (sh.end ?? sh.endTime) ? new Date(sh.end ?? sh.endTime).getTime() : null;
      if (!s || !e || isNaN(s) || isNaN(e)) return null;
      return [s, e];
    }).filter(Boolean);
  } else if (typeof shifts === 'object') {
    const s = shifts.start ? new Date(shifts.start).getTime() : (shifts.startTime ? new Date(shifts.startTime).getTime() : null);
    const e = shifts.end ? new Date(shifts.end).getTime() : (shifts.endTime ? new Date(shifts.endTime).getTime() : null);
    if (s && e && !isNaN(s) && !isNaN(e)) shiftRanges = [[s, e]];
  }

  // Total duration required for the sequential chain (minutes -> ms)
  const totalDurationMinutes = (services || []).reduce((acc, svc) => acc + (svc?.duration || 0), 0);
  const totalDurationMs = totalDurationMinutes * 60 * 1000;

  const out = [];

  for (const slot of (timeSlots || [])) {
    const slotStartRaw = slot.startTime ?? slot.time ?? null;
    const slotEndRaw = slot.endTime ?? null;
    const slotStartMs = slotStartRaw ? new Date(slotStartRaw).getTime() : null;

    if (!slotStartMs || isNaN(slotStartMs)) {
      if (keepUnavailable) {
        out.push({ time: slot.time || null, startTime: slot.startTime, endTime: slot.endTime, available: false });
      }
      continue;
    }

    const blockEndMs = slotStartMs + totalDurationMs;

    // Must fit entirely within at least one shift
    const fitsShift = shiftRanges.length > 0 ? shiftRanges.some(([s, e]) => slotStartMs >= s && blockEndMs <= e) : true;
    if (!fitsShift) {
      if (keepUnavailable) out.push({ time: utcToLocalHHMM(slotStartRaw), startTime: new Date(slotStartRaw).toISOString(), endTime: slotEndRaw ? new Date(slotEndRaw).toISOString() : new Date(slotStartMs + 15*60*1000).toISOString(), available: false });
      continue;
    }

    // Check block overlap with any booking: overlap if bookingStart < blockEnd && bookingEnd > slotStart
    let conflict = false;
    for (const [bs, be] of bookingRanges) {
      if (bs < blockEndMs && be > slotStartMs) { conflict = true; break; }
    }

    if (conflict) {
      if (keepUnavailable) out.push({ time: utcToLocalHHMM(slotStartRaw), startTime: new Date(slotStartRaw).toISOString(), endTime: slotEndRaw ? new Date(slotEndRaw).toISOString() : new Date(slotStartMs + 15*60*1000).toISOString(), available: false });
      continue;
    }

    // Slot is valid for the whole service chain
    out.push({ time: utcToLocalHHMM(slotStartRaw), startTime: new Date(slotStartRaw).toISOString(), endTime: slotEndRaw ? new Date(slotEndRaw).toISOString() : new Date(slotStartMs + 15*60*1000).toISOString(), available: true });
  }

  return out;
}

// Update the time constraint check in computeSequentialServiceStartTimesWithBookings
// export function computeSequentialServiceStartTimesWithBookings(services, professionalsMap, date, appointmentsIndex) {
//   console.log('[bookingUtils] computeSequentialServiceStartTimesWithBookings start', {
//     services: services.map(s => s._id),
//     date: localDateKey(date),
//     lastAllowedSlot: '22:45 (10:45 PM)'
//   });

//   // Calculate total duration needed
//   const totalDuration = services.reduce((sum, svc) => sum + (svc.duration || 30), 0);
  
//   // NEW: Calculate the latest possible start time
//   const lastAllowedStart = timeToMinutes("22:45") - totalDuration;
//   const lastStartTime = minutesToTime(lastAllowedStart);

//   console.log('[bookingUtils] Duration calculation:', {
//     totalDuration,
//     lastPossibleStart: lastStartTime,
//     services: services.map(s => ({
//       name: s.name,
//       duration: s.duration
//     }))
//   });

//   let validSequences = [];
//   let totalCandidates = 0;
//   let blockedByTimeLimit = 0;

//   for (let minutes = 9 * 60; minutes <= lastAllowedStart; minutes += 15) {
//     totalCandidates++;
//     const startTime = minutesToTime(minutes);
    
//     // Check if this sequence would exceed 10:45 PM
//     const sequenceEndMinutes = minutes + totalDuration;
//     if (sequenceEndMinutes > timeToMinutes("22:45")) {
//       blockedByTimeLimit++;
//       console.log('[TIME CONSTRAINT] Sequence rejected:', {
//         startTime,
//         totalDuration: `${totalDuration} min`,
//         wouldEndAt: minutesToTime(sequenceEndMinutes),
//         lastAllowed: "22:45",
//       });
//       continue;
//     }

//     // Build the sequence
//     let currentTime = startTime;
//     let sequence = [];
//     let isValid = true;

//     for (let i = 0; i < services.length; i++) {
//       const service = services[i];
//       const professional = professionalsMap[service._id];
//       const duration = service.duration || 30;

//       // Check if this service fits within allowed time
//       const serviceEndMinutes = timeToMinutes(currentTime) + duration;
//       if (serviceEndMinutes > timeToMinutes("22:45")) {
//         isValid = false;
//         break;
//       }

//       sequence.push({
//         serviceId: service._id,
//         startTime: currentTime,
//         endTime: minutesToTime(serviceEndMinutes),
//         duration,
//         professional
//       });

//       currentTime = minutesToTime(serviceEndMinutes);
//     }

//     if (isValid) {
//       validSequences.push({
//         startTime,
//         sequence
//       });
//     }
//   }

//   console.log('[bookingUtils] Sequential sequences summary', {
//     totalCandidates,
//     validSequences: validSequences.length,
//     blockedByTimeLimit,
//     totalDuration: `${totalDuration} min`
//   });

//   return validSequences;
// }

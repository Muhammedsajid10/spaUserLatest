// Booking utility helpers extracted from Selectcalander for user-side 3 step flow
// Steps: 1) Services 2) Available Professionals 3) Available Time Slots
import { bookingsAPI, employeesAPI } from './api';

// --- Shift & Schedule Parsing ---
export const getDayName = (date) => {
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  return days[date.getDay()];
};

export const parseShiftsFromSchedule = (schedule) => {
  if (!schedule) return [];
/**
 * Booking utility helpers (extracted & simplified from the admin SelectCalendar).
 *
 * Typical PUBLIC (user side) flow uses these 3 steps:
 *   1. Fetch list of services  -> user picks a service
 *   2. For that service & date find professionals who still have at least one free slot
 *   3. For the chosen professional produce the list of free time slots (not overlapping existing appointments)
 *
 * Core data pieces you need to pass in:
 *   - date (Date object for the day the user wants to book)
 *   - services (array from backend)
 *   - employees / professionals (array from backend including workSchedule)
 *   - appointments (indexed object: appointments[employeeId]["YYYY-MM-DD_HH:MM"] = { duration, ... })
 *
 * Exported key functions:
 *   getAvailableProfessionalsForService(serviceId, date, employees, appointments, services)
 *   getAvailableTimeSlotsForProfessional(employee, date, serviceDuration, appointments)
 *
 * Helper chain for availability:
 *   parseShiftsFromSchedule -> getEmployeeShiftHours -> hasShiftOnDate -> getValidTimeSlotsForProfessional
 *
 * All functions are pure (no internal state) except the small fetch* wrappers which call your API.
 */
  const pad = (n) => String(n).padStart(2, '0');
  const normalizeHM = (h, m = 0) => `${pad(Number(h))}:${pad(Number(m))}`;
  const parseTimeToken = (token) => {
    if (!token && token !== 0) return null;
    token = String(token).trim();
    if (token.includes('T') || token.includes('-') || token.includes('/')) {
      const dt = new Date(token);
      if (!isNaN(dt)) return normalizeHM(dt.getHours(), dt.getMinutes());
    }
    const m1 = token.match(/^(\d{1,2}):(\d{2})$/); if (m1) return normalizeHM(m1[1], m1[2]);
    const m2 = token.match(/^(\d{1,2})$/); if (m2) return normalizeHM(m2[1], 0);
    return null;
  };
  const pushShift = (s,e) => { const start = parseTimeToken(s); const end = parseTimeToken(e); if (start && end) return { startTime:start, endTime:end }; return null; };
  const result = [];
  if (typeof schedule === 'string') {
    const parts = schedule.split(/[;,|]/).map(p=>p.trim()).filter(Boolean);
    for (const part of parts) { const m = part.match(/(\S+)\s*[-–—]\s*(\S+)/); if (m) { const s = pushShift(m[1], m[2]); if (s) result.push(s);} }
    return result;
  }
  if (Array.isArray(schedule)) {
    for (const it of schedule) {
      if (!it) continue;
      if (typeof it === 'string') { const m = it.match(/(\S+)\s*[-–—]\s*(\S+)/); if (m) { const s = pushShift(m[1], m[2]); if (s) result.push(s);} }
      else if (typeof it === 'object') { const s = pushShift(it.startTime || it.start, it.endTime || it.end); if (s) result.push(s); }
    }
    return result;
  }
  if (schedule.shiftsData && Array.isArray(schedule.shiftsData)) {
    for (const sh of schedule.shiftsData) { const s = pushShift(sh.startTime || sh.start, sh.endTime || sh.end); if (s) result.push(s); }
  }
  if (schedule.shifts && Array.isArray(schedule.shifts)) {
    for (const sh of schedule.shifts) {
      if (typeof sh === 'string') { const m = sh.match(/(\S+)\s*[-–—]\s*(\S+)/); if (m) { const s = pushShift(m[1], m[2]); if (s) result.push(s);} }
      else if (typeof sh === 'object') { const s = pushShift(sh.startTime || sh.start, sh.endTime || sh.end); if (s) result.push(s); }
    }
  }
  if (schedule.shifts && typeof schedule.shifts === 'string') {
    const parts = schedule.shifts.split(/[;,|]/).map(p=>p.trim()).filter(Boolean);
    for (const part of parts) { const m = part.match(/(\S+)\s*[-–—]\s*(\S+)/); if (m) { const s = pushShift(m[1], m[2]); if (s) result.push(s);} }
  }
  if ((schedule.startTime || schedule.start) && (schedule.endTime || schedule.end)) {
    const s = pushShift(schedule.startTime || schedule.start, schedule.endTime || schedule.end); if (s) result.push(s);
  }
  if (schedule.periods && Array.isArray(schedule.periods)) {
    for (const p of schedule.periods) { const s = pushShift(p.from || p.start, p.to || p.end); if (s) result.push(s); }
  }
  // de-dupe
  const seen = new Set();
  return result.filter(sh => { const key = `${sh.startTime}_${sh.endTime}`; if (seen.has(key)) return false; seen.add(key); return true; });
};

export const hasShiftOnDate = (employee, date) => {
  if (!employee?.workSchedule) return false;
  const dayName = getDayName(date);
  const schedule = employee.workSchedule[dayName];
  if (!schedule) return false;
  if (typeof schedule.isWorking === 'boolean') {
    if (schedule.isWorking) return true; // still allow explicit shift definitions below
  }
  return parseShiftsFromSchedule(schedule).length > 0;
};

export const getEmployeeShiftHours = (employee, date) => {
  if (!employee?.workSchedule) return [];
  const dayName = getDayName(date);
  const schedule = employee.workSchedule[dayName];
  if (!schedule) return [];
  return parseShiftsFromSchedule(schedule)
    .map(s => ({ startTime: String(s.startTime).padStart(5,'0'), endTime: String(s.endTime).padStart(5,'0') }))
    .filter(s => s.startTime && s.endTime);
};

// Core: build valid slots (10 min resolution) without overlaps
export const getValidTimeSlotsForProfessional = (employee, date, serviceDuration, appointments) => {
  const shifts = getEmployeeShiftHours(employee, date);
  if (!shifts.length) return [];
  const intervalMinutes = 10;
  const valid = [];
  const dayISO = date.toISOString().split('T')[0];
  const employeeAppointments = appointments[employee.id] || appointments[employee._id] || {};
  // debug: list booked slot keys for this employee
  console.debug(`[bookingUtils] employee=${employee._id || employee.id} appointmentsKeys=`, Object.keys(employeeAppointments || {}));
  shifts.forEach(shift => {
    const toMin = t => { const [H,M] = t.split(':').map(Number); return H*60+M; };
    const startM = toMin(shift.startTime); const endM = toMin(shift.endTime);
    for (let slotStart = startM; slotStart + serviceDuration <= endM; slotStart += intervalMinutes) {
      const h = String(Math.floor(slotStart/60)).padStart(2,'0');
      const m = String(slotStart%60).padStart(2,'0');
      const slotLabel = `${h}:${m}`;
/**
 * Build all FREE start times for an employee on a given date for a given service duration.
 * Resolution: 10 minutes (change intervalMinutes below if needed).
 * Avoids overlapping existing appointments stored in appointments[employeeId].
 *
 * Returns array of slot objects: { label:'HH:MM', startTime: ISOString, endTime: ISOString, available:true }
 */
      const slotStartDate = new Date(date); slotStartDate.setHours(h,m,0,0);
      const slotEndDate = new Date(slotStartDate.getTime()+serviceDuration*60000);
      const overlaps = Object.entries(employeeAppointments).some(([key, app]) => {
  if (!key.startsWith(dayISO)) return false;
  const time = key.split('_')[1]; if (!time) return false;
        const [ah, am] = time.split(':').map(Number);
        const appStart = new Date(date); appStart.setHours(ah,am,0,0);
        const appEnd = new Date(appStart.getTime() + (app.duration || 30)*60000);
        return slotStartDate < appEnd && slotEndDate > appStart;
      });
      if (!overlaps) {
        valid.push({
          label: slotLabel,
            startTime: slotStartDate.toISOString(),
            endTime: slotEndDate.toISOString(),
            available: true
        });
      }
    }
  });
  return valid;
};

// Prefer server-side availability when possible. This function calls the API to get
// the list of available professionals for a service+date and returns the array
// of employees. Falls back to empty array on error.
export async function getAvailableProfessionalsForService(serviceId, date) {
  // Fetch employees + appointments, then compute free slots per employee
  try {
    const dateISO = (date instanceof Date) ? date.toISOString().split('T')[0] : String(date);
    // fetch all employees (public) then bookings for the date
    const [employeesResp, bookingsList] = await Promise.all([
      employeesAPI.getAllEmployees(),
      bookingsAPI.getAppointmentsForDate(dateISO)
    ]);

    // normalize employees list - employeesAPI.getAllEmployees returns { data: { employees }} or an array
    const employees = (employeesResp && employeesResp.data && employeesResp.data.employees) || employeesResp || [];

    // build appointments index { employeeId: { 'YYYY-MM-DD_HH:MM': appt } }
    const index = {};
    (bookingsList || []).forEach(app => {
      const employeeId = app.employeeId || app.professionalId || app.professional?._id;
      if (!employeeId) return;
      const start = new Date(app.startTime || app.start || app.time);
      if (isNaN(start)) return;
      const dayKey = start.toISOString().split('T')[0];
      const hh = String(start.getHours()).padStart(2,'0');
      const mm = String(start.getMinutes()).padStart(2,'0');
      const slotKey = `${dayKey}_${hh}:${mm}`;
      if (!index[employeeId]) index[employeeId] = {};
      index[employeeId][slotKey] = { duration: app.duration || 30, ...app };
    });

    // for each employee compute free slots for service duration
    // need to find service duration: try to fetch service details via bookingsAPI.getAvailableServices? (not needed here)
    // We'll let caller pass serviceDuration via an optional parameter in future; fall back to 30
    const serviceDuration = 30;

    const available = employees.filter(emp => {
      try {
        const hasShift = hasShiftOnDate(emp, new Date(dateISO));
        if (!hasShift) return false;
        const slots = getValidTimeSlotsForProfessional(emp, new Date(dateISO), serviceDuration, index);
        return slots.length > 0;
      } catch (err) {
        console.error('[bookingUtils] per-employee availability error', err);
        return false;
      }
    });

    console.debug(`[bookingUtils] computed available professionals=${available.length} / ${employees.length} for ${dateISO}`);
    return available;
  } catch (err) {
    console.error('[bookingUtils] getAvailableProfessionalsForService error', err);
    return [];
  }
}

// Convenience wrapper that Professional component can call. Accepts optional serviceDuration.
export async function fetchAvailableProfessionalsForService(date, serviceId) {
  // Currently the underlying implementation uses a fixed duration. We keep signature
  // to allow future extension. For now delegate to getAvailableProfessionalsForService
  return getAvailableProfessionalsForService(serviceId, date);
}

export const getAvailableTimeSlotsForProfessional = (employee, date, serviceDuration, appointments) => {
  return getValidTimeSlotsForProfessional(employee, date, serviceDuration, appointments);
};

// Debug helper: return per-employee availability details for a given date & service
export const debugAvailableEmployees = (date, employees, appointments, services, serviceId) => {
  const service = services.find(s => s._id === serviceId || s.id === serviceId) || { duration: 30 };
  const dayISO = date.toISOString().split('T')[0];
  const rows = employees.map(emp => {
    const empId = emp._id || emp.id;
    const hasShift = hasShiftOnDate(emp, date);
    const bookedKeys = Object.keys(appointments[empId] || {}).filter(k => k.startsWith(dayISO));
    const bookedSlots = bookedKeys.map(k => k.split('_')[1]).filter(Boolean);
    const freeSlots = hasShift ? getValidTimeSlotsForProfessional(emp, date, service.duration || service.serviceDuration || 30, appointments) : [];
    return {
      id: empId,
      name: emp.user ? `${emp.user.firstName} ${emp.user.lastName}` : emp.name || empId,
      hasShift,
      totalFreeSlots: freeSlots.length,
      freeSlots: freeSlots.map(s => s.label || s.startTime),
      totalBookedSlots: bookedSlots.length,
      bookedSlots
    };
  });
  console.debug('[bookingUtils] debugAvailableEmployees', { date: dayISO, summary: rows.map(r => ({ id: r.id, hasShift: r.hasShift, free: r.totalFreeSlots, booked: r.totalBookedSlots })) });
  return rows;
};

// Fetch wrapper: get available time slots for a single employee (fetches employees + appointments)
// Fetch available time slots for a single employee. Delegate to server endpoint
// if available; otherwise return [] on error. The server endpoint expected is
// bookingsAPI.getAvailableTimeSlots(employeeId, serviceId, date).
export async function fetchAvailableTimeSlotsForEmployee(employeeId, dateISO, serviceDuration = 30, serviceId = null) {
  try {
    // If serviceId provided, prefer the server time-slots endpoint
    if (serviceId) {
      const resp = await bookingsAPI.getAvailableTimeSlots(employeeId, serviceId, dateISO);
      // If the API returns slots in data.slots or data.timeSlots, normalize.
      const slots = (resp && resp.data && (resp.data.slots || resp.data.timeSlots || resp.data)) || [];
      // Try to map to our slot format if needed
      return slots.map(s => {
        if (s.startTime && s.endTime) return { label: s.label || new Date(s.startTime).toISOString().split('T')[1].slice(0,5), startTime: s.startTime, endTime: s.endTime, available: true };
        if (s.time) return { label: s.time, startTime: s.time, endTime: s.time, available: true };
        return s;
      });
    }

    // If no serviceId provided, we cannot call the dedicated time-slots API.
    // Return empty array to signal caller to use local slot calculation if needed.
    return [];
  } catch (err) {
    console.error('[bookingUtils] fetchAvailableTimeSlotsForEmployee error', err);
    return [];
  }
}

/**
 * Return only the professionals who BOTH:
 *   - have at least one shift interval that day
 *   - have at least one free slot that can fit the service duration
 */
// Convenience wrappers for a typical public booking API layer (client-side composition)
// You could move these server-side to reduce data transfer.
// NOTE: fetchServices/fetchEmployees/fetchAppointmentsForDate removed.
// Network calls are delegated to `src/services/api.js` (bookingsAPI / employeesAPI)
// to keep a single place for HTTP behavior and error handling.

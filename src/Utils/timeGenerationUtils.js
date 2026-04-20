// ===================================================
// ENHANCED TIME GENERATION UTILITIES FOR USER SIDE
// Extracted from Admin Selectcalander.jsx
// ===================================================

// --- BASIC TIME UTILITIES ---

export const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  // Accept "HH:MM", "H:MM", ISO datetime, Date string
  if (timeStr.includes('T') || timeStr.includes('-') || timeStr.endsWith('Z')) {
    const d = new Date(timeStr);
    return d.getHours() * 60 + d.getMinutes();
  }
  const parts = String(timeStr).trim().split(':');
  const h = Number(parts[0] || 0);
  const m = Number(parts[1] || 0);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

export const minutesToLabel = (mins) => {
  mins = mins % (24 * 60);
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const addMinutesToTime = (timeStr, minutes) => {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
};

export const timeToMinutes = (timeStr) => {
  const [hours, mins] = timeStr.split(':').map(Number);
  return hours * 60 + mins;
};

export const formatTime = (time) => {
  // Return 24-hour format directly
  return time;
};

export const localDateKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// --- SHIFT PARSING UTILITIES ---

export const parseShiftsFromSchedule = (schedule) => {
  if (!schedule) return [];
  const result = [];
  const push = (s, e) => { 
    if (!s || !e) return; 
    result.push({ startTime: s, endTime: e }); 
  };
  
  if (typeof schedule === 'string') {
    schedule.split(',').forEach(seg => {
      const [a, b] = seg.split('-').map(s => s.trim());
      if (a && b) {
        const norm = (t) => t.includes(':') ? t.padStart(5, '0') : `${String(t).padStart(2, '0')}:00`;
        push(norm(a), norm(b));
      }
    });
  } else if (Array.isArray(schedule)) {
    schedule.forEach(s => {
      if (typeof s === 'string') { 
        const [a, b] = s.split('-'); 
        if (a && b) push(a.padStart(5, '0'), b.padStart(5, '0')); 
      } else if (s && (s.startTime || s.start) && (s.endTime || s.end)) {
        push(String(s.startTime || s.start).padStart(5, '0'), String(s.endTime || s.end).padStart(5, '0'));
      }
    });
  } else if (schedule.shiftsData) {
    schedule.shiftsData.forEach(p => push(p.startTime, p.endTime));
    // Fallback to single start/end if defined on same object
    if (result.length === 0 && schedule.startTime && schedule.endTime) {
      push(String(schedule.startTime).trim().padStart(5, '0'), String(schedule.endTime).trim().padStart(5, '0'));
    }
    // Also parse legacy "shifts" string if present
    if (schedule.shifts && typeof schedule.shifts === 'string') {
      schedule.shifts.split(',').forEach(seg => {
        const [a, b] = seg.split('-').map(s => s.trim());
        if (a && b) push(a.padStart(5, '0'), b.padStart(5, '0'));
      });
    }
  } else if (schedule.periods) {
    schedule.periods.forEach(p => push(p.from, p.to));
  } else if (schedule && typeof schedule === 'object') {
    // Generic object day (like workSchedule.monday = {isWorking,startTime,endTime,shifts})
    if (schedule.startTime && schedule.endTime) {
      push(String(schedule.startTime).trim().padStart(5, '0'), String(schedule.endTime).trim().padStart(5, '0'));
    }
    if (schedule.shifts && typeof schedule.shifts === 'string') {
      schedule.shifts.split(',').forEach(seg => {
        const [a, b] = seg.split('-').map(s => s.trim());
        if (a && b) push(a.padStart(5, '0'), b.padStart(5, '0'));
      });
    }
  }
  
  // dedupe & sort
  const seen = new Set();
  return result.filter(s => {
    const key = `${s.startTime}-${s.endTime}`;
    if (seen.has(key)) return false; 
    seen.add(key); 
    return true;
  }).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
};

export const getEmployeeShiftHours = (employee, date) => {
  if (!employee?.workSchedule) return [];
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[date.getDay()];
  const schedule = employee.workSchedule[dayName];
  if (!schedule) return [];
  return parseShiftsFromSchedule(schedule).map(s => ({ startTime: s.startTime, endTime: s.endTime }));
};

export const hasShiftOnDate = (employee, date) => getEmployeeShiftHours(employee, date).length > 0;

export const withinAnyShift = (label, shifts) => {
  const m = toMinutes(label);
  return shifts.some(sh => m >= toMinutes(sh.startTime) && m < toMinutes(sh.endTime));
};

// --- ENHANCED TIME SLOT GENERATION ---

export const generateTimeSlots = (startTime, endTime, intervalMinutes = 30) => {
  const slots = [];
  let currentHour = parseInt(startTime.split(':')[0]);
  let currentMinute = parseInt(startTime.split(':')[1]);
  const endHour = parseInt(endTime.split(':')[0]);
  const endMinute = parseInt(endTime.split(':')[1]);

  while (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute)) {
    const hourFormatted = String(currentHour).padStart(2, '0');
    const minuteFormatted = String(currentMinute).padStart(2, '0');
    slots.push(`${hourFormatted}:${minuteFormatted}`);

    currentMinute += intervalMinutes;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute %= 60;
    }
  }
  return slots;
};

// ENHANCED: Generate time slots ONLY for employee's actual shift hours
export const generateTimeSlotsFromEmployeeShift = (employee, date, serviceDuration = 30, intervalMinutes = 30) => {
  console.log('=== GENERATING TIME SLOTS FROM SHIFT ===');
  console.log('Employee:', employee?.name);
  console.log('Service duration:', serviceDuration, 'minutes');
  console.log('Interval:', intervalMinutes, 'minutes');

  const shifts = getEmployeeShiftHours(employee, date);

  if (shifts.length === 0) {
    console.log('❌ No shifts found, returning empty slots');
    return [];
  }

  const toISOOnDate = (timeLabel) => {
    const [h, m] = timeLabel.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const slots = [];

  shifts.forEach(shift => {
    console.log('Processing shift:', shift.startTime, '-', shift.endTime);

    let startMinutes = toMinutes(shift.startTime);
    let endMinutes = toMinutes(shift.endTime);

    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    console.log(`Shift in minutes: ${startMinutes} - ${endMinutes}`);

    // Generate slots for this shift
    for (let slotStart = startMinutes; slotStart + serviceDuration <= endMinutes; slotStart += intervalMinutes) {
      const slotEnd = slotStart + serviceDuration;
      const startLabel = minutesToLabel(slotStart);
      const endLabel = minutesToLabel(slotEnd);

      slots.push({
        time: startLabel,
        startTime: toISOOnDate(startLabel),
        endTime: toISOOnDate(endLabel),
        available: true,
        label: startLabel
      });
    }
  });

  console.log('Generated', slots.length, 'time slots from shifts');
  console.log('Sample slots:', slots.slice(0, 3).map(s => ({
    start: new Date(s.startTime).toLocaleTimeString(),
    end: new Date(s.endTime).toLocaleTimeString()
  })));
  console.log('=====================================');

  return slots;
};

// ENHANCED: Get valid time slots for a professional with conflict detection
export const getValidTimeSlotsForProfessional = (employee, date, serviceDuration, appointments) => {
  const shifts = getEmployeeShiftHours(employee, date);
  if (!shifts.length) return [];

  const intervalMinutes = 15; // More granular intervals
  const validSlots = [];

  shifts.forEach(shift => {
    const startMinutes = parseInt(shift.startTime.split(':')[0]) * 60 + parseInt(shift.startTime.split(':')[1]);
    const endMinutes = parseInt(shift.endTime.split(':')[0]) * 60 + parseInt(shift.endTime.split(':')[1]);
    
    for (let slotStart = startMinutes; slotStart + serviceDuration <= endMinutes; slotStart += intervalMinutes) {
      const hour = Math.floor(slotStart / 60).toString().padStart(2, '0');
      const minute = (slotStart % 60).toString().padStart(2, '0');
      const slotLabel = `${hour}:${minute}`;
      const slotDate = new Date(date);
      slotDate.setHours(hour, minute, 0, 0);

      // Check for overlap with existing appointments
      const employeeAppointments = appointments[employee.id] || {};
      const overlaps = Object.entries(employeeAppointments).some(([appKey, app]) => {
        if (!appKey.startsWith(localDateKey(date))) return false;
        const [appHour, appMinute] = appKey.split('_')[1].split(':').map(Number);
        const appStart = new Date(date);
        appStart.setHours(appHour, appMinute, 0, 0);
        const appEnd = new Date(appStart.getTime() + (app.duration || 30) * 60000);
        const slotStartDate = slotDate;
        const slotEndDate = new Date(slotStartDate.getTime() + serviceDuration * 60000);
        return (slotStartDate < appEnd && slotEndDate > appStart);
      });

      if (!overlaps) {
        validSlots.push({
          time: slotLabel,
          startTime: slotDate.toISOString(),
          endTime: new Date(slotDate.getTime() + serviceDuration * 60000).toISOString(),
          label: slotLabel,
          available: true
        });
      }
    }
  });

  return validSlots;
};

// --- ENHANCED AVAILABILITY CHECKING ---

export const getAvailableProfessionalsForService = (serviceId, date, employees, appointments, availableServices) => {
  const service = availableServices.find(s => s._id === serviceId);
  if (!service) return [];
  
  return employees.filter(emp => {
    if (!hasShiftOnDate(emp, date)) return false;
    const validSlots = getValidTimeSlotsForProfessional(emp, date, service.duration, appointments);
    return validSlots.length > 0;
  });
};

// --- CONFLICT DETECTION FOR MULTIPLE SERVICES ---

export const isTimeSlotConflicting = (newSlot, newDuration, existingBookings) => {
  const newStart = timeToMinutes(newSlot);
  const newEnd = newStart + newDuration;
  
  return existingBookings.some(booking => {
    const bookingStart = timeToMinutes(booking.startTime);
    const bookingEnd = bookingStart + booking.duration;
    return (newStart < bookingEnd && newEnd > bookingStart);
  });
};

export const detectProfessionalConflict = (professionalId, date, startTime, duration, appointments, multipleAppointments) => {
  if (!professionalId || !startTime || !duration) return null;
  
  const dayKey = localDateKey(date);
  const desiredStart = timeToMinutes(startTime);
  const desiredEnd = desiredStart + duration;

  // Check existing multipleAppointments in the current session
  for (const apt of multipleAppointments) {
    if (apt.professional._id === professionalId && localDateKey(apt.date) === dayKey) {
      const aptStart = timeToMinutes(apt.timeSlot);
      const aptEnd = aptStart + apt.service.duration;
      if (desiredStart < aptEnd && desiredEnd > aptStart) {
        return { type: 'session', appointment: apt };
      }
    }
  }

  // Check existing persisted appointments
  const profAppointments = appointments?.[professionalId];
  if (profAppointments) {
    for (const [key, apt] of Object.entries(profAppointments)) {
      if (key.startsWith(dayKey)) {
        const timeSlot = key.split('_')[1];
        const aptStart = timeToMinutes(timeSlot);
        const aptEnd = aptStart + (apt.duration || 30);
        if (desiredStart < aptEnd && desiredEnd > aptStart) {
          return { type: 'existing', appointment: apt };
        }
      }
    }
  }
  
  return null;
};

// --- ENHANCED BOOKING UTILITIES ---

export const getAccumulatedBookings = (multipleAppointments, currentDate) => {
  return multipleAppointments
    .filter(apt => {
      const aptDate = new Date(apt.date);
      return localDateKey(aptDate) === localDateKey(currentDate);
    })
    .map(apt => ({
      employeeId: apt.professional._id,
      startTime: apt.timeSlot,
      endTime: addMinutesToTime(apt.timeSlot, apt.service.duration),
      duration: apt.service.duration
    }));
};

export const getAvailableTimeSlotsWithAccumulatedBookings = (employee, date, serviceDuration, appointments, multipleAppointments) => {
  // Get base time slots for the employee
  const baseSlots = getValidTimeSlotsForProfessional(employee, date, serviceDuration, appointments);
  
  // Get accumulated bookings from current session
  const accumulatedBookings = getAccumulatedBookings(multipleAppointments, date);
  const employeeAccumulatedBookings = accumulatedBookings.filter(booking => booking.employeeId === employee._id);
  
  // Filter out conflicting slots
  return baseSlots.filter(slot => {
    return !isTimeSlotConflicting(slot.label, serviceDuration, employeeAccumulatedBookings);
  });
};

export const getAvailableProfessionalsWithAccumulatedBookings = (serviceId, date, employees, appointments, availableServices, multipleAppointments) => {
  const service = availableServices.find(s => s._id === serviceId);
  if (!service) return [];
  
  return employees.filter(emp => {
    if (!hasShiftOnDate(emp, date)) return false;
    const availableSlots = getAvailableTimeSlotsWithAccumulatedBookings(emp, date, service.duration, appointments, multipleAppointments);
    return availableSlots.length > 0;
  });
};

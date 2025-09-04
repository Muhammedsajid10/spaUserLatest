// ===================================================
// ENHANCED BOOKING UTILITIES FOR USER SIDE
// Using sophisticated time generation from admin side
// ===================================================

import {
  toMinutes,
  minutesToLabel,
  addMinutesToTime,
  timeToMinutes,
  localDateKey,
  getEmployeeShiftHours,
  hasShiftOnDate,
  generateTimeSlotsFromEmployeeShift,
  getValidTimeSlotsForProfessional,
  getAvailableProfessionalsForService,
  isTimeSlotConflicting,
  detectProfessionalConflict,
  getAccumulatedBookings,
  getAvailableTimeSlotsWithAccumulatedBookings,
  getAvailableProfessionalsWithAccumulatedBookings
} from './timeGenerationUtils';

// --- ENHANCED SEQUENTIAL SERVICE BOOKING ---

export const computeSequentialServiceStartTimes = (services, professionalsMap, date) => {
  if (!services || services.length === 0) return [];
  
  const sequences = [];
  const dayKey = localDateKey(date);
  
  // Get the first service's professional and their available slots
  const firstService = services[0];
  const firstProfessional = professionalsMap[firstService._id];
  
  if (!firstProfessional) return [];
  
  const firstSlots = getValidTimeSlotsForProfessional(firstProfessional, date, firstService.duration, {});
  
  firstSlots.forEach(firstSlot => {
    const sequence = [{
      service: firstService,
      professional: firstProfessional,
      startTime: firstSlot.time,
      endTime: addMinutesToTime(firstSlot.time, firstService.duration),
      duration: firstService.duration
    }];
    
    let currentEndTime = firstSlot.time;
    let isValidSequence = true;
    
    // Process remaining services
    for (let i = 1; i < services.length && isValidSequence; i++) {
      const service = services[i];
      const professional = professionalsMap[service._id];
      
      if (!professional) {
        isValidSequence = false;
        break;
      }
      
      // Find the next available slot after current end time
      const availableSlots = getValidTimeSlotsForProfessional(professional, date, service.duration, {});
      const nextSlot = availableSlots.find(slot => timeToMinutes(slot.time) >= timeToMinutes(currentEndTime));
      
      if (!nextSlot) {
        isValidSequence = false;
        break;
      }
      
      sequence.push({
        service: service,
        professional: professional,
        startTime: nextSlot.time,
        endTime: addMinutesToTime(nextSlot.time, service.duration),
        duration: service.duration
      });
      
      currentEndTime = addMinutesToTime(nextSlot.time, service.duration);
    }
    
    if (isValidSequence) {
      sequences.push({
        startTime: firstSlot.time,
        endTime: currentEndTime,
        sequence: sequence,
        totalDuration: services.reduce((sum, s) => sum + s.duration, 0)
      });
    }
  });
  
  return sequences;
};

export const computeSequentialServiceStartTimesWithBookings = async (services, professionalsMap, date, appointmentsIndex) => {
  if (!services || services.length === 0) return [];
  
  const sequences = [];
  const dayKey = localDateKey(date);
  
  // Get the first service's professional and their available slots
  const firstService = services[0];
  const firstProfessional = professionalsMap[firstService._id];
  
  if (!firstProfessional) return [];
  
  const firstSlots = getValidTimeSlotsForProfessional(firstProfessional, date, firstService.duration, appointmentsIndex);
  
  firstSlots.forEach(firstSlot => {
    const sequence = [{
      service: firstService,
      professional: firstProfessional,
      startTime: firstSlot.time,
      endTime: addMinutesToTime(firstSlot.time, firstService.duration),
      duration: firstService.duration
    }];
    
    let currentEndTime = firstSlot.time;
    let isValidSequence = true;
    
    // Process remaining services
    for (let i = 1; i < services.length && isValidSequence; i++) {
      const service = services[i];
      const professional = professionalsMap[service._id];
      
      if (!professional) {
        isValidSequence = false;
        break;
      }
      
      // Find the next available slot after current end time
      const availableSlots = getValidTimeSlotsForProfessional(professional, date, service.duration, appointmentsIndex);
      const nextSlot = availableSlots.find(slot => timeToMinutes(slot.time) >= timeToMinutes(currentEndTime));
      
      if (!nextSlot) {
        isValidSequence = false;
        break;
      }
      
      sequence.push({
        service: service,
        professional: professional,
        startTime: nextSlot.time,
        endTime: addMinutesToTime(nextSlot.time, service.duration),
        duration: service.duration
      });
      
      currentEndTime = addMinutesToTime(nextSlot.time, service.duration);
    }
    
    if (isValidSequence) {
      sequences.push({
        startTime: firstSlot.time,
        endTime: currentEndTime,
        sequence: sequence,
        totalDuration: services.reduce((sum, s) => sum + s.duration, 0)
      });
    }
  });
  
  return sequences;
};

// --- ENHANCED PROFESSIONAL AVAILABILITY ---

export const fetchAvailableProfessionalsForServiceByWeek = async (serviceId, baseDate, services) => {
  const results = [];
  const service = services.find(s => s._id === serviceId);
  
  if (!service) return results;
  
  // Generate week dates (7 days starting from baseDate)
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);
    weekDates.push(date);
  }
  
  // For each date, get available professionals and their time slots
  weekDates.forEach(date => {
    // This would typically fetch from your API
    // For now, returning mock data structure
    results.push({
      date: localDateKey(date),
      professionals: [], // Would be populated from API
      slots: [] // Available time slots
    });
  });
  
  return results;
};

// --- SMART TIME SLOT FILTERING ---

export const filterTimeSlotsByAvailability = (timeSlots, employee, date, serviceDuration, existingBookings) => {
  return timeSlots.filter(slot => {
    const slotStart = timeToMinutes(slot.time);
    const slotEnd = slotStart + serviceDuration;
    
    // Check if slot conflicts with existing bookings
    const conflicts = existingBookings.some(booking => {
      const bookingStart = timeToMinutes(booking.startTime);
      const bookingEnd = bookingStart + booking.duration;
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
    
    return !conflicts;
  });
};

// --- ENHANCED BOOKING VALIDATION ---

export const validateBookingRequest = (bookingData) => {
  const errors = [];
  
  if (!bookingData.selectedServices || bookingData.selectedServices.length === 0) {
    errors.push('At least one service must be selected');
  }
  
  if (!bookingData.selectedDate) {
    errors.push('Date must be selected');
  }
  
  if (!bookingData.selectedTimeSlot) {
    errors.push('Time slot must be selected');
  }
  
  if (!bookingData.selectedProfessionals) {
    errors.push('Professional must be selected for each service');
  }
  
  // Validate each service has a professional assigned
  if (bookingData.selectedServices && bookingData.selectedProfessionals) {
    bookingData.selectedServices.forEach(service => {
      if (!bookingData.selectedProfessionals[service._id]) {
        errors.push(`Professional must be selected for ${service.name}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

// --- TIME SLOT FORMATTING FOR DISPLAY ---

export const formatTimeSlotForDisplay = (timeSlot, format = '12hour') => {
  if (!timeSlot || !timeSlot.time) return '';
  
  const time = timeSlot.time;
  const [hours, minutes] = time.split(':').map(Number);
  
  if (format === '12hour') {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
  
  return time; // 24-hour format
};

export const formatDurationForDisplay = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${mins} min`;
  }
};

// --- API UTILITIES ---

export const apiUtils = {
  formatDate: (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d)) return '';
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  },
  
  formatDateTime: (date, time) => {
    const dateStr = apiUtils.formatDate(date);
    return `${dateStr}T${time}:00.000Z`;
  },
  
  parseTimeSlot: (timeSlotData) => {
    return {
      id: timeSlotData.id || 0,
      time: timeSlotData.time || timeSlotData.startTime || '',
      startTime: timeSlotData.startTime || '',
      endTime: timeSlotData.endTime || '',
      available: timeSlotData.available !== false
    };
  }
};

// --- BOOKING FLOW HELPERS ---

export const createBookingTimeData = (selectedDate, timeSlot, professional, service) => {
  const selectedDateStr = apiUtils.formatDate(selectedDate);
  const startTimeStr = timeSlot.time || timeSlot.startTime;
  const endTimeStr = timeSlot.endTime;

  // Format time properly
  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    if (timeStr.includes('T')) {
      // ISO format: extract time part
      return timeStr.split('T')[1].substring(0, 5); // "HH:mm"
    }
    return timeStr; // Already in "HH:mm" format
  };

  const formattedStartTime = formatTime(startTimeStr);
  const formattedEndTime = formatTime(endTimeStr);

  // Create full ISO datetime strings
  const startDateTime = `${selectedDateStr}T${formattedStartTime}:00.000Z`;
  const endDateTime = `${selectedDateStr}T${formattedEndTime}:00.000Z`;

  return {
    date: selectedDate,
    time: formattedStartTime, // Store simple time format like "09:00"
    startTime: startDateTime, // Full ISO datetime for backend
    endTime: endDateTime, // Full ISO datetime for backend
    professional: professional,
    service: service
  };
};

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate, useLocation } from "react-router-dom";
import "./Time.css";
import Professionals from "./ProfessionalsUpdated";
import { employeesAPI, bookingsAPI, apiUtils, bookingFlow } from "../services/api";
import {
  // computeSequentialServiceStartTimes,
  getValidTimeSlotsForProfessional,
  // fetchAvailableProfessionalsForServiceByWeek,
  computeSequentialServiceStartTimesWithBookings,
  localDateKey,
  toLocalHHMM,
  getEmployeeShiftHours,
  addMinutesToTime,
  timeToMinutes,
  minutesToTime,
  getAvailableProfessionalsForService,
  formatTimeToAMPM
} from "../bookingUtils";
import { isEmployeeMarkedNotWorking } from '../bookingUtils';
import Swal from 'sweetalert2';

// Elegant full-page spinner component
const FullPageLoader = () => (
  <div className="full-page-loading">
    <div className="loader-spinner"></div>

  </div>
);

// Inline three-dot loading animation component
const LoadingDots = () => (
  <div className="loading-dots">
    <div className="dot"></div>
    <div className="dot"></div>
    <div className="dot"></div>
  </div>
);

const Time = (props) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectionMode, setSelectionMode] = useState(bookingFlow.load().selectionMode || 'perService');
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentStep] = useState(3);
  const popupRef = useRef(null);
  // Prevent "backupPerServiceRef is not defined" — keep a local backup of per-service assignments
  const backupPerServiceRef = useRef(bookingFlow.load().selectedProfessionals || {});
  const navigate = useNavigate();
  const location = useLocation();

  const [processingTimeSlotId, setProcessingTimeSlotId] = useState(null);
  // Week navigation offset: 0 = current week window starting today, +1 = next week, etc.
  const [weekOffset, setWeekOffset] = useState(0);

  // FIX: Use a ref to track if initial load is complete
  const isInitialLoad = useRef(true);

  // Utility function to check if a time slot is in the future
  const isTimeSlotInFuture = useCallback((timeSlot, selectedDate) => {
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const slotDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    
    // If slot is on a future date, it's always valid
    if (slotDate.getTime() > currentDate.getTime()) {
      return true;
    }
    
    // If slot is on a past date, it's never valid
    if (slotDate.getTime() < currentDate.getTime()) {
      return false;
    }
    
    // For today, check the actual time
    const timeStr = timeSlot.time || timeSlot.timeValue || timeSlot.startTime;
    if (!timeStr) return false;
    
    // Parse time string (supports both HH:MM and H:MM formats)
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    
    if (isNaN(hour) || isNaN(minute)) return false;
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Add a buffer of 15 minutes for booking preparation
    const slotTotalMinutes = hour * 60 + minute;
    const currentTotalMinutes = currentHour * 60 + currentMinute + 15; // 15-minute buffer
    
    return slotTotalMinutes > currentTotalMinutes;
  }, []);

  // Apply future-time filtering as the FINAL step after all business logic
  const finalFilteredTimeSlots = useMemo(() => {
    if (!Array.isArray(availableTimeSlots) || availableTimeSlots.length === 0) {
      return [];
    }

    // Apply future filtering only as the final step
    const futureSlots = availableTimeSlots.filter(slot => isTimeSlotInFuture(slot, selectedDate));
    
    console.log('[Time] FINAL FUTURE FILTER (after all business logic):', {
      afterBusinessLogic: availableTimeSlots.length,
      afterFutureFilter: futureSlots.length,
      selectedDate: selectedDate.toDateString(),
      isToday: new Date().toDateString() === selectedDate.toDateString(),
      pastSlotsRemoved: availableTimeSlots.length - futureSlots.length,
      sampleBeforeFilter: availableTimeSlots.slice(0, 3).map(s => s.time || s.timeValue || s.startTime),
      sampleAfterFilter: futureSlots.slice(0, 3).map(s => s.time || s.timeValue || s.startTime),
      businessLogicComplete: true
    });

    return futureSlots;
  }, [availableTimeSlots, isTimeSlotInFuture, selectedDate]);

  // Display helper: always show AM/PM times consistently for UI without changing internal logic
  const toDisplayTime = useCallback((slot) => {
    if (!slot) return '';
    const raw = slot.time || slot.timeValue || slot.startTime;
    if (!raw) return '';
    try {
      let hhmm = raw;
      if (raw.includes('T') || /\b(am|pm)\b/i.test(raw)) {
        // Normalize various inputs (ISO, AM/PM) to HH:mm first
        hhmm = toLocalHHMM(raw);
      }
      return formatTimeToAMPM(hhmm);
    } catch (e) {
      console.warn('[Time] toDisplayTime failed for', raw, e);
      return raw;
    }
  }, []);

  // compute 7-day array where the leftmost is always "today" + 7*weekOffset
  const todayStart = useMemo(() => {
    const t = new Date();
    t.setHours(0,0,0,0);
    return t;
  }, []);

  const weekStart = useMemo(() => {
    const s = new Date(todayStart);
    s.setDate(s.getDate() + weekOffset * 7);
    return s;
  }, [todayStart, weekOffset]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart.toDateString()]);

  // Load booking flow data and initial page load
  useEffect(() => {
    const loadBookingData = () => {
      const data = bookingFlow.load();
      if (data.selectedServices && data.selectedServices.length > 0) {
        setSelectedServices(data.selectedServices);
        setSelectedService(data.selectedServices[0]);
      } else {
        setSelectedServices([]);
        setSelectedService(null);
      }

      const professionalForService = data.selectedProfessionals?.[data.selectedServices?.[0]?._id];
      if (professionalForService) {
        setSelectedProfessional(professionalForService);
      } else {
        setSelectedProfessional(null);
      }
      setSelectionMode(data.selectionMode || 'perService');
    };

    // FIX: Only run initial load once
    if (isInitialLoad.current) {
      setLoading(true);
      loadBookingData();
      setTimeout(() => {
        setLoading(false);
        isInitialLoad.current = false;
      }, 500);
    }



//     const filteredTimeSlots = useMemo(() => {
//   if (!isToday(selectedDate)) return availableTimeSlots;

//   const now = new Date();
//   const currentHour = now.getHours();
//   const currentMinute = now.getMinutes();

//   return availableTimeSlots.filter(slot => {
//     if (!slot.time) return false;

//     // Handle both 12-hour and 24-hour formats
//     let hour, minute;
//     if (slot.time.includes(' ')) {
//       // 12-hour format (e.g., "2:30 PM")
//       const [time, period] = slot.time.split(' ');
//       [hour, minute] = time.split(':').map(Number);
//       if (period === 'PM' && hour < 12) hour += 12;
//       if (period === 'AM' && hour === 12) hour = 0;
//     } else {
//       // 24-hour format (e.g., "14:30")
//       [hour, minute] = slot.time.split(':').map(Number);
//     }

//     return hour > currentHour || (hour === currentHour && minute > currentMinute + 15);
//   });
// }, [availableTimeSlots, selectedDate]);




    const handleBookingFlowChange = (event) => {
      // Only reload if something other than time slot selection changed
      const data = bookingFlow.load();
      const currentSelectedService = selectedService?._id;
      const currentSelectedProfessional = selectedProfessional?._id || selectedProfessional?.id;
      const newSelectedService = data.selectedServices?.[0]?._id;
      const newSelectedProfessional = data.selectedProfessionals?.[data.selectedServices?.[0]?._id]?._id || 
                                      data.selectedProfessionals ?.[data.selectedServices?.[0]?._id]?.id;
      
      // Only reload data if service or professional changed (not just time slot)
      if (currentSelectedService !== newSelectedService || currentSelectedProfessional !== newSelectedProfessional) {
        loadBookingData();
      }
    };

    window.addEventListener('bookingFlowChange', handleBookingFlowChange);

    return () => {
      window.removeEventListener('bookingFlowChange', handleBookingFlowChange);
    };
  }, []); // Remove selectedService and selectedProfessional from dependencies to prevent loops

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const changeMonth = (offset) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedDate(newDate);
  };

  // ENHANCED: Employee-specific booking conflict detection system
  const fetchEmployeeBookingConflicts = async (date, employeeId) => {
    const formattedDate = apiUtils.formatDate(date);
    console.log('[Time] EMPLOYEE-SPECIFIC: Fetching booking conflicts for specific employee only', { 
      formattedDate, 
      employeeId,
      employeeName: 'Target employee'
    });

    // Get ALL bookings from admin side (may contain multiple dates)
    let allBookings = [];
    try {
      console.log('[Time] EMPLOYEE-SPECIFIC: Fetching ALL bookings from admin side');
      
      if (bookingsAPI && typeof bookingsAPI.getTotalBookingsFromAdminSide === 'function') {
        console.log('[Time] EMPLOYEE-SPECIFIC: Admin booking API available, fetching bookings');
        const resp = await bookingsAPI.getTotalBookingsFromAdminSide(formattedDate);
        console.log('[Time] EMPLOYEE-SPECIFIC: Bookings fetched from admin side', resp);
        allBookings = resp?.data?.bookings ?? resp?.bookings ?? resp?.data ?? resp ?? [];
        console.log("allBookings: ", allBookings);
        console.log('[Time] EMPLOYEE-SPECIFIC: Raw bookings fetched:', {
          totalCount: allBookings.length,
          requestedDate: formattedDate,
          targetEmployeeId: employeeId
        });
      } else {
        console.log('[Time] EMPLOYEE-SPECIFIC: Admin booking API not available');
        return { appointmentsIndex: {} };
      }
    } catch (err) {
      console.warn('[Time] EMPLOYEE-SPECIFIC: Failed to fetch bookings:', err.message);
      return { appointmentsIndex: {} };
    }

    // STEP 1: Filter bookings by selected date
    const selectedDateKey = localDateKey(date);
    const dateFilteredBookings = allBookings.filter(booking => {
      if (!booking.appointmentDate) return false;
      const bookingDateKey = localDateKey(new Date(booking.appointmentDate));
      return bookingDateKey === selectedDateKey;
    });

    console.log('[Time] EMPLOYEE-SPECIFIC STEP 1 - Date filtering:', {
      selectedDate: selectedDateKey,
      totalBookings: allBookings.length,
      dateFilteredBookings: dateFilteredBookings.length
    });

    // STEP 2: Extract ONLY bookings for the specific employee
    let employeeSpecificBookings = [];
    
    dateFilteredBookings.forEach(booking => {
      if (booking.services && Array.isArray(booking.services)) {
        booking.services.forEach(service => {
          const serviceEmployeeId = service.employee?._id || service.employee?.id;
          
          // CRITICAL: Only include bookings for THIS specific employee
          if (String(serviceEmployeeId) === String(employeeId)) {
            employeeSpecificBookings.push({
              _id: service._id || service.id || `${booking._id}_${service._id}`,
              bookingId: booking._id,
              employeeId: serviceEmployeeId,
              employee: service.employee,
              startTime: service.startTime,
              endTime: service.endTime,
              duration: service.duration || 30,
              status: service.status || booking.status,
              appointmentDate: booking.appointmentDate,
              serviceName: service.service?.name || 'Unknown Service'
            });
          }
        });
      }
    });

    console.log('[Time] EMPLOYEE-SPECIFIC STEP 2 - Employee filtering:', {
      targetEmployeeId: employeeId,
      dateFilteredBookings: dateFilteredBookings.length,
      totalServiceBookings: dateFilteredBookings.reduce((sum, b) => sum + (b.services?.length || 0), 0),
      employeeSpecificBookings: employeeSpecificBookings.length,
      conflictingTimeSlots: employeeSpecificBookings.map(b => ({
        timeSlot: `${b.startTime}-${b.endTime}`,
        duration: b.duration,
        serviceName: b.serviceName,
        bookingId: b.bookingId,
        appointmentDate: b.appointmentDate
      }))
    });

    // ENHANCED LOGGING: Detailed booking conflicts for the specific chosen employee
    if (employeeSpecificBookings.length > 0) {
      console.log('🚫 EMPLOYEE-SPECIFIC BOOKING CONFLICTS for chosen employee on chosen date:', {
        chosenEmployeeId: employeeId,
        chosenDate: selectedDateKey,
        conflictingBookings: employeeSpecificBookings.map(booking => ({
          bookingId: booking.bookingId,
          timeSlot: `${booking.startTime} - ${booking.endTime}`,
          duration: `${booking.duration} minutes`,
          serviceName: booking.serviceName,
          status: booking.status,
          appointmentDate: booking.appointmentDate,
          rawStartTime: booking.startTime,
          rawEndTime: booking.endTime,
          employeeInfo: {
            id: booking.employee?._id || booking.employee?.id,
            name: booking.employee?.user ? 
              `${booking.employee.user.firstName} ${booking.employee.user.lastName}` : 
              booking.employee?.name
          }
        })),
        totalConflicts: employeeSpecificBookings.length,
        message: 'These time slots are BLOCKED for the chosen employee on the chosen date'
      });

      // Convert booking times to readable format for easier debugging
      const blockedTimeSlots = employeeSpecificBookings.map(booking => {
        const normalizeTime = (timeStr) => {
          if (!timeStr) return 'N/A';
          if (timeStr.includes('T')) {
            const date = new Date(timeStr);
            
            // TIMEZONE DEBUG: Log the conversion
            console.log('[Time] 🌍 EMPLOYEE-SPECIFIC TIME CONVERSION:', {
              originalISO: timeStr,
              utcTime: `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`,
              localTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
              timezoneOffset: date.getTimezoneOffset()
            });
            
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          }
          return timeStr;
        };
        
        return {
          startTime: normalizeTime(booking.startTime),
          endTime: normalizeTime(booking.endTime),
          duration: booking.duration,
          service: booking.serviceName,
          bookingId: booking.bookingId
        };
      });

      console.log('⏰ EMPLOYEE-SPECIFIC BLOCKED TIME SLOTS (normalized format):', {
        employeeId: employeeId,
        date: selectedDateKey,
        blockedSlots: blockedTimeSlots,
        timeSlotsSummary: blockedTimeSlots.map(slot => `${slot.startTime}-${slot.endTime} (${slot.service})`).join(', '),
        blockingMessage: 'These time slots should NOT appear as available options for the user'
      });
    } else {
      console.log('✅ NO EMPLOYEE-SPECIFIC BOOKING CONFLICTS for chosen employee on chosen date:', {
        chosenEmployeeId: employeeId,
        chosenDate: selectedDateKey,
        message: 'All time slots are available for this employee on this date',
        totalBookingsForDate: dateFilteredBookings.length,
        totalServiceBookingsForDate: dateFilteredBookings.reduce((sum, b) => sum + (b.services?.length || 0), 0)
      });
    }

    // ENHANCED: Check for overlapping bookings within the same employee
    console.log('[Time] EMPLOYEE-SPECIFIC: Checking for overlapping bookings within same employee');
    const overlapWarnings = [];
    for (let i = 0; i < employeeSpecificBookings.length; i++) {
      for (let j = i + 1; j < employeeSpecificBookings.length; j++) {
        const booking1 = employeeSpecificBookings[i];
        const booking2 = employeeSpecificBookings[j];
        
        // Convert times to comparable format
        const normalizeTime = (timeStr) => {
          if (!timeStr) return null;
          if (timeStr.includes('T')) {
            const date = new Date(timeStr);
            
            // TIMEZONE DEBUG: Log the conversion for overlap detection
            console.log('[Time] 🌍 OVERLAP DETECTION TIME CONVERSION:', {
              originalISO: timeStr,
              utcTime: `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`,
              localTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
              timezoneOffset: date.getTimezoneOffset()
            });
            
            // CRITICAL FIX: Use local time instead of UTC for proper timezone handling
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          }
          return timeStr;
        };
        
        const start1 = normalizeTime(booking1.startTime);
        const end1 = normalizeTime(booking1.endTime);
        const start2 = normalizeTime(booking2.startTime);
        const end2 = normalizeTime(booking2.endTime);
        
        // Check for overlap: (start1 < end2) AND (end1 > start2)
        if (start1 < end2 && end1 > start2) {
          overlapWarnings.push({
            booking1: { id: booking1.bookingId, time: `${start1}-${end1}`, service: booking1.serviceName },
            booking2: { id: booking2.bookingId, time: `${start2}-${end2}`, service: booking2.serviceName },
            overlapType: start1 === start2 ? 'exact-match' : 'partial-overlap'
          });
        }
      }
    }
    
    if (overlapWarnings.length > 0) {
      console.warn('[Time] EMPLOYEE-SPECIFIC: ⚠️ OVERLAPPING BOOKINGS DETECTED for employee:', {
        employeeId,
        overlaps: overlapWarnings,
        message: 'This employee has conflicting time slots - system should prevent double booking!'
      });
    }

    // STEP 3: Build appointmentsIndex ONLY for this employee
    const appointmentsIndex = {};
    appointmentsIndex[employeeId] = {};
    appointmentsIndex[employeeId][selectedDateKey] = {};
    
    employeeSpecificBookings.forEach(serviceBooking => {
      // Normalize stored times to local HH:mm to avoid format mismatches (ISO/AMPM/etc)
      const startTimeRaw = serviceBooking.startTime;
      const endTimeRaw = serviceBooking.endTime;
      const startTime = toLocalHHMM(startTimeRaw) || startTimeRaw;
      const endTime = toLocalHHMM(endTimeRaw) || endTimeRaw;
      
      if (!startTime) {
        console.warn('[Time] EMPLOYEE-SPECIFIC: Skipping booking with missing time:', serviceBooking);
        return;
      }
      
      // Create unique key for this booking
      const bookingKey = serviceBooking._id || `${startTime}_${employeeId}_${serviceBooking.bookingId}`;
      
      // Store the booking in appointmentsIndex
      appointmentsIndex[employeeId][selectedDateKey][bookingKey] = {
        _id: serviceBooking._id,
        bookingId: serviceBooking.bookingId,
        employeeId: employeeId,
        startTime: startTime,
        endTime: endTime,
        duration: serviceBooking.duration,
        status: serviceBooking.status,
        serviceName: serviceBooking.serviceName
      };
    });

    console.log('[Time] EMPLOYEE-SPECIFIC STEP 3 - appointmentsIndex built:', {
      selectedDate: selectedDateKey,
      employeeId: employeeId,
      bookingsCount: Object.keys(appointmentsIndex[employeeId][selectedDateKey]).length,
      bookings: Object.values(appointmentsIndex[employeeId][selectedDateKey]).map(b => ({
        timeSlot: `${b.startTime}-${b.endTime}`,
        duration: b.duration,
        service: b.serviceName,
        bookingId: b.bookingId
      }))
    });

    return { appointmentsIndex };
  };

  // Enhanced booking conflict detection system (FALLBACK for "Any professional" mode)
  const fetchDateData = async (date) => {
    const formattedDate = apiUtils.formatDate(date);
    console.log('[Time] fetchDateData start - Enhanced booking filtering (FALLBACK)', { formattedDate });

    // Get ALL bookings from admin side (may contain multiple dates)
    let allBookings = [];
    try {
      console.log('[Time] Fetching ALL bookings from admin side for enhanced filtering');
      
      if (bookingsAPI && typeof bookingsAPI.getTotalBookingsFromAdminSide === 'function') {
        const resp = await bookingsAPI.getTotalBookingsFromAdminSide(formattedDate);
        allBookings = resp?.data?.bookings ?? resp?.bookings ?? resp?.data ?? resp ?? [];
        console.log("allBookings: ", allBookings);
        console.log('[Time] Raw bookings fetched from admin:', {
          totalCount: allBookings.length,
          requestedDate: formattedDate,
          sample: allBookings.slice(0, 2).map(b => ({
            id: b._id,
            appointmentDate: b.appointmentDate,
            servicesCount: b.services?.length || 0
          }))
        });
      } else {
        console.log('[Time] Admin booking API not available, generating slots without conflict checking');
        return { appointmentsIndex: {} };
      }
    } catch (err) {
      console.warn('[Time] Failed to fetch bookings from admin side:', err.message);
      return { appointmentsIndex: {} };
    }

    // STEP 1: Filter bookings by selected date
    const selectedDateKey = localDateKey(date);
    const dateFilteredBookings = allBookings.filter(booking => {
      if (!booking.appointmentDate) return false;
      const bookingDateKey = localDateKey(new Date(booking.appointmentDate));
      return bookingDateKey === selectedDateKey;
    });

    console.log('[Time] STEP 1 - Date filtering:', {
      selectedDate: selectedDateKey,
      totalBookings: allBookings.length,
      dateFilteredBookings: dateFilteredBookings.length,
      filteredSample: dateFilteredBookings.slice(0, 2).map(b => ({
        id: b._id,
        appointmentDate: b.appointmentDate,
        servicesCount: b.services?.length || 0
      }))
    });

    // STEP 2: Extract individual service bookings and filter by selected employee
    const flow = bookingFlow.load();
    const selectedProfessionalForService = flow.selectedProfessionals?.[selectedService?._id] || selectedProfessional;
    const hasSpecificProfessional = selectedProfessionalForService && 
      selectedProfessionalForService.id !== 'any' && 
      selectedProfessionalForService._id !== 'any';

    let relevantServiceBookings = [];
    
    // Extract all individual service bookings from date-filtered bookings
    dateFilteredBookings.forEach(booking => {
      if (booking.services && Array.isArray(booking.services)) {
        booking.services.forEach(service => {
          const serviceEmployeeId = service.employee?._id || service.employee?.id;
          
          // If specific professional selected, filter by employee
          if (hasSpecificProfessional) {
            const targetEmployeeId = selectedProfessionalForService._id || selectedProfessionalForService.id;
            if (String(serviceEmployeeId) === String(targetEmployeeId)) {
              relevantServiceBookings.push({
                _id: service._id || service.id || `${booking._id}_${service._id}`,
                bookingId: booking._id,
                employeeId: serviceEmployeeId,
                employee: service.employee,
                startTime: service.startTime,
                endTime: service.endTime,
                duration: service.duration || 30,
                status: service.status || booking.status,
                appointmentDate: booking.appointmentDate,
                serviceName: service.service?.name || 'Unknown Service'
              });
            }
          } else {
            // No specific professional - include all service bookings for "Any professional" mode
            relevantServiceBookings.push({
              _id: service._id || service.id || `${booking._id}_${service._id}`,
              bookingId: booking._id,
              employeeId: serviceEmployeeId,
              employee: service.employee,
              startTime: service.startTime,
              endTime: service.endTime,
              duration: service.duration || 30,
              status: service.status || booking.status,
              appointmentDate: booking.appointmentDate,
              serviceName: service.service?.name || 'Unknown Service'
            });
          }
        });
      }
    });

    console.log('[Time] STEP 2 - Employee filtering and service extraction:', {
      hasSpecificProfessional,
      selectedProfessionalId: hasSpecificProfessional ? (selectedProfessionalForService._id || selectedProfessionalForService.id) : 'any',
      selectedProfessionalName: hasSpecificProfessional ? 
        (selectedProfessionalForService.user ? 
          `${selectedProfessionalForService.user.firstName} ${selectedProfessionalForService.user.lastName}` : 
          selectedProfessionalForService.name) : 'Any professional',
      dateFilteredBookings: dateFilteredBookings.length,
      totalServiceBookings: dateFilteredBookings.reduce((sum, b) => sum + (b.services?.length || 0), 0),
      relevantServiceBookings: relevantServiceBookings.length,
      blockedTimeSlots: relevantServiceBookings.map(b => ({
        employeeId: b.employeeId,
        timeSlot: `${b.startTime}-${b.endTime}`,
        duration: b.duration,
        serviceName: b.serviceName
      }))
    });

    // ENHANCED LOGGING: Detailed booking conflicts for chosen employee on chosen date
    if (hasSpecificProfessional && relevantServiceBookings.length > 0) {
      const targetEmployeeId = selectedProfessionalForService._id || selectedProfessionalForService.id;
      const targetEmployeeName = selectedProfessionalForService.user ? 
        `${selectedProfessionalForService.user.firstName} ${selectedProfessionalForService.user.lastName}` : 
        selectedProfessionalForService.name;
      
      console.log('🚫 BOOKING CONFLICTS DETECTED for chosen employee on chosen date:', {
        chosenEmployee: {
          id: targetEmployeeId,
          name: targetEmployeeName
        },
        chosenDate: localDateKey(date),
        conflictingBookings: relevantServiceBookings.map(booking => ({
          bookingId: booking.bookingId,
          timeSlot: `${booking.startTime} - ${booking.endTime}`,
          duration: `${booking.duration} minutes`,
          serviceName: booking.serviceName,
          status: booking.status,
          appointmentDate: booking.appointmentDate,
          rawStartTime: booking.startTime,
          rawEndTime: booking.endTime
        })),
        totalConflicts: relevantServiceBookings.length,
        message: 'These time slots are BLOCKED for the chosen employee on the chosen date'
      });

      // Convert booking times to readable format for easier debugging
      const blockedTimeSlots = relevantServiceBookings.map(booking => {
        const normalizeTime = (timeStr) => {
          if (!timeStr) return 'N/A';
          if (timeStr.includes('T')) {
            const date = new Date(timeStr);
            
            // TIMEZONE DEBUG: Log the conversion for general booking conflicts
            console.log('[Time] 🌍 GENERAL BOOKING CONFLICT TIME CONVERSION:', {
              originalISO: timeStr,
              utcTime: `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`,
              localTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
              timezoneOffset: date.getTimezoneOffset()
            });
            
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          }
          return timeStr;
        };
        
        return {
          startTime: normalizeTime(booking.startTime),
          endTime: normalizeTime(booking.endTime),
          duration: booking.duration,
          service: booking.serviceName,
          bookingId: booking.bookingId
        };
      });

      console.log('⏰ BLOCKED TIME SLOTS (normalized format) for chosen employee:', {
        employeeName: targetEmployeeName,
        date: localDateKey(date),
        blockedSlots: blockedTimeSlots,
        timeSlotsSummary: blockedTimeSlots.map(slot => `${slot.startTime}-${slot.endTime} (${slot.service})`).join(', ')
      });
    } else if (hasSpecificProfessional && relevantServiceBookings.length === 0) {
      const targetEmployeeId = selectedProfessionalForService._id || selectedProfessionalForService.id;
      const targetEmployeeName = selectedProfessionalForService.user ? 
        `${selectedProfessionalForService.user.firstName} ${selectedProfessionalForService.user.lastName}` : 
        selectedProfessionalForService.name;
      
      console.log('✅ NO BOOKING CONFLICTS for chosen employee on chosen date:', {
        chosenEmployee: {
          id: targetEmployeeId,
          name: targetEmployeeName
        },
        chosenDate: localDateKey(date),
        message: 'All time slots are available for this employee on this date',
        totalBookingsForDate: dateFilteredBookings.length,
        totalServiceBookingsForDate: dateFilteredBookings.reduce((sum, b) => sum + (b.services?.length || 0), 0)
      });
    }

    // STEP 3: Build appointmentsIndex from relevant service bookings
    const appointmentsIndex = {};
    
    relevantServiceBookings.forEach(serviceBooking => {
      // Normalize stored times to local HH:mm to avoid format mismatches
      const empId = serviceBooking.employeeId;
      const startTimeRaw = serviceBooking.startTime;
      const endTimeRaw = serviceBooking.endTime;
      const startTime = toLocalHHMM(startTimeRaw) || startTimeRaw;
      const endTime = toLocalHHMM(endTimeRaw) || endTimeRaw;
      
      if (!empId || !startTime) {
        console.warn('[Time] Skipping service booking with missing employee or time:', serviceBooking);
        return;
      }
      
      // Ensure appointmentsIndex structure exists
      appointmentsIndex[empId] = appointmentsIndex[empId] || {};
      appointmentsIndex[empId][selectedDateKey] = appointmentsIndex[empId][selectedDateKey] || {};
      
      // Create unique key for this booking
      const bookingKey = serviceBooking._id || `${startTime}_${empId}_${serviceBooking.bookingId}`;
      
      // Store the booking in appointmentsIndex
      appointmentsIndex[empId][selectedDateKey][bookingKey] = {
        _id: serviceBooking._id,
        bookingId: serviceBooking.bookingId,
        employeeId: empId,
        startTime: startTime,
        endTime: endTime,
        duration: serviceBooking.duration,
        status: serviceBooking.status,
        serviceName: serviceBooking.serviceName
      };
    });

    console.log('[Time] STEP 3 - appointmentsIndex built:', {
      selectedDate: selectedDateKey,
      employeesWithBookings: Object.keys(appointmentsIndex).length,
      employeeBookingDetails: Object.keys(appointmentsIndex).map(empId => ({
        employeeId: empId,
        bookingsCount: Object.keys(appointmentsIndex[empId][selectedDateKey] || {}).length,
        bookings: Object.values(appointmentsIndex[empId][selectedDateKey] || {}).map(b => ({
          timeSlot: `${b.startTime}-${b.endTime}`,
          duration: b.duration,
          service: b.serviceName
        }))
      })),
      conflictDetectionEnabled: relevantServiceBookings.length > 0
    });

    return { appointmentsIndex };
  };

  const handleDateClick = async (dayOrDate) => {
    console.log('[Time] handleDateClick start (local computation)', { dayOrDate, selectedService, selectedProfessional });
    let newDate;
    if (dayOrDate instanceof Date) {
      newDate = new Date(dayOrDate.getFullYear(), dayOrDate.getMonth(), dayOrDate.getDate());
    } else {
      // Backward compatibility for calendar day clicks passing a number
      newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayOrDate);
    }
    setSelectedDate(newDate);
    setCalendarOpen(false);
    setLoadingTimeSlots(true);
    setAvailableTimeSlots([]);

    try {
      const flow = bookingFlow.load();
      const services = (flow.selectedServices && flow.selectedServices.length) ? flow.selectedServices : ([selectedService].filter(Boolean));

      const { appointmentsIndex } = await fetchDateData(newDate);

      // single-service -> compute using local slots for the assigned professional (or union if 'any')
      if (!services || services.length <= 1) {
        const svc = services && services[0] || selectedService;
        if (!svc) throw new Error('No service selected');

        const assigned = flow.selectedProfessionals?.[svc._id] || selectedProfessional;

        if (!assigned || assigned.id === 'any' || assigned._id === 'any') {
          // For "Any professional", fetch employees only when needed for union calculation
          console.log('[Time] single-service ANY -> fetching employees for union slots');
          let employees = [];
          try {
            const resp = await bookingsAPI.getAvailableProfessionals(svc._id, apiUtils.formatDate(newDate));
            employees = resp?.data?.professionals ?? resp?.professionals ?? resp?.data ?? resp ?? [];
            employees = employees.filter(emp => emp.isActive !== false);
          } catch (err) {
            console.warn('[Time] Failed to fetch professionals for Any selection:', err);
            employees = [];
          }
          
          const avail = getAvailableProfessionalsForService(svc._id, newDate, employees, appointmentsIndex, flow.selectedServices || [svc]);
          const union = [];
          (avail || []).forEach(r => (r.slots || []).forEach(s => union.push(s)));
          const uniq = Array.from(new Set(union)).sort();
          const slots = uniq.map((t,i) => {
            const normalized = toLocalHHMM(t) || t;
            return ({
              id: i,
              time: normalized,
              timeValue: normalized,
              startTime: normalized,
              endTime: addMinutesToTime(normalized, svc.duration || 30),
              available: true
            });
          });
          console.log('[Time] union slots count', slots.length);
          setAvailableTimeSlots(slots);
          return;
        }

        // assigned is a specific employee -> compute valid slots using appointmentsIndex for that employee
        const duration = svc.duration || 30;
        const empId = assigned._id || assigned.id;
        console.log('[Time] computing local slots for employee', { employeeId: empId, date: localDateKey(newDate), duration });
        const slotsArr = getValidTimeSlotsForProfessional(assigned, new Date(newDate), duration, appointmentsIndex);
        console.log('[Time] local slots computed count', slotsArr.length, slotsArr.slice(0,6));
        const mapped = slotsArr.map((t, i) => {
          const normalized = toLocalHHMM(t) || t;
          return ({
            id: i,
            time: normalized,
            timeValue: normalized,
            startTime: normalized,
            endTime: addMinutesToTime(normalized, duration),
            available: true
          });
        });
        setAvailableTimeSlots(mapped);
        return;
      }

      // multi-service -> compute sequential series (back-to-back)
      const missing = services.filter(s => !flow.selectedProfessionals?.[s._id]);
      if (missing.length) {
        console.log('[Time] multi-service missing assigned professionals', missing.map(m=>m._id));
        setAvailableTimeSlots([]);
        setError('Please assign professionals to all services first');
        return;
      }

      const professionalsMap = {};
      services.forEach(svc => {
        professionalsMap[svc._id] = flow.selectedProfessionals[svc._id];
      });

      console.log('[Time] computing sequential service start times locally (with bookings)', { services: services.map(s=>s._id), date: localDateKey(newDate) });
      const sequences = await computeSequentialServiceStartTimesWithBookings(services, professionalsMap, newDate, appointmentsIndex);
      console.log('[Time] sequences found', sequences?.length);
      if (!sequences || sequences.length === 0) {
        setAvailableTimeSlots([]);
        setError('No sequential time slots available for assigned professionals on this date.');
        return;
      }
      const slots = sequences.map((s, idx) => ({
        id: idx,
        time: toLocalHHMM(s.startTime) || s.startTime,
        timeValue: toLocalHHMM(s.startTime) || s.startTime,
        startTime: toLocalHHMM(s.startTime) || s.startTime,
        endTime: toLocalHHMM(s.sequence[s.sequence.length - 1].endTime) || s.sequence[s.sequence.length - 1].endTime,
        available: true,
        sequence: s.sequence
      }));
      setAvailableTimeSlots(slots);
    } catch (err) {
      console.error('[Time] handleDateClick local computation error', err);
      setError(err.message || 'Failed to compute time slots locally');
      setAvailableTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  useEffect(() => {
    const fetchTimeSlots = async () => {
      console.log('[Time] useEffect fetchTimeSlots TRIGGERED - checking dependencies:', { 
        selectedServiceId: selectedService?._id, 
        selectedProfessionalId: selectedProfessional?._id || selectedProfessional?.id, 
        selectedDateString: selectedDate.toDateString(),
        timestamp: new Date().toISOString()
      });

      if (!selectedService || !selectedDate) {
        console.log('[Time] fetchTimeSlots abort - missing service or date');
        setAvailableTimeSlots([]);
        return;
      }

      setLoadingTimeSlots(true);
      setError(null);

      try {
        // FIXED WORKFLOW: Don't fetch ALL bookings upfront
        // Instead, fetch employee schedule first, then specific booking conflicts
        console.log('[Time] FIXED WORKFLOW - Starting with employee schedule first', {
          selectedServiceId: selectedService?._id,
          selectedDate: selectedDate.toDateString(),
          timestamp: new Date().toISOString()
        });

        // Note: Employee schedules now fetched via getEmployeeSchedule API for specific professionals

        const flow = bookingFlow.load();
        const services = flow.selectedServices && flow.selectedServices.length ? flow.selectedServices : [selectedService];

        // Multi-service flow - FIXED WORKFLOW 
        if (services.length > 1) {
          console.log('[Time] FIXED WORKFLOW - Multi-service flow starting');
          const missing = services.filter(s => !flow.selectedProfessionals?.[s._id]);
          if (missing.length) {
            console.log('[Time] multi-service abort - missing assignments', missing.map(m=>m._id));
            setAvailableTimeSlots([]);
            return;
          }

          // Build professionals map and employeeIds
          const professionalsMap = {};
          const employeeIds = [];
          services.forEach(svc => {
            const emp = flow.selectedProfessionals[svc._id];
            professionalsMap[svc._id] = emp;
            const id = emp?._id || emp?.id;
            if (id) employeeIds.push(id);
          });

          console.log('[Time] FIXED WORKFLOW - Multi-service: Fetching booking conflicts after professional assignment');
          // Now fetch booking conflicts for these specific employees
          const { appointmentsIndex } = await fetchDateData(selectedDate);

          // Ensure appointmentsIndex keys match employee ids used by professionalsMap
          employeeIds.forEach(id => {
            if (!appointmentsIndex[id]) {
              const alt = Object.keys(appointmentsIndex).find(k => String(k).endsWith(String(id)) || String(id).endsWith(String(k)));
              if (alt) {
                appointmentsIndex[id] = appointmentsIndex[alt];
                console.log('[Time] normalized appointments key', { want: id, using: alt });
              } else {
                appointmentsIndex[id] = appointmentsIndex[id] || {};
                appointmentsIndex[id][localDateKey(selectedDate)] = appointmentsIndex[id][localDateKey(selectedDate)] || {};
              }
            }
          });

          // compute sequences using bookings/shifts (helper uses appointmentsIndex)
          const sequences = await computeSequentialServiceStartTimesWithBookings(services, professionalsMap, selectedDate, appointmentsIndex);
          console.log('[Time] sequences computed with bookings count', sequences?.length);
          if (!sequences || sequences.length === 0) {
            setAvailableTimeSlots([]);
            setError('No sequential time slots available for assigned professionals on this date. Try another date or change professionals.');
            return;
          }
          const slots = sequences.map((s, idx) => ({
            id: idx,
            time: s.startTime, // Display in 24-hour HH:mm format
            timeValue: s.startTime, // Keep original 24-hour format for calculations
            startTime: s.startTime,
            endTime: s.sequence[s.sequence.length - 1].endTime,
            available: true,
            sequence: s.sequence
          }));
          setAvailableTimeSlots(slots);
          setLoadingTimeSlots(false);
          return;
        }

        // Single-service flow - FIXED WORKFLOW
        const svc = services[0];
        const assigned = flow.selectedProfessionals?.[svc._id] || selectedProfessional;
        
        console.log('[Time] FIXED WORKFLOW - Single-service assignment check:', {
          serviceId: svc._id,
          assignedFromFlow: flow.selectedProfessionals?.[svc._id],
          assignedFromState: selectedProfessional,
          finalAssigned: assigned,
          assignedId: assigned?.id || assigned?._id,
          assignedName: assigned?.user ? `${assigned.user.firstName} ${assigned.user.lastName}` : assigned?.name,
          isAny: !assigned || assigned.id === 'any' || assigned._id === 'any'
        });
        
        if (!assigned || assigned.id === 'any' || assigned._id === 'any') {
          console.log('[Time] single-service ANY -> using old workflow (fetch bookings first)');
          // For "Any professional", use old workflow - fetch bookings first
          const { appointmentsIndex } = await fetchDateData(selectedDate);
          
          let availableEmployees = [];
          try {
            const resp = await bookingsAPI.getAvailableProfessionals(svc._id, apiUtils.formatDate(selectedDate));
            availableEmployees = resp?.data?.professionals ?? resp?.professionals ?? resp?.data ?? resp ?? [];
            availableEmployees = availableEmployees.filter(emp => emp.isActive !== false);
          } catch (err) {
            console.warn('[Time] Failed to fetch professionals for Any selection:', err);
            availableEmployees = [];
          }
          
          const profsResult = getAvailableProfessionalsForService(svc._id, selectedDate, availableEmployees, appointmentsIndex, services);
          const union = [];
          (profsResult || []).forEach(r => (r.slots || []).forEach(s => union.push(s)));
          const uniq = Array.from(new Set(union)).sort();
          const slots = uniq.map((t,i) => ({ 
            id:i, 
            time: toLocalHHMM(t) || t,
            timeValue: toLocalHHMM(t) || t,
            startTime: toLocalHHMM(t) || t,
            endTime: addMinutesToTime(toLocalHHMM(t) || t, svc.duration || 30),
            available: true
          }));
          console.log('[Time] union slots count', slots.length);
          setAvailableTimeSlots(slots);
          setLoadingTimeSlots(false);
          return;
        }

        // FIXED WORKFLOW: Specific professional selected - fetch their schedule FIRST
        const duration = svc.duration || 30;
        const empId = assigned._id || assigned.id;
        const formattedDate = apiUtils.formatDate(selectedDate);
        
        console.log('[Time] FIXED WORKFLOW - Fetching employee schedule FIRST (before bookings):', {
          assignedEmployee: assigned,
          employeeId: empId,
          employeeName: assigned?.user ? `${assigned.user.firstName} ${assigned.user.lastName}` : assigned?.name,
          formattedDate,
          selectedDate: selectedDate.toString()
        });
        
        try {
          console.log('[Time] STEP 1 - Fetching employee schedule template first', { employeeId: empId, date: formattedDate });
          const response = await bookingsAPI.getEmployeeSchedule(empId, formattedDate);
          const scheduleData = response?.data || response;
          
          console.log('[Time] STEP 1 - Employee schedule template fetched:', {
            scheduledShifts: scheduleData.scheduledShifts,
            rawAvailableSlots: scheduleData.availableTimeSlots?.length || 0
          });
          
          // STEP 2: Now fetch booking conflicts for THIS specific employee only  
          console.log('[Time] STEP 2 - Fetching booking conflicts for specific employee using new method');
          const { appointmentsIndex } = await fetchEmployeeBookingConflicts(selectedDate, empId);
          
          const rawScheduleSlots = scheduleData.availableTimeSlots || [];
          console.log('[Time] STEP 2 - Raw schedule slots from API:', { count: rawScheduleSlots.length, sample: rawScheduleSlots.slice(0,6) });
          
          // STEP 3: Apply booking conflict filtering AND shift boundary validation
          const dateKey = localDateKey(selectedDate);
          const employeeBookings = appointmentsIndex[empId]?.[dateKey] || {};
          const bookingCount = Object.keys(employeeBookings).length;
          
          // 🔍 CRITICAL DEBUG: Verify time format consistency
          console.log('🔍 TIME FORMAT DEBUGGING - Before filtering slots:', {
            employeeId: empId,
            selectedDate: dateKey,
            totalBookings: bookingCount,
            rawScheduleSlotsPreview: rawScheduleSlots.slice(0, 3).map(s => ({
              time: s.time || s.startTime,
              endTime: s.endTime,
              rawSlot: s
            })),
            bookingsPreview: Object.values(employeeBookings).map(b => ({
              startTime: b.startTime,
              endTime: b.endTime,
              serviceName: b.serviceName,
              bookingId: b.bookingId
            })),
            timeFormatAnalysis: {
              slotTimeExample: rawScheduleSlots[0]?.time || rawScheduleSlots[0]?.startTime,
              bookingTimeExample: Object.values(employeeBookings)[0]?.startTime,
              slotTimeFormat: (rawScheduleSlots[0]?.time || rawScheduleSlots[0]?.startTime)?.includes('T') ? 'ISO DateTime' : 'HH:mm',
              bookingTimeFormat: Object.values(employeeBookings)[0]?.startTime?.includes('T') ? 'ISO DateTime' : 'HH:mm'
            }
          });

          // 🚨 CRITICAL TIMEZONE TEST: Let's manually convert the first booking time
          if (Object.values(employeeBookings).length > 0) {
            const firstBooking = Object.values(employeeBookings)[0];
            const testDate = new Date(firstBooking.startTime);
            console.log('🚨 CRITICAL TIMEZONE TEST for first booking:', {
              originalBookingTime: firstBooking.startTime,
              serviceName: firstBooking.serviceName,
              parsedDate: testDate.toString(),
              utcHours: testDate.getUTCHours(),
              utcMinutes: testDate.getUTCMinutes(),
              localHours: testDate.getHours(),
              localMinutes: testDate.getMinutes(),
              utcTime: `${String(testDate.getUTCHours()).padStart(2, '0')}:${String(testDate.getUTCMinutes()).padStart(2, '0')}`,
              localTime: `${String(testDate.getHours()).padStart(2, '0')}:${String(testDate.getMinutes()).padStart(2, '0')}`,
              timezoneOffset: testDate.getTimezoneOffset(),
              expectedRealTime: '09:00 AM (from user perspective)',
              actualConvertedTime: 'See localTime above - should be 09:00'
            });
          }
          
          // ENHANCED: Extract shift end time from schedule data for boundary validation
          const employeeShifts = scheduleData.scheduledShifts || [];
          let shiftEndTime = null;
          
          console.log('[Time] DEBUG - Schedule data structure:', {
            scheduledShifts: scheduleData.scheduledShifts,
            shiftsCount: employeeShifts.length,
            firstShift: employeeShifts[0],
            allShiftData: employeeShifts,
            scheduleDataKeys: Object.keys(scheduleData),
            fullScheduleData: scheduleData
          });
          
          if (employeeShifts.length > 0 && employeeShifts[0] && employeeShifts[0].endTime) {
            // Method 1: Extract from scheduled shifts (preferred)
            shiftEndTime = employeeShifts[0].endTime;
            console.log('[Time] ✅ METHOD 1 - Shift end time from scheduledShifts:', {
              shiftEndTime,
              shiftData: employeeShifts[0],
              method: 'scheduledShifts[0].endTime'
            });
          } else if (scheduleData.workingHours && scheduleData.workingHours.endTime) {
            // Method 2: Extract from workingHours (alternative)
            shiftEndTime = scheduleData.workingHours.endTime;
            console.log('[Time] ✅ METHOD 2 - Shift end time from workingHours:', {
              shiftEndTime,
              workingHours: scheduleData.workingHours,
              method: 'workingHours.endTime'
            });
          } else if (scheduleData.shift && scheduleData.shift.endTime) {
            // Method 3: Extract from shift object (alternative)
            shiftEndTime = scheduleData.shift.endTime;
            console.log('[Time] ✅ METHOD 3 - Shift end time from shift object:', {
              shiftEndTime,
              shift: scheduleData.shift,
              method: 'shift.endTime'
            });
          } else if (rawScheduleSlots.length > 0) {
            // Method 4: FALLBACK - Estimate from last available slot
            const lastSlot = rawScheduleSlots[rawScheduleSlots.length - 1];
            if (lastSlot) {
              const lastSlotTime = lastSlot.time || lastSlot.startTime;
              // Add service duration to get when the last service would end
              shiftEndTime = addMinutesToTime(lastSlotTime, duration);
              console.log('[Time] ⚠️ METHOD 4 FALLBACK - Estimated shift end from last slot:', {
                lastSlotTime,
                serviceDuration: duration,
                estimatedShiftEnd: shiftEndTime,
                method: 'lastSlot + serviceDuration',
                warningMessage: 'Using fallback estimation - may not be accurate!'
              });
            }
          } else {
            // Method 5: EMERGENCY FALLBACK - Use a default end time
            shiftEndTime = "18:00"; // Default 6 PM
            console.error('[Time] 🚨 METHOD 5 EMERGENCY - Using default shift end time:', {
              defaultShiftEnd: shiftEndTime,
              method: 'hardcoded default',
              errorMessage: 'Could not determine shift end time from any source!',
              availableData: {
                hasScheduledShifts: !!scheduleData.scheduledShifts,
                hasWorkingHours: !!scheduleData.workingHours,
                hasShift: !!scheduleData.shift,
                hasSlots: rawScheduleSlots.length > 0,
                scheduleDataStructure: Object.keys(scheduleData)
              }
            });
          }
          
          console.log('[Time] STEP 3 - Applying conflict filtering AND shift boundary validation:', {
            employeeId: empId,
            dateKey,
            rawScheduleSlots: rawScheduleSlots.length,
            employeeBookings: bookingCount,
            shiftEndTime: shiftEndTime,
            serviceDuration: duration,
            bookingTimes: Object.values(employeeBookings).map(b => `${b.startTime}-${b.endTime}`)
          });
          
          // Apply booking conflict detection AND shift boundary validation
          const filteredSlots = rawScheduleSlots.filter(slot => {
            const slotStartTimeRaw = slot.time || slot.startTime;
            const slotEndTimeRaw = slot.endTime || addMinutesToTime(slotStartTimeRaw, duration);

            // Normalize ALL inputs to LOCAL 24-hour HH:mm using shared helper
            const normalizeTime = (timeStr) => {
              if (!timeStr) return null;
              const hhmm = toLocalHHMM(timeStr);
              return hhmm || timeStr; // fall back to original if unparsable
            };

            const normalizedSlotStart = normalizeTime(slotStartTimeRaw);
            const normalizedSlotEnd = normalizeTime(slotEndTimeRaw);
            
            // CRITICAL FIX: Calculate the actual service end time based on service duration
            const actualServiceEndTime = addMinutesToTime(normalizedSlotStart, duration);
            // Convert to minutes for robust numeric comparison
            const slotStartMin = timeToMinutes(normalizedSlotStart);
            const serviceEndMin = timeToMinutes(actualServiceEndTime);
            
            // ENHANCED VALIDATION 1: Check if service duration fits within shift end time
            let exceedsShiftBoundary = false;
            if (shiftEndTime) {
              const normalizedShiftEnd = normalizeTime(shiftEndTime);
              const shiftEndMin = timeToMinutes(normalizedShiftEnd);

              console.log('[Time] DEBUGGING - Shift boundary check for slot (minutes):', {
                slotStartMin,
                serviceEndMin,
                shiftEndMin,
                serviceDuration: `${duration} minutes`,
                wouldExceed: serviceEndMin > shiftEndMin
              });

              // CRITICAL FIX: Compare ACTUAL service end time with shift end time (numeric)
              // Service should COMPLETE before or exactly at shift end
              exceedsShiftBoundary = serviceEndMin > shiftEndMin;
              
              if (exceedsShiftBoundary) {
                console.log('[Time] ❌ SHIFT BOUNDARY VIOLATION - Removing slot:', {
                  slotTime: `${normalizedSlotStart}-${actualServiceEndTime}`,
                  shiftEndTime: normalizedShiftEnd,
                  serviceDuration: `${duration} minutes`,
                  violation: `Service ends at ${actualServiceEndTime}, but shift ends at ${normalizedShiftEnd}`,
                  reason: 'Service would extend beyond employee shift end time',
                  example: 'If shift ends at 08:00 and service needs 1 hour, 07:45 slot would end at 08:45 → REJECTED'
                });
              } else {
                console.log('[Time] ✅ SHIFT BOUNDARY OK - Slot fits within shift:', {
                  slotTime: `${normalizedSlotStart}-${actualServiceEndTime}`,
                  shiftEndTime: normalizedShiftEnd,
                  margin: `Service ends at ${actualServiceEndTime}, shift ends at ${normalizedShiftEnd}`
                });
              }
            } else {
              console.warn('[Time] ⚠️ SHIFT BOUNDARY WARNING - No shift end time available for validation:', {
                slotTime: `${normalizedSlotStart}-${actualServiceEndTime}`,
                serviceDuration: `${duration} minutes`,
                warningMessage: 'Cannot validate shift boundaries - allowing slot (POTENTIALLY UNSAFE!)',
                recommendation: 'Check employee schedule configuration in admin panel',
                possibleCauses: [
                  'scheduledShifts array is empty',
                  'scheduledShifts[0].endTime is missing',
                  'workingHours.endTime is missing',
                  'shift.endTime is missing',
                  'No slots available for fallback estimation'
                ]
              });
              // If no shift end time, allow the slot but log warning
              exceedsShiftBoundary = false;
            }
            
            // ENHANCED VALIDATION 2: Check for conflicts with existing bookings
            const hasBookingConflict = Object.values(employeeBookings).some(booking => {
              const normalizedBookingStart = normalizeTime(booking.startTime);
              const normalizedBookingEnd = normalizeTime(booking.endTime);
              const bookingStartMin = timeToMinutes(normalizedBookingStart);
              const bookingEndMin = timeToMinutes(normalizedBookingEnd);
              
              // ENHANCED DEBUG: Show detailed time comparison for EVERY slot check
              console.log('[Time] 🔍 DETAILED BOOKING CONFLICT CHECK - Slot vs Booking:', {
                slotBeingChecked: {
                  startTime: normalizedSlotStart,
                  endTime: normalizedSlotEnd,
                  actualServiceEndTime: actualServiceEndTime,
                  duration: `${duration} minutes`,
                  rawSlotData: slot
                },
                existingBooking: {
                  startTime: normalizedBookingStart,
                  endTime: normalizedBookingEnd,
                  serviceName: booking.serviceName,
                  bookingId: booking.bookingId,
                  duration: `${booking.duration} minutes`,
                  rawBookingStartTime: booking.startTime,
                  rawBookingEndTime: booking.endTime
                },
                overlapCalculation: {
                  slotStartMin,
                  bookingStartMin,
                  bookingEndMin,
                  serviceEndMin,
                  overlapFormula: 'slot_start_min < booking_end_min AND service_end_min > booking_start_min'
                }
              });
              
              // Enhanced overlap detection (numeric): Two time ranges overlap if:
              // (slot_start_min < booking_end_min) AND (service_end_min > booking_start_min)
              const overlap = (slotStartMin < bookingEndMin && serviceEndMin > bookingStartMin);
              
              if (overlap) {
                console.log('🚫 BOOKING CONFLICT DETECTED - This slot WILL BE REMOVED:', {
                  conflictedSlot: `${normalizedSlotStart}-${actualServiceEndTime}`,
                  conflictsWith: `${normalizedBookingStart}-${normalizedBookingEnd}`,
                  bookingService: booking.serviceName,
                  bookingId: booking.bookingId,
                  overlapType: normalizedSlotStart === normalizedBookingStart ? 'exact-match' : 'partial-overlap',
                  reason: 'Time slot overlaps with existing booking',
                  conflictDetails: {
                    slotStart: normalizedSlotStart,
                    serviceWouldEnd: actualServiceEndTime,
                    bookingStart: normalizedBookingStart,
                    bookingEnd: normalizedBookingEnd,
                    overlapStart: minutesToTime(Math.max(slotStartMin, bookingStartMin)),
                    overlapEnd: minutesToTime(Math.min(serviceEndMin, bookingEndMin))
                  }
                });
              } else {
                console.log('✅ NO CONFLICT - Slot is clear of this booking (minutes):', {
                  slotTime: `${normalizedSlotStart}-${actualServiceEndTime}`,
                  bookingTime: `${normalizedBookingStart}-${normalizedBookingEnd}`,
                  bookingService: booking.serviceName,
                  reason: slotStartMin >= bookingEndMin ? 'Slot starts after booking ends' : 'Service ends before booking starts'
                });
              }
              return overlap;
            });
            
            // FINAL VALIDATION: Log the decision for this slot
            const isValidSlot = !exceedsShiftBoundary && !hasBookingConflict;
            
            if (isValidSlot) {
              console.log('✅ SLOT APPROVED for chosen employee on chosen date:', {
                employeeId: empId,
                date: dateKey,
                approvedSlot: `${normalizedSlotStart}-${actualServiceEndTime}`,
                duration: `${duration} minutes`,
                shiftBoundaryCheck: shiftEndTime ? '✅ Valid' : '⚠️ Unchecked',
                bookingConflictCheck: '✅ No conflicts',
                message: 'This slot will be shown as available to the user',
                slotDisplayTime: normalizedSlotStart
              });
            } else {
              console.log('❌ SLOT REJECTED for chosen employee on chosen date:', {
                employeeId: empId,
                date: dateKey,
                rejectedSlot: `${normalizedSlotStart}-${actualServiceEndTime}`,
                duration: `${duration} minutes`,
                rejectionReasons: {
                  shiftBoundaryViolation: exceedsShiftBoundary,
                  bookingConflict: hasBookingConflict
                },
                message: 'This slot will NOT be shown to the user',
                slotDisplayTime: normalizedSlotStart
              });
            }
            
            // Slot is valid only if it doesn't exceed shift boundary AND has no booking conflicts
            return isValidSlot;
          });
          
          console.log('[Time] STEP 3 - ENHANCED WORKFLOW RESULT after conflict + shift boundary validation:', {
            beforeFilter: rawScheduleSlots.length,
            afterFilter: filteredSlots.length,
            removedConflicts: rawScheduleSlots.length - filteredSlots.length,
            shiftEndTime: shiftEndTime,
            serviceDuration: duration,
            validationTypes: ['booking conflicts', 'shift boundary violations'],
            finalSlots: filteredSlots.slice(0,6).map(s => s.time || s.startTime)
          });

          // 📋 SUMMARY: Show exactly what was filtered out
          console.log('📋 BOOKING CONFLICT FILTERING SUMMARY:', {
            employeeId: empId,
            selectedDate: dateKey,
            originalSlots: rawScheduleSlots.length,
            finalSlots: filteredSlots.length,
            removedSlots: rawScheduleSlots.length - filteredSlots.length,
            bookingConflicts: Object.keys(employeeBookings).length,
            conflictingTimes: Object.values(employeeBookings).map(b => {
              const startTime = b.startTime.includes('T') ? b.startTime.split('T')[1].substring(0, 5) : b.startTime;
              const endTime = b.endTime.includes('T') ? b.endTime.split('T')[1].substring(0, 5) : b.endTime;
              return `${startTime}-${endTime} (${b.serviceName})`;
            }),
            message: filteredSlots.length === 0 ? 
              'NO SLOTS AVAILABLE - All blocked by conflicts or shift boundaries' :
              `${filteredSlots.length} slots available after filtering conflicts`
          });

          // 📋 SUMMARY: Final booking conflict report for chosen employee on chosen date
          console.log('📋 FINAL BOOKING CONFLICT SUMMARY for chosen employee on chosen date:', {
            employeeInfo: {
              id: empId,
              name: assigned?.user ? `${assigned.user.firstName} ${assigned.user.lastName}` : assigned?.name
            },
            dateInfo: {
              selectedDate: dateKey,
              formattedDate: formattedDate
            },
            conflictAnalysis: {
              totalScheduleSlots: rawScheduleSlots.length,
              blockedByBookings: Object.keys(employeeBookings).length,
              blockedTimeSlots: Object.values(employeeBookings).map(b => {
                const normalizeTime = (timeStr) => {
                  if (!timeStr) return 'N/A';
                  if (timeStr.includes('T')) {
                    const date = new Date(timeStr);
                    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                  }
                  return timeStr;
                };
                return `${normalizeTime(b.startTime)}-${normalizeTime(b.endTime)} (${b.serviceName})`;
              }),
              finalAvailableSlots: filteredSlots.length,
              slotsRemoved: rawScheduleSlots.length - filteredSlots.length
            },
            availableSlotsPreview: filteredSlots.slice(0, 10).map(s => {
              const slotTime = s.time || s.startTime;
              const normalizeTime = (timeStr) => {
                if (!timeStr) return 'N/A';
                if (timeStr.includes('T')) {
                  const date = new Date(timeStr);
                  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                }
                return timeStr;
              };
              return normalizeTime(slotTime);
            }),
            message: filteredSlots.length > 0 ? 
              `${filteredSlots.length} time slots are available for booking` : 
              'NO time slots available - all blocked by conflicts or shift boundaries'
          });
          
          // Map to consistent HH:mm objects for downstream logic and UI
          const mapped = filteredSlots.map((slot, i) => {
            const startRaw = slot.time || slot.startTime;
            const endRaw = slot.endTime || addMinutesToTime(startRaw, duration);
            const startHHMM = toLocalHHMM(startRaw) || startRaw;
            const endHHMM = toLocalHHMM(endRaw) || endRaw;
            return {
              id: i,
              time: startHHMM,        // display base
              timeValue: startHHMM,   // calculations base
              startTime: startHHMM,
              endTime: endHHMM,
              available: true
            };
          });
          setAvailableTimeSlots(mapped);
          console.log('[Time] SUCCESS: Using FIXED WORKFLOW filtered time slots for', assigned?.user?.firstName, assigned?.user?.lastName);
        } catch (apiError) {
          console.error('[Time] DETAILED ERROR: getEmployeeSchedule API failed', {
            error: apiError,
            errorMessage: apiError.message,
            employeeId: empId,
            date: formattedDate,
            employeeName: assigned?.user ? `${assigned.user.firstName} ${assigned.user.lastName}` : assigned?.name
          });
          console.warn('[Time] getEmployeeSchedule API failed, falling back to local computation', apiError.message);
          
          // Fallback to local computation with enhanced workSchedule
          const slotsArr = getValidTimeSlotsForProfessional(assigned, selectedDate, duration, appointmentsIndex);
          console.log('[Time] fallback local slots computed count', slotsArr.length, slotsArr.slice(0,6));
          const mapped = slotsArr.map((t, i) => ({ 
            id: i,
            time: toLocalHHMM(t) || t,
            timeValue: toLocalHHMM(t) || t,
            startTime: toLocalHHMM(t) || t,
            endTime: addMinutesToTime(toLocalHHMM(t) || t, duration),
            available: true
          }));
          setAvailableTimeSlots(mapped);
        }
      } catch (err) {
        console.error('[Time] fetchTimeSlots error', err);
        setAvailableTimeSlots([]);
        setError(err.message || 'Failed to compute time slots');
      } finally {
        setLoadingTimeSlots(false);
      }
    };
    fetchTimeSlots();
  }, [selectedService?._id, selectedProfessional?._id, selectedDate.toDateString()]); // Use stable identifiers

  const handleTimeSelect = async (timeSlot) => {
    setSelectedTime(timeSlot);

    // Create proper date-time strings for startTime and endTime
    const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`; // YYYY-MM-DD in local timezone
    // Use timeValue (24-hour format) for calculations, fallback to original fields for backward compatibility
    const startTimeStr = timeSlot.timeValue || timeSlot.startTime || timeSlot.time; // e.g., "09:00" or "2025-09-03T09:00:00.000Z"
    const endTimeStr = timeSlot.endTime;

    // If the time is in ISO format, extract just the time part
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

    // TIMEZONE FIX: Create datetime objects WITHOUT automatic timezone conversion
    // This preserves the selected time as-is in the target timezone
    const [startHour, startMinute] = formattedStartTime.split(':').map(n => parseInt(n));
    const [endHour, endMinute] = formattedEndTime.split(':').map(n => parseInt(n));
    
    // Create date objects for the selected date at the exact time selected
    const startDateTimeLocal = new Date(selectedDate);
    startDateTimeLocal.setHours(startHour, startMinute, 0, 0);
    
    const endDateTimeLocal = new Date(selectedDate);
    endDateTimeLocal.setHours(endHour, endMinute, 0, 0);
    
    console.log('[Time] TIMEZONE FIX v2 - Time slot selection:', {
      selectedDateString: selectedDateStr,
      formattedStartTime,
      formattedEndTime,
      startHour, startMinute,
      endHour, endMinute,
      selectedDateBase: selectedDate.toString(),
      startDateTimeLocal: startDateTimeLocal.toString(),
      endDateTimeLocal: endDateTimeLocal.toString(),
      startDateTimeUTC: startDateTimeLocal.toISOString(),
      endDateTimeUTC: endDateTimeLocal.toISOString(),
      timezoneOffset: startDateTimeLocal.getTimezoneOffset()
    });

    // Get the current professional assignment (should already be set from professional page)
    const flow = bookingFlow.load();
    const currentProfessional = flow.selectedProfessionals?.[selectedService?._id] || selectedProfessional;

    console.log('[Time] Using already assigned professional:', {
      serviceId: selectedService?._id,
      professionalId: currentProfessional?._id,
      professionalName: currentProfessional?.user ? 
        `${currentProfessional.user.firstName} ${currentProfessional.user.lastName}` : 
        currentProfessional?.name
    });

    const timeData = {
      date: selectedDateStr, // Store as YYYY-MM-DD string to avoid timezone shifts
      time: formattedStartTime, // Store simple time format like "09:00"
      startTime: startDateTimeLocal.toISOString(), // Proper UTC conversion from local time
      endTime: endDateTimeLocal.toISOString(), // Proper UTC conversion from local time
      professional: currentProfessional, // Use the already assigned professional
      service: selectedService
    };

    console.log('[Time] handleTimeSelect - storing timeData (FIXED):', timeData);

    // Show loading only in the selected time slot
    setProcessingTimeSlotId(timeSlot.id);

    setTimeout(() => {
      bookingFlow.selectedTimeSlot = timeData;
      bookingFlow.save();
      setProcessingTimeSlotId(null);
    }, 800);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derive display name considering multiple per-service assignments
  const professionalName = (() => {
    const flow = bookingFlow.load();
    const services = flow.selectedServices || [];
    const profMap = flow.selectedProfessionals || {};
    const mode = flow.selectionMode || selectionMode;
    if (mode === 'anyAll') return 'Any professional';
    const unique = new Set();
    services.forEach(s => {
      const p = profMap[s._id];
      if (p) unique.add(p.id || p._id || (p === 'any' ? 'any' : ''));
    });
    if (mode === 'perService' && unique.size > 1) return 'Multiple professionals';
    if (selectedProfessional?.id === 'any') return 'Any professional';
    if (selectedProfessional?.user?.firstName && selectedProfessional?.user?.lastName) {
      return `${selectedProfessional.user.firstName} ${selectedProfessional.user.lastName}`;
    }
    return selectedProfessional?.name || (unique.size > 0 ? 'Professional selected' : 'Select Professional');
  })();

  const from = location.state?.from;

  const handleBackToProfessionals = () => {
    localStorage.removeItem('showPerServiceAssignment');
    if (window.history && window.history.length > 1) navigate(-1);
    else navigate("/professionals");
  };

  // derive assigned professionals list (unique) from bookingFlow
  const assignedProfessionals = (() => {
    const flow = bookingFlow.load();
    const services = flow.selectedServices || [];
    const profMap = flow.selectedProfessionals || {};
    const arr = services.map(s => profMap?.[s._id]).filter(Boolean);
    const uniq = [];
    const seen = new Set();
    arr.forEach(p => {
      const id = p?.id || p?._id || (p?.user?.email) || p?.name || JSON.stringify(p);
      if (!seen.has(id)) {
        seen.add(id);
        uniq.push(p);
      }
    });
    return uniq;
  })();

  const multipleAssigned = assignedProfessionals.length > 1;
  const primaryProfessional = assignedProfessionals[0] || selectedProfessional;

  if (loading) {
    return <FullPageLoader />;
  }

  // If a specific professional is selected and they are explicitly marked
  // not working on the selected date, show a clear message so the user can
  // choose another date or professional.
  const selectedFlow = bookingFlow.load();
  const assignedForService = selectedFlow.selectedProfessionals?.[selectedService?._id];
  const chosenProfessional = assignedForService || selectedProfessional;
  const professionalMarkedNotWorking = chosenProfessional && isEmployeeMarkedNotWorking(chosenProfessional, selectedDate);

  if (professionalMarkedNotWorking) {
    return (
      <div className="time-selector">
        {/* <button className="back-to-professionals" onClick={handleBackToProfessionals} aria-label="Back to Professionals">
          ← Back to professionals
        </button> */}
        <h1 className="header-title">Select time</h1>
        <div className="info-container error-state">
          <p>The selected professional is not working on this date. Please choose another date or select a different professional.</p>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => navigate('/professionals')}>Choose another professional</button>
            <button className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => setSelectedDate(new Date())}>Pick another date</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="time-selector">
      <div className="svc-header" role="banner">
     
        <h1 className="header-title">Select time</h1>
      </div>

      <div className="profile-section">
        <div className="profile-info" onClick={() => setShowPopup(!showPopup)}>
          {(() => {
            const assigned = assignedProfessionals || [];
            const multipleAssignedLocal = assigned.length > 1;
            const primary = assigned[0] || null;

            if (multipleAssignedLocal) {
              return (
                <>
                  <div className="avatar multiple">
                    <div className="avatar-stack" aria-hidden="true">
                      {assigned.slice(0,3).map((p,i) => {
                        const ch = p?.user?.firstName?.charAt(0) || p?.name?.charAt(0) || '?';
                        return <div key={i} className="avatar-small" title={p?.user?.firstName ? `${p.user.firstName} ${p.user.lastName}` : p?.name}>{ch}</div>;
                      })}
                      {assigned.length > 3 && <div className="avatar-more">+{assigned.length - 3}</div>}
                    </div>
                  </div>
                  <div className="multiple-text">Multiple professionals</div>
                </>
              );
            }

            return (
              <>
                <div className="avatar"><span>{(primary?.user?.firstName?.charAt(0) || primary?.name?.charAt(0) || 'S')}</span></div>
                <span className="username">{primary?.user?.firstName ? `${primary.user.firstName} ${primary.user.lastName}` : (primary?.name || 'Select professional')}</span>
              </>
            );
          })()}

          <ChevronLeft className="dropdown-icon" />
        </div>

        <div className="calendar-picker-wrapper">
          <button className="calendar-btn" onClick={() => setCalendarOpen(!calendarOpen)}>
            <Calendar className="calendar-icon" />
          </button>

          {calendarOpen && (
            <div className="calendar-popup">
              <div className="calendar-header">
                <button onClick={() => changeMonth(-1)} className="cal-arrow">
                  <ChevronLeft />
                </button>
                <span>
                  {selectedDate.toLocaleString("default", { month: "long" })} {selectedDate.getFullYear()}
                </span>
                <button onClick={() => changeMonth(1)} className="cal-arrow">
                  <ChevronRight />
                </button>
              </div>
              <div className="calendar-grid">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
                  <div key={i} className="cal-day-name">{d}</div>
                ))}
                {Array(getFirstDayOfMonth(selectedDate.getFullYear(), selectedDate.getMonth()))
                  .fill("")
                  .map((_, i) => <div key={`empty-${i}`} className="cal-empty"></div>)}
                {Array(getDaysInMonth(selectedDate.getFullYear(), selectedDate.getMonth()))
                  .fill(0)
                  .map((_, i) => {
                    const day = i + 1;
                    const isSelected = day === selectedDate.getDate();
                    const thisDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                    thisDate.setHours(0,0,0,0);
                    const isPast = thisDate.getTime() < todayStart.getTime();
                    return (
                      <button
                        type="button"
                        key={day}
                        className={`cal-day ${isSelected ? "cal-day-selected" : ""} ${isPast ? "cal-day-disabled" : ""}`}
                        onClick={() => !isPast && handleDateClick(day)}
                        disabled={isPast}
                      >
                        {day}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPopup && (
        <div className="profile-popup">
          <div className="popup-content" ref={popupRef}>
            <button
              className="popup-close-btn"
              aria-label="Close profile popup"
              onClick={() => setShowPopup(false)}
            >
              ✕
            </button>

            <div className="popup-scroll-view">
              <Professionals onProfessionalSelected={() => {
                // Auto-close popup after 2 seconds when professional is selected
                setTimeout(() => {
                  setShowPopup(false);
                }, 2000);
              }} />
            </div>
          </div>
        </div>
      )}

      <div className="month-navigation">
        <h2 className="month-title">
          {weekStart.toLocaleString("default", { month: "long" })} {weekStart.getFullYear()}
        </h2>
        <div className="nav-buttons">
          <button
            className="nav-btn"
            onClick={() => {
              if (weekOffset === 0) return; // Already at current week
              const nextOffset = weekOffset - 1;
              setWeekOffset(nextOffset);
              const newStart = new Date(todayStart);
              newStart.setDate(newStart.getDate() + nextOffset * 7);
              setSelectedDate(newStart);
            }}
            disabled={weekOffset === 0}
            aria-label="Previous week"
          >
            <ChevronLeft className="nav-icon" />
          </button>
          <button
            className="nav-btn nav-btn-active"
            onClick={() => {
              const nextOffset = weekOffset + 1;
              setWeekOffset(nextOffset);
              const newStart = new Date(todayStart);
              newStart.setDate(newStart.getDate() + nextOffset * 7);
              setSelectedDate(newStart);
            }}
            aria-label="Next week"
          >
            <ChevronRight className="nav-icon" />
          </button>
        </div>
      </div>

      <div className="date-grid">
        {weekDates.map((date, index) => {
          const isPast = date.getTime() < todayStart.getTime();
          const isSelected = selectedDate.toDateString() === date.toDateString();
          const isToday = date.getTime() === todayStart.getTime();
          return (
            <button
              key={index}
              onClick={() => !isPast && handleDateClick(date)}
              className={`date-btn ${isSelected ? "date-btn-selected" : ""} ${isToday ? "date-btn-today" : ""}`}
              disabled={isPast}
            >
              {isToday && <span className="today-indicator">Today</span>}
              <span className="date-number">{date.getDate()}</span>
              <span className="date-weekday">{date.toLocaleString("default", { weekday: 'short' })}</span>
            </button>
          );
        })}
      </div>

      <div className="time-grid-section">
        {loadingTimeSlots ? (
          <div className="info-container loading-state">
            <LoadingDots />
            <p>Loading available time slots...</p>
          </div>
        ) : finalFilteredTimeSlots.length === 0 ? (
          <div className="info-container no-slots">
            <p>Please select another date or professional or another service </p>
          </div>
        ) : (
          <div className="time-slots-grid">
            {finalFilteredTimeSlots.map((timeSlot, index) => (
              <button
                key={index}
                onClick={() => handleTimeSelect(timeSlot)}
                className={`time-slot ${selectedTime?.id === timeSlot.id ? "time-slot-selected" : ""} ${!timeSlot.available ? "time-slot-disabled" : ""}`}
                disabled={!timeSlot.available || processingTimeSlotId !== null}
              >
                {selectedTime?.id === timeSlot.id && processingTimeSlotId === timeSlot.id ? (
                  <div className="loading-dots white"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                ) : (
                  <span className="time-text">{toDisplayTime(timeSlot)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fixed bottom bar for mobile: summary + continue */}
      <div className="bottom-bar time-bottom-bar">
        <div className="bar-summary">
          <span>{bookingFlow.getTotalDuration()} min</span>
          <span>{(bookingFlow.selectedServices?.length || 0)} services</span>
          <span>AED {bookingFlow.getTotalPrice()}</span>
        </div>
        <div className="bar-actions">
          <button
            className="continue-btn"
            disabled={!selectedTime}
            onClick={() => {
              if (!selectedTime) {
                Swal.fire({ title: 'Time Slot Required', text: 'Please select an available time slot.', icon: 'warning', confirmButtonText: 'OK' });
                return;
              }
              navigate('/payment');
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default Time;
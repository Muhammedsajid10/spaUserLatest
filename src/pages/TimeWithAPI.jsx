import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Time.css";
import Professionals from "./ProfessionalsUpdated";
import { employeesAPI, bookingsAPI, apiUtils, bookingFlow, authAPI } from "../services/api";
import {
  // computeSequentialServiceStartTimes,
  getValidTimeSlotsForProfessional,
  // fetchAvailableProfessionalsForServiceByWeek,
  computeSequentialServiceStartTimesWithBookings,
  localDateKey,
  getEmployeeShiftHours,
  addMinutesToTime,
  getAvailableProfessionalsForService,
  formatTimeToAMPM
} from "../bookingUtils";
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

function toMinutes(timeStr) {
  if (!timeStr) return 0;
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    return d.getHours() * 60 + d.getMinutes();
  }
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Enhanced helper functions for time validation
function timeToMinutesFn(timeStr) {
  if (!timeStr) return 0;
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    return d.getHours() * 60 + d.getMinutes();
  }
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function toLocalHHMM(timeStr) {
  if (!timeStr) return null;
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return null;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (err) {
    console.warn('toLocalHHMM conversion failed:', timeStr, err);
    return null;
  }
}

const Time = (props) => {
  // Get start of current week (Sunday)
const getStartOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};
  // Helper function moved to the top for hoisting
  function isToday(date) {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek());
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
  const [processingTimeSlotId, setProcessingTimeSlotId] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Refs
  const popupRef = useRef(null);
  const backupPerServiceRef = useRef(bookingFlow.load().selectedProfessionals || {});
  const isInitialLoad = useRef(true);

  // Router hooks
  const navigate = useNavigate();
  const location = useLocation();

  // Memoized values
  const weekDates = useMemo(() => {
    // Create a copy of selectedDate to avoid mutating the original
    const startDate = new Date(selectedDate);
    startDate.setHours(0, 0, 0, 0);
    
    // Find the start of the week (Sunday)
    const day = startDate.getDay(); // 0 = Sunday
    startDate.setDate(startDate.getDate() - day);
    
    // Generate 7 days starting from the calculated Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }, [selectedDate.toDateString()]);

  // Filter out past time slots for the current day
const filteredTimeSlots = useMemo(() => {
  if (!isToday(selectedDate)) return availableTimeSlots;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const buffer = 15;

  return availableTimeSlots.filter((slot) => {
    const src = slot.timeValue || slot.startTime || slot.time; // prefer 24h HH:MM if available
    const mins = timeToMinutesFn(src); // your helper already handles HH:MM or ISO
    return mins > currentMinutes + buffer;
  });
}, [availableTimeSlots, selectedDate]);

  // Other helper functions

  // Derived values
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
  const from = location.state?.from;

  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isCurrentMonth = (date) => {
    const today = new Date();
    return date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  // Generate calendar days - this function should be defined before the JSX uses it
  const generateWeekDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="cal-day-empty"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isPast = date < today;
      const isSelectedDay = selectedDate.getDate() === day && selectedDate.getMonth() === month;
      const isTodayDay = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

      days.push(
        <button
          key={day}
          onClick={() => !isPast && handleDateClick(day, month, year)}
          className={`cal-day ${isPast ? 'cal-day-past' : ''} ${isSelectedDay ? 'cal-day-selected' : ''} ${isTodayDay ? 'cal-day-today' : ''}`}
          disabled={isPast}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  // Event handlers
  const handleContinue = async () => {
    if (!selectedTime) {
      Swal.fire({
        title: 'Time Slot Required',
        text: 'Please select an available time slot.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
    
    bookingFlow.setSelectedTimeSlot(selectedTime);
    
    // Check if user is already authenticated
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Verify token is valid by checking current user using the API
        const userResponse = await authAPI.getCurrentUser();
        
        if (userResponse.success && userResponse.data?.user) {
          // User is authenticated, skip signup and go to payment
          console.log('User already authenticated, redirecting to payment');
          navigate('/payment');
          return;
        } else {
          // Token is invalid, remove it and proceed to signup
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.log('Token verification failed, proceeding to signup:', error);
        localStorage.removeItem('token');
      }
    }
    
    // No valid token, proceed to signup
    navigate('/signup');
  };

  const changeMonth = (months) => {
    const selectedDate = new Date(selectedDate);
    selectedDate.setMonth(selectedDate.getMonth() + months);
    setSelectedDate(selectedDate);
  };

  const changeWeek = (weeks) => {
    const selectedDate = new Date(selectedDate);
    selectedDate.setDate(selectedDate.getDate() + weeks * 7);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate >= today) {
      setSelectedDate(selectedDate);
    }
  };

  const handleBackToProfessionals = () => {
    localStorage.removeItem('showPerServiceAssignment');
    if (window.history && window.history.length > 1) navigate(-1);
    else navigate("/professionals");
  };

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

  // ENHANCED: Employee-specific booking conflict detection system
  const fetchEmployeeBookingConflicts = async (date, employeeId = null) => {
    const formattedDate = apiUtils.formatDate(date);
    console.log('[Time] ENHANCED: Fetching booking conflicts', {
      formattedDate,
      employeeId: employeeId || 'ALL',
      targetDate: localDateKey(date)
    });

    let allBookings = [];
    try {
      console.log('[Time] ENHANCED: Fetching ALL bookings from admin side with enhanced filtering');

      if (bookingsAPI && typeof bookingsAPI.getTotalBookingsFromAdminSide === 'function') {
        const resp = await bookingsAPI.getTotalBookingsFromAdminSide(formattedDate);
        allBookings = resp?.data?.bookings ?? resp?.bookings ?? resp?.data ?? resp ?? [];
        console.log('[Time] ENHANCED: Raw bookings fetched:', {
          totalCount: allBookings.length,
          requestedDate: formattedDate,
          targetEmployeeId: employeeId || 'ALL_EMPLOYEES'
        });
      } else {
        console.log('[Time] ENHANCED: Admin booking API not available');
        return { appointmentsIndex: {} };
      }
    } catch (err) {
      console.warn('[Time] ENHANCED: Failed to fetch bookings:', err.message);
      return { appointmentsIndex: {} };
    }

    const selectedDateKey = localDateKey(date);

    // Enhanced date filtering with validation
    const dateFilteredBookings = allBookings.filter(booking => {
      if (!booking.appointmentDate) {
        console.debug('[Time] ENHANCED: Skipping booking without appointmentDate:', booking._id);
        return false;
      }

      const bookingDate = new Date(booking.appointmentDate);
      if (isNaN(bookingDate.getTime())) {
        console.debug('[Time] ENHANCED: Skipping booking with invalid date:', booking.appointmentDate);
        return false;
      }

      const bookingDateKey = localDateKey(bookingDate);
      const matches = bookingDateKey === selectedDateKey;

      if (matches) {
        console.debug('[Time] ENHANCED: Date match found:', {
          bookingId: booking._id,
          appointmentDate: booking.appointmentDate,
          bookingDateKey,
          selectedDateKey
        });
      }

      return matches;
    });

    console.log('[Time] ENHANCED STEP 1 - Enhanced date filtering:', {
      selectedDate: selectedDateKey,
      totalBookings: allBookings.length,
      dateFilteredBookings: dateFilteredBookings.length,
      filteredBookings: dateFilteredBookings.map(b => ({
        id: b._id,
        appointmentDate: b.appointmentDate,
        servicesCount: b.services?.length || 0,
        status: b.status
      }))
    });

    // Build comprehensive appointments index
    const appointmentsIndex = {};
    let totalProcessedServices = 0;

    dateFilteredBookings.forEach(booking => {
      if (!booking.services || !Array.isArray(booking.services)) {
        console.debug('[Time] ENHANCED: Skipping booking without services array:', booking._id);
        return;
      }

      booking.services.forEach(service => {
        const serviceEmployeeId = service.employee?._id || service.employee?.id;

        if (!serviceEmployeeId) {
          console.debug('[Time] ENHANCED: Skipping service without employee:', service._id || 'unknown');
          return;
        }

        // If specific employee requested, filter by that employee
        if (employeeId && String(serviceEmployeeId) !== String(employeeId)) {
          return;
        }

        // Validate service times
        if (!service.startTime) {
          console.debug('[Time] ENHANCED: Skipping service without startTime:', {
            serviceId: service._id,
            employeeId: serviceEmployeeId,
            bookingId: booking._id
          });
          return;
        }

        // Calculate end time if not provided
        let endTime = service.endTime;
        if (!endTime && service.duration) {
          const startTimeHHMM = toLocalHHMM(service.startTime);
          if (startTimeHHMM) {
            endTime = addMinutesToTime(startTimeHHMM, service.duration);
          }
        }

        if (!endTime) {
          console.debug('[Time] ENHANCED: Could not determine endTime for service:', {
            serviceId: service._id,
            startTime: service.startTime,
            duration: service.duration
          });
          return;
        }

        // Initialize nested structure
        if (!appointmentsIndex[serviceEmployeeId]) {
          appointmentsIndex[serviceEmployeeId] = {};
        }
        if (!appointmentsIndex[serviceEmployeeId][selectedDateKey]) {
          appointmentsIndex[serviceEmployeeId][selectedDateKey] = {};
        }

        const bookingKey = service._id || `${service.startTime}_${serviceEmployeeId}_${booking._id}`;

        appointmentsIndex[serviceEmployeeId][selectedDateKey][bookingKey] = {
          _id: service._id || bookingKey,
          bookingId: booking._id,
          employeeId: serviceEmployeeId,
          startTime: toLocalHHMM(service.startTime) || service.startTime,
          endTime: toLocalHHMM(endTime) || endTime,
          duration: service.duration || 30,
          status: service.status || booking.status || 'confirmed',
          serviceName: service.service?.name || service.serviceName || 'Unknown Service',
          customerName: booking.customerName || booking.customer?.name || 'Unknown Customer'
        };

        totalProcessedServices++;

        console.debug('[Time] ENHANCED: Service appointment indexed:', {
          employeeId: serviceEmployeeId,
          bookingKey,
          timeSlot: `${appointmentsIndex[serviceEmployeeId][selectedDateKey][bookingKey].startTime}-${appointmentsIndex[serviceEmployeeId][selectedDateKey][bookingKey].endTime}`,
          serviceName: appointmentsIndex[serviceEmployeeId][selectedDateKey][bookingKey].serviceName,
          status: appointmentsIndex[serviceEmployeeId][selectedDateKey][bookingKey].status
        });
      });
    });

    console.log('[Time] ENHANCED STEP 2 - Appointments index built:', {
      selectedDate: selectedDateKey,
      targetEmployeeId: employeeId || 'ALL',
      employeesWithBookings: Object.keys(appointmentsIndex).length,
      totalProcessedServices,
      employeeBookingDetails: Object.keys(appointmentsIndex).map(empId => ({
        employeeId: empId,
        bookingsCount: Object.keys(appointmentsIndex[empId][selectedDateKey] || {}).length,
        bookings: Object.values(appointmentsIndex[empId][selectedDateKey] || {}).map(b => ({
          timeSlot: `${b.startTime}-${b.endTime}`,
          duration: b.duration,
          service: b.serviceName,
          status: b.status,
          customer: b.customerName
        }))
      }))
    });

    return { appointmentsIndex };
  };

   const handleDateClick = async (day, month, year) => {
    console.log('[Time] handleDateClick start (ENHANCED)', { day, month, year, selectedService, selectedProfessional });
    const selectedDate = new Date(year || selectedDate.getFullYear(), month !== undefined ? month : selectedDate.getMonth(), day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      console.log('[Time] Attempted to select past date, ignoring');
      return;
    }
    setSelectedDate(selectedDate);
    setCalendarOpen(false);
    setLoadingTimeSlots(true);
    setAvailableTimeSlots([]);
    setError(null); // Clear any previous errors

    try {
      const flow = bookingFlow.load();
      const services = (flow.selectedServices && flow.selectedServices.length) ? flow.selectedServices : ([selectedService].filter(Boolean));

      // Enhanced booking conflict detection
      const { appointmentsIndex } = await fetchEmployeeBookingConflicts(selectedDate);

      if (!services || services.length <= 1) {
        const svc = services && services[0] || selectedService;
        if (!svc) throw new Error('No service selected');

        const assigned = flow.selectedProfessionals?.[svc._id] || selectedProfessional;

        if (!assigned || assigned.id === 'any' || assigned._id === 'any') {
          console.log('[Time] ENHANCED: single-service ANY -> fetching employees for union slots');
          let employees = [];
          try {
            const resp = await bookingsAPI.getAvailableProfessionals(svc._id, apiUtils.formatDate(selectedDate));
            employees = resp?.data?.professionals ?? resp?.professionals ?? resp?.data ?? resp ?? [];
            // Enhanced active employee filtering
            employees = employees.filter(emp => {
              if (emp.isActive === false) {
                console.log('[Time] ENHANCED: Filtering out inactive employee', emp._id, emp.name);
                return false;
              }
              return true;
            });
            console.log('[Time] ENHANCED: Active employees for ANY selection:', employees.length);
          } catch (err) {
            console.warn('[Time] Failed to fetch professionals for Any selection:', err);
            employees = [];
          }

          const avail = getAvailableProfessionalsForService(
            svc._id,
            selectedDate,
            employees,
            appointmentsIndex,
            flow.selectedServices || [svc]
          );

          const union = [];
          (avail || []).forEach(r => (r.slots || []).forEach(s => union.push(s)));
const uniq = Array.from(new Set(union))
  .sort((a, b) => timeToMinutesFn(a) - timeToMinutesFn(b));
          // Enhanced future time filtering
          const now = new Date();
          const isToday = selectedDate.toDateString() === now.toDateString();
          const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
          const bufferMinutes = 15; // 15-minute buffer for booking

          const futureFilteredUniq = isToday ? uniq.filter(slotTime => {
            const slotMinutes = timeToMinutesFn(slotTime);
            const isValidFutureSlot = slotMinutes > currentTimeMinutes + bufferMinutes;

            console.log('[Time] ENHANCED: ANY professional slot time validation:', {
              slotTime,
              slotMinutes,
              currentTimeMinutes,
              bufferMinutes,
              requiredMinimum: currentTimeMinutes + bufferMinutes,
              isValidFutureSlot,
              action: isValidFutureSlot ? 'KEEP' : 'REMOVE'
            });

            return isValidFutureSlot;
          }) : uniq;

          console.log('[Time] ENHANCED: ANY professional future time filtering result:', {
            isToday,
            currentTimeMinutes: isToday ? currentTimeMinutes : 'N/A',
            bufferMinutes,
            beforeFilter: uniq.length,
            afterFilter: futureFilteredUniq.length,
            removedSlots: uniq.length - futureFilteredUniq.length
          });

          const slots = futureFilteredUniq.map((t, i) => ({
            id: i,
            time: formatTimeToAMPM(t),
            timeValue: t,
            startTime: t,
            endTime: addMinutesToTime(t, svc.duration || 30),
            available: true
          }));

          console.log('[Time] ENHANCED: Final ANY professional slots:', slots.length);
          setAvailableTimeSlots(slots);
          return;
        }

        // Enhanced specific professional slot generation
        const duration = svc.duration || 30;
        const empId = assigned._id || assigned.id;

        console.log('[Time] ENHANCED: Computing slots for specific professional', {
          employeeId: empId,
          employeeName: assigned.name || assigned.user?.firstName,
          date: localDateKey(selectedDate),
          duration,
          isActive: assigned.isActive
        });

        // Check if assigned professional is active
        if (assigned.isActive === false) {
          console.warn('[Time] ENHANCED: Assigned professional is inactive');
          setError('The assigned professional is currently unavailable. Please select a different professional.');
          setAvailableTimeSlots([]);
          return;
        }

        // Get employee-specific appointment conflicts
     const employeeAppointments = {};
if (appointmentsIndex[empId]) {
  employeeAppointments[empId] = {};
  employeeAppointments[empId][localDateKey(selectedDate)] = appointmentsIndex[empId][localDateKey(selectedDate)];
}

        const slotsArr = getValidTimeSlotsForProfessional(assigned, selectedDate, duration, employeeAppointments);

        console.log('[Time] ENHANCED: Slots computed for specific professional', {
          employeeId: empId,
          slotsCount: slotsArr.length,
          firstSlots: slotsArr.slice(0, 5)
        });

        // Enhanced future time filtering for specific professional
        const now = new Date();
        const isToday = selectedDate.toDateString() === now.toDateString();
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
        const bufferMinutes = 15;

        const futureFilteredSlotsArr = isToday ? slotsArr.filter(slotTime => {
          const slotMinutes = timeToMinutesFn(slotTime);
          const isValidFutureSlot = slotMinutes > currentTimeMinutes + bufferMinutes;

          console.log('[Time] ENHANCED: Specific professional slot time validation:', {
            slotTime,
            slotMinutes,
            currentTimeMinutes,
            bufferMinutes,
            requiredMinimum: currentTimeMinutes + bufferMinutes,
            isValidFutureSlot,
            action: isValidFutureSlot ? 'KEEP' : 'REMOVE'
          });

          return isValidFutureSlot;
        }) : slotsArr;

        console.log('[Time] ENHANCED: Specific professional future filtering result:', {
          isToday,
          currentTimeMinutes: isToday ? currentTimeMinutes : 'N/A',
          bufferMinutes,
          beforeFilter: slotsArr.length,
          afterFilter: futureFilteredSlotsArr.length,
          removedSlots: slotsArr.length - futureFilteredSlotsArr.length
        });

        const mapped = futureFilteredSlotsArr.map((t, i) => ({
          id: i,
          time: formatTimeToAMPM(t),
          timeValue: t,
          startTime: t,
          endTime: addMinutesToTime(t, duration),
          available: true
        }));

        console.log('[Time] ENHANCED: Final specific professional slots:', mapped.length);
        setAvailableTimeSlots(mapped);
        return;
      }

      // Enhanced multi-service sequential booking
      const missing = services.filter(s => !flow.selectedProfessionals?.[s._id]);
      if (missing.length) {
        console.log('[Time] ENHANCED: Multi-service missing assigned professionals', missing.map(m => ({ id: m._id, name: m.name })));
        setAvailableTimeSlots([]);
        setError('Please assign professionals to all services first');
        return;
      }

      // Check if all assigned professionals are active
      const inactiveProfessionals = [];
      services.forEach(svc => {
        const prof = flow.selectedProfessionals[svc._id];
        if (prof && prof.isActive === false) {
          inactiveProfessionals.push({ serviceId: svc._id, serviceName: svc.name, professionalName: prof.name });
        }
      });

      if (inactiveProfessionals.length > 0) {
        console.warn('[Time] ENHANCED: Some assigned professionals are inactive', inactiveProfessionals);
        setError('Some assigned professionals are currently unavailable. Please update your professional selections.');
        setAvailableTimeSlots([]);
        return;
      }

      const professionalsMap = {};
      services.forEach(svc => {
        professionalsMap[svc._id] = flow.selectedProfessionals[svc._id];
      });

      console.log('[Time] ENHANCED: Computing sequential service start times with enhanced validation', {
        services: services.map(s => ({ id: s._id, name: s.name, duration: s.duration })),
        date: localDateKey(selectedDate),
        professionals: Object.keys(professionalsMap)
      });

      const sequences = await computeSequentialServiceStartTimesWithBookings(services, professionalsMap, selectedDate, appointmentsIndex);

      console.log('[Time] ENHANCED: Sequential sequences result', {
        sequencesFound: sequences?.length || 0,
        firstSequenceExample: sequences?.[0] ? {
          startTime: sequences[0].startTime,
          endTime: sequences[0].endTime,
          servicesCount: sequences[0].sequence?.length
        } : null
      });

      if (!sequences || sequences.length === 0) {
        setAvailableTimeSlots([]);
        setError('No available time slots found for the selected date and professional assignments. Please try a different date or adjust professional assignments.');
        return;
      }

      const slots = sequences.map((s, idx) => ({
        id: idx,
        time: formatTimeToAMPM(s.startTime),
        timeValue: s.startTime,
        startTime: s.startTime,
        endTime: s.endTime || s.sequence[s.sequence.length - 1].endTime,
        available: true,
        sequence: s.sequence
      }));

      console.log('[Time] ENHANCED: Final sequential slots created:', slots.length);
      setAvailableTimeSlots(slots);

    } catch (err) {
      console.error('[Time] ENHANCED: handleDateClick error', err);
      setError(err.message || 'Failed to load available time slots. Please try again.');
      setAvailableTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const handleTimeSelect = async (timeSlot) => {
    console.log('[Time] handleTimeSelect called with timeSlot:', timeSlot);
    console.log('[Time] timeSlot properties:', {
      id: timeSlot.id,
      time: timeSlot.time,
      timeValue: timeSlot.timeValue,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      fullObject: timeSlot
    });

    setSelectedTime(timeSlot);

    const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const startTimeStr = timeSlot.timeValue || timeSlot.startTime || timeSlot.time;
    const endTimeStr = timeSlot.endTime;

    const formatTime = (timeStr) => {
      if (!timeStr) return '00:00'; // Default fallback
      if (timeStr.includes('T')) {
        return timeStr.split('T')[1].substring(0, 5);
      }
      return timeStr;
    };

    const formattedStartTime = formatTime(startTimeStr);
    let formattedEndTime = formatTime(endTimeStr);

    // If no end time provided, calculate it from start time + service duration
    if (!endTimeStr || !formattedEndTime || formattedEndTime === '00:00') {
      const serviceDuration = selectedService?.duration || 60; // Default 60 minutes
      const [startH, startM] = formattedStartTime.split(':').map(n => parseInt(n));
      const endMinutes = startM + serviceDuration;
      const endH = startH + Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      formattedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      console.log('[Time] Calculated end time from duration:', {
        serviceDuration,
        startTime: formattedStartTime,
        calculatedEndTime: formattedEndTime
      });
    }

    console.log('[Time] Time formatting results:', {
      startTimeStr,
      endTimeStr,
      formattedStartTime,
      formattedEndTime
    });

    // Validate time format before parsing
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formattedStartTime)) {
      console.error('[Time] INVALID TIME FORMAT: formattedStartTime is not in HH:MM format!', {
        formattedStartTime,
        startTimeStr,
        timeSlot
      });
    }
    if (!timeRegex.test(formattedEndTime)) {
      console.error('[Time] INVALID TIME FORMAT: formattedEndTime is not in HH:MM format!', {
        formattedEndTime,
        endTimeStr,
        timeSlot
      });
    }

    const [startHour, startMinute] = formattedStartTime.split(':').map(n => parseInt(n));
    const [endHour, endMinute] = formattedEndTime.split(':').map(n => parseInt(n));

    console.log('[Time] Parsed time values:', {
      formattedStartTime,
      formattedEndTime,
      startHour,
      startMinute,
      endHour,
      endMinute,
      startHourValid: !isNaN(startHour),
      startMinuteValid: !isNaN(startMinute),
      endHourValid: !isNaN(endHour),
      endMinuteValid: !isNaN(endMinute)
    });

    const startDateTimeLocal = new Date(selectedDate);
    startDateTimeLocal.setHours(startHour, startMinute, 0, 0);

    const endDateTimeLocal = new Date(selectedDate);
    endDateTimeLocal.setHours(endHour, endMinute, 0, 0);

    // Check for invalid Date objects
    if (isNaN(startDateTimeLocal.getTime())) {
      console.error('[Time] INVALID TIME VALUE: startDateTimeLocal is invalid!', {
        selectedDate: selectedDate.toString(),
        startHour,
        startMinute,
        formattedStartTime,
        startDateTimeLocal: startDateTimeLocal.toString()
      });
    }

    if (isNaN(endDateTimeLocal.getTime())) {
      console.error('[Time] INVALID TIME VALUE: endDateTimeLocal is invalid!', {
        selectedDate: selectedDate.toString(),
        endHour,
        endMinute,
        formattedEndTime,
        endDateTimeLocal: endDateTimeLocal.toString()
      });
    }

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
      date: selectedDateStr,
      time: formattedStartTime,
      startTime: startDateTimeLocal.toISOString(),
      endTime: endDateTimeLocal.toISOString(),
      // Store local time components to avoid timezone issues
      localStartTime: {
        year: startDateTimeLocal.getFullYear(),
        month: startDateTimeLocal.getMonth(),
        date: startDateTimeLocal.getDate(),
        hours: startDateTimeLocal.getHours(),
        minutes: startDateTimeLocal.getMinutes(),
        seconds: startDateTimeLocal.getSeconds()
      },
      localEndTime: {
        year: endDateTimeLocal.getFullYear(),
        month: endDateTimeLocal.getMonth(),
        date: endDateTimeLocal.getDate(),
        hours: endDateTimeLocal.getHours(),
        minutes: endDateTimeLocal.getMinutes(),
        seconds: endDateTimeLocal.getSeconds()
      },
      professional: currentProfessional,
      service: selectedService
    };

    console.log('[Time] handleTimeSelect - storing timeData (FIXED):', timeData);
    console.log('[Time] handleTimeSelect - bookingFlow before save:', bookingFlow.selectedTimeSlot);
    console.log('[Time] handleTimeSelect - isMobile:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

    setProcessingTimeSlotId(timeSlot.id);

    setTimeout(() => {
      console.log('[Time] handleTimeSelect - setTimeout executing, saving to bookingFlow...');
      bookingFlow.selectedTimeSlot = timeData;
      bookingFlow.selectedDate = selectedDateStr; // Also store the selected date separately
      
      const saveResult = bookingFlow.save();
      console.log('[Time] handleTimeSelect - save result:', saveResult);
      
      console.log('[Time] handleTimeSelect - bookingFlow after save:', bookingFlow.selectedTimeSlot);
      console.log('[Time] handleTimeSelect - localStorage check:', localStorage.getItem('bookingFlow'));
      console.log('[Time] handleTimeSelect - localStorage length:', localStorage.getItem('bookingFlow')?.length);
      
      if (!saveResult) {
        console.error('[Time] handleTimeSelect - FAILED to save bookingFlow data!');
      }
      
      setProcessingTimeSlotId(null);
    }, 800);
  };

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

    if (isInitialLoad.current) {
      setLoading(true);
      loadBookingData();
      setTimeout(() => {
        setLoading(false);
        isInitialLoad.current = false;
      }, 500);
    }

    const handleBookingFlowChange = (event) => {
      const data = bookingFlow.load();
      const currentSelectedService = selectedService?._id;
      const currentSelectedProfessional = selectedProfessional?._id || selectedProfessional?.id;
      const newSelectedService = data.selectedServices?.[0]?._id;
      const newSelectedProfessional = data.selectedProfessionals?.[data.selectedServices?.[0]?._id]?._id ||
        data.selectedProfessionals?.[data.selectedServices?.[0]?._id]?.id;

      if (currentSelectedService !== newSelectedService || currentSelectedProfessional !== newSelectedProfessional) {
        loadBookingData();
      }
    };

    window.addEventListener('bookingFlowChange', handleBookingFlowChange);

    return () => {
      window.removeEventListener('bookingFlowChange', handleBookingFlowChange);
    };
  }, []);

  useEffect(() => {
    const loadTimeSlots = async () => {
      const day = selectedDate.getDate();
      const month = selectedDate.getMonth();
      const year = selectedDate.getFullYear();
      await handleDateClick(day, month, year);
    };
    loadTimeSlots();
  }, [selectedService?._id, selectedProfessional?._id, selectedDate.toDateString()]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // NOW we can safely have the conditional return after ALL hooks are declared
  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <div className="time-selector">
      <h1 className="header-title">Select time</h1>

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
                      {assigned.slice(0, 3).map((p, i) => {
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
          <button
            className="calendar-btn"
            onClick={() => setCalendarOpen(!calendarOpen)}
            aria-label="Open calendar"
          >
            <Calendar className="calendar-icon" />
          </button>

          {calendarOpen && (
            <div className="calendar-popup">
              <div className="calendar-header">
                <button
                  onClick={() => changeMonth(-1)}
                  className="cal-arrow"
                  disabled={isCurrentMonth(selectedDate)}
                  aria-label="Previous month"
                >
                  <ChevronLeft className={isCurrentMonth(selectedDate) ? 'cal-arrow-disabled' : ''} />
                </button>
                <span className="calendar-month-title">
                  {selectedDate.toLocaleString("default", { month: "long" })} {selectedDate.getFullYear()}
                </span>
                <button
                  onClick={() => changeMonth(1)}
                  className="cal-arrow"
                  aria-label="Next month"
                >
                  <ChevronRight />
                </button>
              </div>
              <div className="calendar-grid">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
                  <div key={i} className="cal-day-name">{d}</div>
                ))}
                {generateWeekDays()}
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
          {selectedDate.toLocaleString("default", { month: "long" })} {selectedDate.getFullYear()}
        </h2>
        <div className="nav-buttons">
          <button
            className={`nav-btn ${isPastDate(selectedDate) ? 'nav-btn-disabled' : ''}`}
            onClick={() => {
              const selectedDate = new Date(selectedDate);
              selectedDate.setDate(selectedDate.getDate() - 7);
              if (!isPastDate(selectedDate)) {
                setSelectedDate(selectedDate);
              }
            }}
            aria-label="Previous week"
            disabled={isPastDate(selectedDate)}
          >
            <ChevronLeft className="nav-icon" />
          </button>
          <button
            className="nav-btn nav-btn-active"
            onClick={() => {
              const selectedDate = new Date(selectedDate);
              selectedDate.setDate(selectedDate.getDate() + 7);
              setSelectedDate(selectedDate);
            }}
            aria-label="Next week"
          >
            <ChevronRight className="nav-icon" />
          </button>
        </div>
      </div>

      <div className="date-grid">
        {weekDates.length > 0 ? (
          weekDates.map((date, index) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = selectedDate.toDateString() === date.toDateString();

            return (
              <button
                key={index}
                onClick={() => handleDateClick(date.getDate(), date.getMonth(), date.getFullYear())}
                className={`date-btn 
                  ${isSelected ? "date-btn-selected" : ""} 
                  ${isToday ? "date-btn-today" : ""}`}
                aria-current={isToday ? "date" : undefined}
              >
                <span className="date-number">
                  {date.getDate()}
                  {isToday && <span className="today-indicator">•</span>}
                </span>
                <span className="date-weekday">
                  {isToday ? 'Today' : date.toLocaleString("default", { weekday: 'short' })}
                </span>
              </button>
            );
          })
        ) : (
          <button
            className="date-btn date-btn-selected"
            aria-current="date"
          >
            <span className="date-number">
              {new Date().getDate()}
              <span className="today-indicator">•</span>
            </span>
            <span className="date-weekday">Today</span>
          </button>
        )}
      </div>

      <div className="time-grid-section">
        {loadingTimeSlots ? (
          <div className="info-container loading-state">
            <LoadingDots />
            <p>Loading available time slots...</p>
          </div>
        ) : error ? (
          <div className="info-container error-state">
            <p>{error}</p>
          </div>
        ) : filteredTimeSlots.length === 0 && !initialLoad ? (
          <div className="info-container no-slots">
            <p>No available time slots found for this date. Please try another date.</p>
          </div>
        ) : (
          <div className="time-slots-grid">
            {filteredTimeSlots.map((timeSlot, index) => (
              <button
                key={index}
                onClick={() => handleTimeSelect(timeSlot)}
                className={`time-slot ${selectedTime?.id === timeSlot.id ? "time-slot-selected" : ""}`}
                disabled={processingTimeSlotId !== null}
              >
                {selectedTime?.id === timeSlot.id && processingTimeSlotId === timeSlot.id ? (
                  <div className="loading-dots white">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                ) : (
                  <span className="time-text">{timeSlot.time}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="unified-bottom-bar">
        <div className="unified-bottom-bar__summary">
          <span className="unified-bottom-bar__primary-info">AED {bookingFlow.getTotalPrice()}</span>
          <span className="unified-bottom-bar__secondary-info">
            {bookingFlow.selectedServices?.length || 0} service{bookingFlow.selectedServices?.length !== 1 ? 's' : ''} • {bookingFlow.getTotalDuration()} min
          </span>
        </div>

        <button
          className="unified-bottom-bar__button"
          disabled={!selectedTime}
          onClick={handleContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default Time;
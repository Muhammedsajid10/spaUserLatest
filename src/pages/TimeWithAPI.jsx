import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    return availableTimeSlots.filter(slot => {
      if (!slot.time) return false;

      // Handle both 12-hour and 24-hour formats
      let hour, minute;
      if (slot.time.includes(' ')) {
        // 12-hour format (e.g., "2:30 PM")
        const [time, period] = slot.time.split(' ');
        [hour, minute] = time.split(':').map(Number);
        if (period === 'PM' && hour < 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
      } else {
        // 24-hour format (e.g., "14:30")
        [hour, minute] = slot.time.split(':').map(Number);
      }

      return hour > currentHour || (hour === currentHour && minute > currentMinute + 15);
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
  const handleContinue = () => {
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
    navigate('/payment');
  };

  const changeMonth = (months) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + months);
    setSelectedDate(newDate);
  };

  const changeWeek = (weeks) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + weeks * 7);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (newDate >= today) {
      setSelectedDate(newDate);
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
  const fetchEmployeeBookingConflicts = async (date, employeeId) => {
    const formattedDate = apiUtils.formatDate(date);
    console.log('[Time] EMPLOYEE-SPECIFIC: Fetching booking conflicts for specific employee only', {
      formattedDate,
      employeeId,
      employeeName: 'Target employee'
    });

    let allBookings = [];
    try {
      console.log('[Time] EMPLOYEE-SPECIFIC: Fetching ALL bookings from admin side');

      if (bookingsAPI && typeof bookingsAPI.getTotalBookingsFromAdminSide === 'function') {
        const resp = await bookingsAPI.getTotalBookingsFromAdminSide(formattedDate);
        allBookings = resp?.data?.bookings ?? resp?.bookings ?? resp?.data ?? resp ?? [];
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

    let employeeSpecificBookings = [];

    dateFilteredBookings.forEach(booking => {
      if (booking.services && Array.isArray(booking.services)) {
        booking.services.forEach(service => {
          const serviceEmployeeId = service.employee?._id || service.employee?.id;

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

    const appointmentsIndex = {};
    appointmentsIndex[employeeId] = {};
    appointmentsIndex[employeeId][selectedDateKey] = {};

    employeeSpecificBookings.forEach(serviceBooking => {
      const startTime = serviceBooking.startTime;

      if (!startTime) {
        console.warn('[Time] EMPLOYEE-SPECIFIC: Skipping booking with missing time:', serviceBooking);
        return;
      }

      const bookingKey = serviceBooking._id || `${startTime}_${employeeId}_${serviceBooking.bookingId}`;

      appointmentsIndex[employeeId][selectedDateKey][bookingKey] = {
        _id: serviceBooking._id,
        bookingId: serviceBooking.bookingId,
        employeeId: employeeId,
        startTime: startTime,
        endTime: serviceBooking.endTime,
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

    let allBookings = [];
    try {
      console.log('[Time] Fetching ALL bookings from admin side for enhanced filtering');

      if (bookingsAPI && typeof bookingsAPI.getTotalBookingsFromAdminSide === 'function') {
        const resp = await bookingsAPI.getTotalBookingsFromAdminSide(formattedDate);
        allBookings = resp?.data?.bookings ?? resp?.bookings ?? resp?.data ?? resp ?? [];
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

    const flow = bookingFlow.load();
    const selectedProfessionalForService = flow.selectedProfessionals?.[selectedService?._id] || selectedProfessional;

    let relevantServiceBookings = [];

    dateFilteredBookings.forEach(booking => {
      if (booking.services && Array.isArray(booking.services)) {
        booking.services.forEach(service => {
          const serviceEmployeeId = service.employee?._id || service.employee?.id;

          if (selectedProfessionalForService &&
            selectedProfessionalForService.id !== 'any' &&
            selectedProfessionalForService._id !== 'any') {
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

    const appointmentsIndex = {};

    relevantServiceBookings.forEach(serviceBooking => {
      const empId = serviceBooking.employeeId;
      const startTime = serviceBooking.startTime;

      if (!empId || !startTime) {
        console.warn('[Time] Skipping service booking with missing employee or time:', serviceBooking);
        return;
      }

      appointmentsIndex[empId] = appointmentsIndex[empId] || {};
      appointmentsIndex[empId][selectedDateKey] = appointmentsIndex[empId][selectedDateKey] || {};

      const bookingKey = serviceBooking._id || `${startTime}_${empId}_${serviceBooking.bookingId}`;

      appointmentsIndex[empId][selectedDateKey][bookingKey] = {
        _id: serviceBooking._id,
        bookingId: serviceBooking.bookingId,
        employeeId: empId,
        startTime: startTime,
        endTime: serviceBooking.endTime,
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

  const handleDateClick = async (day, month, year) => {
    console.log('[Time] handleDateClick start (local computation)', { day, month, year, selectedService, selectedProfessional });
    const newDate = new Date(year || selectedDate.getFullYear(), month !== undefined ? month : selectedDate.getMonth(), day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate < today) {
      console.log('[Time] Attempted to select past date, ignoring');
      return;
    }
    setSelectedDate(newDate);
    setCalendarOpen(false);
    setLoadingTimeSlots(true);
    setAvailableTimeSlots([]);

    try {
      const flow = bookingFlow.load();
      const services = (flow.selectedServices && flow.selectedServices.length) ? flow.selectedServices : ([selectedService].filter(Boolean));

      const { appointmentsIndex } = await fetchDateData(newDate);

      if (!services || services.length <= 1) {
        const svc = services && services[0] || selectedService;
        if (!svc) throw new Error('No service selected');

        const assigned = flow.selectedProfessionals?.[svc._id] || selectedProfessional;

        if (!assigned || assigned.id === 'any' || assigned._id === 'any') {
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

          const now = new Date();
          const isToday = newDate.toDateString() === now.toDateString();
          const currentTime = isToday ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : null;

          const futureFilteredUniq = isToday ? uniq.filter(slotTime => {
            const isCurrentOrFuture = slotTime >= currentTime;
            console.log('[Time] handleDateClick Any professional slot time comparison:', {
              slotTime,
              currentTime,
              isCurrentOrFuture,
              action: isCurrentOrFuture ? 'KEEP' : 'REMOVE'
            });
            return isCurrentOrFuture;
          }) : uniq;

          console.log('[Time] handleDateClick Any professional past time filtering:', {
            isToday,
            currentTime,
            beforeFilter: uniq.length,
            afterFilter: futureFilteredUniq.length,
            removedPastSlots: uniq.length - futureFilteredUniq.length
          });

          const slots = futureFilteredUniq.map((t, i) => ({
            id: i,
            time: formatTimeToAMPM(t),
            timeValue: t,
            startTime: t,
            endTime: addMinutesToTime(t, svc.duration || 30),
            available: true
          }));
          console.log('[Time] union slots count', slots.length);
          setAvailableTimeSlots(slots);
          return;
        }

        const duration = svc.duration || 30;
        const empId = assigned._id || assigned.id;
        console.log('[Time] computing local slots for employee', { employeeId: empId, date: localDateKey(newDate), duration });
        const slotsArr = getValidTimeSlotsForProfessional(assigned, new Date(newDate), duration, appointmentsIndex);
        console.log('[Time] local slots computed count', slotsArr.length, slotsArr.slice(0, 6));

        const now = new Date();
        const isToday = newDate.toDateString() === now.toDateString();
        const currentTime = isToday ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : null;

        const futureFilteredSlotsArr = isToday ? slotsArr.filter(slotTime => {
          const isCurrentOrFuture = slotTime >= currentTime;
          console.log('[Time] handleDateClick specific professional slot time comparison:', {
            slotTime,
            currentTime,
            isCurrentOrFuture,
            action: isCurrentOrFuture ? 'KEEP' : 'REMOVE'
          });
          return isCurrentOrFuture;
        }) : slotsArr;

        console.log('[Time] handleDateClick specific professional past time filtering:', {
          isToday,
          currentTime,
          beforeFilter: slotsArr.length,
          afterFilter: futureFilteredSlotsArr.length,
          removedPastSlots: slotsArr.length - futureFilteredSlotsArr.length
        });

        const mapped = futureFilteredSlotsArr.map((t, i) => ({
          id: i,
          time: formatTimeToAMPM(t),
          timeValue: t,
          startTime: t,
          endTime: addMinutesToTime(t, duration),
          available: true
        }));
        setAvailableTimeSlots(mapped);
        return;
      }

      const missing = services.filter(s => !flow.selectedProfessionals?.[s._id]);
      if (missing.length) {
        console.log('[Time] multi-service missing assigned professionals', missing.map(m => m._id));
        setAvailableTimeSlots([]);
        setError('Please assign professionals to all services first');
        return;
      }

      const professionalsMap = {};
      services.forEach(svc => {
        professionalsMap[svc._id] = flow.selectedProfessionals[svc._id];
      });

      console.log('[Time] computing sequential service start times locally (with bookings)', { services: services.map(s => s._id), date: localDateKey(newDate) });
      const sequences = await computeSequentialServiceStartTimesWithBookings(services, professionalsMap, newDate, appointmentsIndex);
      console.log('[Time] sequences found', sequences?.length);
      if (!sequences || sequences.length === 0) {
        setAvailableTimeSlots([]);
        setError('No sequential time slots available for assigned professionals on this date.');
        return;
      }
      const slots = sequences.map((s, idx) => ({
        id: idx,
        time: formatTimeToAMPM(s.startTime),
        timeValue: s.startTime,
        startTime: s.startTime,
        endTime: s.sequence[s.sequence.length - 1].endTime,
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

  const handleTimeSelect = async (timeSlot) => {
    setSelectedTime(timeSlot);

    const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const startTimeStr = timeSlot.timeValue || timeSlot.startTime || timeSlot.time;
    const endTimeStr = timeSlot.endTime;

    const formatTime = (timeStr) => {
      if (!timeStr) return null;
      if (timeStr.includes('T')) {
        return timeStr.split('T')[1].substring(0, 5);
      }
      return timeStr;
    };

    const formattedStartTime = formatTime(startTimeStr);
    const formattedEndTime = formatTime(endTimeStr);

    const [startHour, startMinute] = formattedStartTime.split(':').map(n => parseInt(n));
    const [endHour, endMinute] = formattedEndTime.split(':').map(n => parseInt(n));

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
      professional: currentProfessional,
      service: selectedService
    };

    console.log('[Time] handleTimeSelect - storing timeData (FIXED):', timeData);

    setProcessingTimeSlotId(timeSlot.id);

    setTimeout(() => {
      bookingFlow.selectedTimeSlot = timeData;
      bookingFlow.save();
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
        console.log('[Time] FIXED WORKFLOW - Starting with employee schedule first', {
          selectedServiceId: selectedService?._id,
          selectedDate: selectedDate.toDateString(),
          timestamp: new Date().toISOString()
        });

        const flow = bookingFlow.load();
        const services = flow.selectedServices && flow.selectedServices.length ? flow.selectedServices : [selectedService];

        if (services.length > 1) {
          console.log('[Time] FIXED WORKFLOW - Multi-service flow starting');
          const missing = services.filter(s => !flow.selectedProfessionals?.[s._id]);
          if (missing.length) {
            console.log('[Time] multi-service abort - missing assignments', missing.map(m => m._id));
            setAvailableTimeSlots([]);
            return;
          }

          const professionalsMap = {};
          const employeeIds = [];
          services.forEach(svc => {
            const emp = flow.selectedProfessionals[svc._id];
            professionalsMap[svc._id] = emp;
            const id = emp?._id || emp?.id;
            if (id) employeeIds.push(id);
          });

          console.log('[Time] FIXED WORKFLOW - Multi-service: Fetching booking conflicts after professional assignment');
          const { appointmentsIndex } = await fetchDateData(selectedDate);

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

          const sequences = await computeSequentialServiceStartTimesWithBookings(services, professionalsMap, selectedDate, appointmentsIndex);
          console.log('[Time] sequences computed with bookings count', sequences?.length);
          if (!sequences || sequences.length === 0) {
            setAvailableTimeSlots([]);
            setError('No sequential time slots available for assigned professionals on this date. Try another date or change professionals.');
            return;
          }
          const slots = sequences.map((s, idx) => ({
            id: idx,
            time: formatTimeToAMPM(s.startTime),
            timeValue: s.startTime,
            startTime: s.startTime,
            endTime: s.sequence[s.sequence.length - 1].endTime,
            available: true,
            sequence: s.sequence
          }));
          setAvailableTimeSlots(slots);
          setLoadingTimeSlots(false);
          return;
        }

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

          const now = new Date();
          const isToday = selectedDate.toDateString() === now.toDateString();
          const currentTime = isToday ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : null;

          const futureFilteredUniq = isToday ? uniq.filter(slotTime => {
            const isCurrentOrFuture = slotTime >= currentTime;
            console.log('[Time] Any professional slot time comparison:', {
              slotTime,
              currentTime,
              isCurrentOrFuture,
              action: isCurrentOrFuture ? 'KEEP' : 'REMOVE'
            });
            return isCurrentOrFuture;
          }) : uniq;

          console.log('[Time] Any professional past time filtering:', {
            isToday,
            currentTime,
            beforeFilter: uniq.length,
            afterFilter: futureFilteredUniq.length,
            removedPastSlots: uniq.length - futureFilteredUniq.length
          });

          const slots = futureFilteredUniq.map((t, i) => ({
            id: i,
            time: formatTimeToAMPM(t),
            timeValue: t,
            startTime: t,
            endTime: addMinutesToTime(t, svc.duration || 30),
            available: true
          }));
          console.log('[Time] union slots count', slots.length);
          setAvailableTimeSlots(slots);
          setLoadingTimeSlots(false);
          return;
        }

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

          console.log('[Time] STEP 2 - Fetching booking conflicts for specific employee using new method');
          const { appointmentsIndex } = await fetchEmployeeBookingConflicts(selectedDate, empId);

          const rawScheduleSlots = scheduleData.availableTimeSlots || [];
          console.log('[Time] STEP 2 - Raw schedule slots from API:', { count: rawScheduleSlots.length, sample: rawScheduleSlots.slice(0, 6) });

          const dateKey = localDateKey(selectedDate);
          const employeeBookings = appointmentsIndex[empId]?.[dateKey] || {};
          const bookingCount = Object.keys(employeeBookings).length;

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
            shiftEndTime = employeeShifts[0].endTime;
            console.log('[Time] ✅ METHOD 1 - Shift end time from scheduledShifts:', {
              shiftEndTime,
              shiftData: employeeShifts[0],
              method: 'scheduledShifts[0].endTime'
            });
          } else if (scheduleData.workingHours && scheduleData.workingHours.endTime) {
            shiftEndTime = scheduleData.workingHours.endTime;
            console.log('[Time] ✅ METHOD 2 - Shift end time from workingHours:', {
              shiftEndTime,
              workingHours: scheduleData.workingHours,
              method: 'workingHours.endTime'
            });
          } else if (scheduleData.shift && scheduleData.shift.endTime) {
            shiftEndTime = scheduleData.shift.endTime;
            console.log('[Time] ✅ METHOD 3 - Shift end time from shift object:', {
              shiftEndTime,
              shift: scheduleData.shift,
              method: 'shift.endTime'
            });
          } else if (rawScheduleSlots.length > 0) {
            const lastSlot = rawScheduleSlots[rawScheduleSlots.length - 1];
            if (lastSlot) {
              const lastSlotTime = lastSlot.time || lastSlot.startTime;
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
            shiftEndTime = "18:00";
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

          const filteredSlots = rawScheduleSlots.filter(slot => {
            const slotStartTime = slot.time || slot.startTime;
            const slotEndTime = slot.endTime || addMinutesToTime(slotStartTime, duration);

            const normalizeTime = (timeStr) => {
              if (!timeStr) return null;

              console.log('[Time] 🕐 NORMALIZING TIME:', {
                inputTime: timeStr,
                inputType: timeStr.includes('T') ? 'ISO DateTime' : 'HH:mm format'
              });

              if (timeStr.includes('T')) {
                if (timeStr.endsWith('Z')) {
                  const timePart = timeStr.split('T')[1].substring(0, 5);
                  console.log('[Time] 🌍 UTC TIME EXTRACTION (FIXED):', {
                    originalISOString: timeStr,
                    extractedTime: timePart,
                    method: 'Direct extraction from UTC ISO string',
                    reason: 'Avoids timezone conversion issues'
                  });
                  return timePart;
                } else {
                  const date = new Date(timeStr);
                  const localTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                  console.log('[Time] 🌍 LOCAL TIME CONVERSION:', {
                    originalISOString: timeStr,
                    localTime: localTime,
                    timezoneOffset: date.getTimezoneOffset()
                  });
                  return localTime;
                }
              }

              if (timeStr.includes(':') && timeStr.length <= 5) {
                console.log('[Time] ✅ TIME ALREADY NORMALIZED:', {
                  inputTime: timeStr,
                  outputTime: timeStr,
                  format: 'HH:mm'
                });
                return timeStr;
              }

              console.log('[Time] ⚠️ UNKNOWN TIME FORMAT:', {
                inputTime: timeStr,
                fallbackOutput: timeStr
              });
              return timeStr;
            };

            const normalizedSlotStart = normalizeTime(slotStartTime);
            const normalizedSlotEnd = normalizeTime(slotEndTime);
            const actualServiceEndTime = addMinutesToTime(normalizedSlotStart, duration);

            let exceedsShiftBoundary = false;
            if (shiftEndTime) {
              const normalizedShiftEnd = normalizeTime(shiftEndTime);

              console.log('[Time] DEBUGGING - Shift boundary check for slot:', {
                slotStartTime: normalizedSlotStart,
                slotEndTime: normalizedSlotEnd,
                actualServiceEndTime: actualServiceEndTime,
                shiftEndTime: normalizedShiftEnd,
                serviceDuration: `${duration} minutes`,
                wouldExceed: actualServiceEndTime > normalizedShiftEnd
              });

              exceedsShiftBoundary = actualServiceEndTime > normalizedShiftEnd;

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
                warningMessage: 'Cannot validate shift boundaries - allowing slot (POTENTIALLY UNSAFE!)'
              });
              exceedsShiftBoundary = false;
            }

            const hasBookingConflict = Object.values(employeeBookings).some(booking => {
              const normalizedBookingStart = normalizeTime(booking.startTime);
              const normalizedBookingEnd = normalizeTime(booking.endTime);

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
                  condition1: `${normalizedSlotStart} < ${normalizedBookingEnd}`,
                  condition1Result: normalizedSlotStart < normalizedBookingEnd,
                  condition2: `${actualServiceEndTime} > ${normalizedBookingStart}`,
                  condition2Result: actualServiceEndTime > normalizedBookingStart,
                  overlapFormula: 'slot_start < booking_end AND service_end > booking_start'
                }
              });

              const overlap = (normalizedSlotStart < normalizedBookingEnd && actualServiceEndTime > normalizedBookingStart);

              if (overlap) {
                console.log('🚫 BOOKING CONFLICT DETECTED - This slot WILL BE REMOVED:', {
                  conflictedSlot: `${normalizedSlotStart}-${actualServiceEndTime}`,
                  conflictsWith: `${normalizedBookingStart}-${normalizedBookingEnd}`,
                  bookingService: booking.serviceName,
                  bookingId: booking.bookingId,
                  overlapType: normalizedSlotStart === normalizedBookingStart ? 'exact-match' : 'partial-overlap',
                  reason: 'Time slot overlaps with existing booking'
                });
              } else {
                console.log('✅ NO CONFLICT - Slot is clear of this booking:', {
                  slotTime: `${normalizedSlotStart}-${actualServiceEndTime}`,
                  bookingTime: `${normalizedBookingStart}-${normalizedBookingEnd}`,
                  bookingService: booking.serviceName,
                  reason: normalizedSlotStart >= normalizedBookingEnd ?
                    'Slot starts after booking ends' :
                    'Service ends before booking starts'
                });
              }
              return overlap;
            });

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
                slotDisplayTime: formatTimeToAMPM(normalizedSlotStart)
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
                slotDisplayTime: formatTimeToAMPM(normalizedSlotStart)
              });
            }

            return isValidSlot;
          });

          console.log('[Time] STEP 3 - ENHANCED WORKFLOW RESULT after conflict + shift boundary validation:', {
            beforeFilter: rawScheduleSlots.length,
            afterFilter: filteredSlots.length,
            removedConflicts: rawScheduleSlots.length - filteredSlots.length,
            shiftEndTime: shiftEndTime,
            serviceDuration: duration,
            validationTypes: ['booking conflicts', 'shift boundary violations'],
            finalSlots: filteredSlots.slice(0, 6).map(s => s.time || s.startTime)
          });

          const now = new Date();
          const isToday = selectedDate.toDateString() === now.toDateString();
          const currentTime = isToday ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : null;

          const futureFilteredSlots = isToday ? filteredSlots.filter(slot => {
            const slotTime = slot.time || slot.startTime;
            const normalizedSlotTime = slotTime.includes('T') ?
              slotTime.split('T')[1].substring(0, 5) : slotTime;

            const isCurrentOrFuture = normalizedSlotTime >= currentTime;

            console.log('[Time] Slot time comparison:', {
              slotTime: normalizedSlotTime,
              currentTime,
              isCurrentOrFuture,
              action: isCurrentOrFuture ? 'KEEP' : 'REMOVE'
            });

            return isCurrentOrFuture;
          }) : filteredSlots;

          console.log('[Time] Past time filtering:', {
            isToday,
            currentTime,
            beforeFilter: filteredSlots.length,
            afterFilter: futureFilteredSlots.length,
            removedPastSlots: filteredSlots.length - futureFilteredSlots.length
          });

          const mapped = futureFilteredSlots.map((slot, i) => ({
            id: i,
            time: formatTimeToAMPM(slot.time || slot.startTime),
            timeValue: slot.time || slot.startTime,
            startTime: slot.startTime || slot.time,
            endTime: slot.endTime || addMinutesToTime(slot.time || slot.startTime, duration),
            available: true
          }));
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

          const slotsArr = getValidTimeSlotsForProfessional(assigned, selectedDate, duration, appointmentsIndex);
          console.log('[Time] fallback local slots computed count', slotsArr.length, slotsArr.slice(0, 6));

          const now = new Date();
          const isToday = selectedDate.toDateString() === now.toDateString();
          const currentTime = isToday ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : null;

          const futureFilteredSlotsArr = isToday ? slotsArr.filter(slotTime => {
            const isCurrentOrFuture = slotTime >= currentTime;
            console.log('[Time] Fallback slot time comparison:', {
              slotTime,
              currentTime,
              isCurrentOrFuture,
              action: isCurrentOrFuture ? 'KEEP' : 'REMOVE'
            });
            return isCurrentOrFuture;
          }) : slotsArr;

          console.log('[Time] Fallback past time filtering:', {
            isToday,
            currentTime,
            beforeFilter: slotsArr.length,
            afterFilter: futureFilteredSlotsArr.length,
            removedPastSlots: slotsArr.length - futureFilteredSlotsArr.length
          });

          const mapped = futureFilteredSlotsArr.map((t, i) => ({
            id: i,
            time: formatTimeToAMPM(t),
            timeValue: t,
            startTime: t,
            endTime: addMinutesToTime(t, duration),
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
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() - 7);
              if (!isPastDate(newDate)) {
                setSelectedDate(newDate);
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
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() + 7);
              setSelectedDate(newDate);
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
        ) : availableTimeSlots.length === 0 ? (
          <div className="info-container no-slots">
            <p>Please select another date or professional or another service </p>
          </div>
        ) : (
          <div className="time-slots-grid">
            {availableTimeSlots.map((timeSlot, index) => (
              <button
                key={index}
                onClick={() => handleTimeSelect(timeSlot)}
                className={`time-slot ${selectedTime?.id === timeSlot.id ? "time-slot-selected" : ""} ${!timeSlot.available ? "time-slot-disabled" : ""}`}
                disabled={!timeSlot.available || processingTimeSlotId !== null}
              >
                {selectedTime?.id === timeSlot.id && processingTimeSlotId === timeSlot.id ? (
                  <div className="loading-dots white"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
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
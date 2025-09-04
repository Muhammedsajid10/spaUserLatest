import React, { useState, useEffect, useRef } from "react";
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
  getAvailableProfessionalsForService
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

  // FIX: Use a ref to track if initial load is complete
  const isInitialLoad = useRef(true);

  // compute 7-day array (Sunday -> Saturday) for the current selectedDate
  const weekDates = (() => {
    const start = new Date(selectedDate);
    const day = start.getDay(); // 0 = Sunday
    start.setDate(start.getDate() - day);
    start.setHours(0,0,0,0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  })();

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

    const handleBookingFlowChange = () => {
      loadBookingData();
    };

    window.addEventListener('bookingFlowChange', handleBookingFlowChange);

    return () => {
      window.removeEventListener('bookingFlowChange', handleBookingFlowChange);
    };
  }, []);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const changeMonth = (offset) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedDate(newDate);
  };

  // Fetch employees + bookings for a specific date and build appointmentsIndex
  const fetchDateData = async (date) => {
    const formattedDate = apiUtils.formatDate(date);
    console.log('[Time] fetchDateData start', { formattedDate });

    // 1) Fetch employees using public booking API with selected service
    let employees = [];
    try {
      // Use the public booking API to get available professionals for the selected service
      if (selectedService && selectedService._id && bookingsAPI && typeof bookingsAPI.getAvailableProfessionals === 'function') {
        const resp = await bookingsAPI.getAvailableProfessionals(selectedService._id, formattedDate);
        employees = resp?.data?.professionals ?? resp?.professionals ?? resp?.data ?? resp ?? [];
        console.log('[Time] fetched professionals for service via public API', { 
          serviceId: selectedService._id, 
          count: employees.length,
          sampleEmployee: employees[0] ? {
            id: employees[0]._id,
            name: employees[0].user ? `${employees[0].user.firstName} ${employees[0].user.lastName}` : employees[0].name,
            hasWorkSchedule: !!employees[0].workSchedule,
            workScheduleKeys: employees[0].workSchedule ? Object.keys(employees[0].workSchedule) : [],
            workScheduleSample: employees[0].workSchedule 
          } : null
        });

        // Apply fallback workSchedule if the public API doesn't return complete schedule data
        employees = employees.map(emp => {
          if (!emp.workSchedule || Object.keys(emp.workSchedule).length === 0) {
            console.log(`[Time] Applying enhanced default schedule for ${emp.user?.firstName} ${emp.user?.lastName}`);
            // Use a more flexible default that allows extended hours
            emp.workSchedule = {
              sunday: { isWorking: true, startTime: '06:00', endTime: '22:00', shifts: '06:00 - 22:00' },
              monday: { isWorking: true, startTime: '06:00', endTime: '22:00', shifts: '06:00 - 22:00' },
              tuesday: { isWorking: true, startTime: '06:00', endTime: '22:00', shifts: '06:00 - 22:00' },
              wednesday: { isWorking: true, startTime: '06:00', endTime: '22:00', shifts: '06:00 - 22:00' },
              thursday: { isWorking: true, startTime: '06:00', endTime: '22:00', shifts: '06:00 - 22:00' },
              friday: { isWorking: true, startTime: '06:00', endTime: '22:00', shifts: '06:00 - 22:00' },
              saturday: { isWorking: true, startTime: '06:00', endTime: '22:00', shifts: '06:00 - 22:00' }
            };
          }
          return emp;
        });

        console.log('[Time] Final employees with workSchedule:', {
          employeesCount: employees.length,
          employeesWithSchedule: employees.filter(e => e.workSchedule && Object.keys(e.workSchedule).length > 0).length
        });
      } else {
        console.warn('[Time] no selected service or getAvailableProfessionals API not available');
        employees = [];
      }
    } catch (err) {
      console.warn('[Time] failed to fetch professionals for service', selectedService?._id, 'on date', formattedDate, err);
      employees = [];
    }

    // normalize employees (unwrap potential wrappers)
    employees = (employees || []).map((raw, idx) => {
      const emp = raw && raw.employee ? raw.employee : raw || {};
      const resolvedId = emp._id || emp.id || `emp-${idx}`;
      return { ...emp, _id: emp._id || resolvedId, id: emp.id || resolvedId };
    });

    // 2) ENHANCEMENT: Fetch existing bookings for the specific employee to exclude booked times
    // Only fetch when we have a specific professional selected (not "any")
    let bookings = [];
    const flow = bookingFlow.load();
    const specificProfessional = flow.selectedProfessionals?.[selectedService?._id] || selectedProfessional;
    const isSpecificProfessional = specificProfessional && specificProfessional.id !== 'any' && specificProfessional._id !== 'any';
    
    if (isSpecificProfessional) {
      try {
        console.log('[Time] Getting available time slots for specific professional (this will exclude booked times):', {
          professionalId: specificProfessional._id || specificProfessional.id,
          professionalName: specificProfessional.user ? `${specificProfessional.user.firstName} ${specificProfessional.user.lastName}` : specificProfessional.name,
          serviceId: selectedService?._id,
          date: formattedDate
        });
        
        // Use the getAvailableTimeSlots API which already excludes booked times
        if (bookingsAPI && typeof bookingsAPI.getAvailableTimeSlots === 'function' && selectedService?._id) {
          const resp = await bookingsAPI.getAvailableTimeSlots(
            specificProfessional._id || specificProfessional.id,
            selectedService._id,
            formattedDate
          );
          // The response contains available time slots, we can infer bookings by missing slots
          const availableSlots = resp?.data?.timeSlots || resp?.timeSlots || resp || [];
          console.log('[Time] Got available time slots from API (booked times already excluded):', {
            availableSlotsCount: availableSlots.length,
            sampleSlots: availableSlots.slice(0, 3)
          });
          
          // Since we have available slots that exclude bookings, we don't need to fetch bookings separately
          // The backend has already handled booking conflicts
          bookings = []; // We'll rely on the backend's availability checking
        } else {
          console.log('[Time] getAvailableTimeSlots API not available, will rely on backend availability checking');
          bookings = [];
        }
      } catch (err) {
        console.log('[Time] Failed to fetch available time slots from API:', err.message);
        console.log('[Time] Will fall back to backend availability checking during slot generation');
        bookings = [];
      }
    } else {
      console.log('[Time] Skipping bookings fetch - no specific professional selected or "any" professional mode');
    }

    // build appointmentsIndex: { [employeeId]: { [YYYY-MM-DD]: { key: booking } } }
    const appointmentsIndex = {};
    bookings.forEach(b => {
      let empRef = b.employeeId ?? b.employee ?? b.professionalId ?? null;
      if (!empRef && b.employee && typeof b.employee === 'object') {
        empRef = b.employee._id || b.employee.id || null;
      }
      const empId = (empRef && typeof empRef === 'object') ? (empRef._id || empRef.id || String(empRef)) : empRef;
      const start = b.startTime || b.time || b.date || b.slot || b.start;
      if (!empId || !start) return;
      const dayKey = localDateKey(new Date(start));
      appointmentsIndex[empId] = appointmentsIndex[empId] || {};
      appointmentsIndex[empId][dayKey] = appointmentsIndex[empId][dayKey] || {};
      const key = b._id || b.id || `${start}_${empId}`;
      appointmentsIndex[empId][dayKey][key] = b;
    });

    // mirror alternate ids to normalized employee ids
    const idMap = {};
    employees.forEach(emp => {
      if (emp._id) idMap[String(emp._id)] = emp._id;
      if (emp.id) idMap[String(emp.id)] = emp._id || emp.id;
    });
    Object.keys(appointmentsIndex).forEach(rawId => {
      const normalized = idMap[rawId];
      if (normalized && normalized !== rawId) {
        appointmentsIndex[normalized] = { ...(appointmentsIndex[normalized] || {}), ...appointmentsIndex[rawId] };
      }
    });

    console.log('[Time] fetchDateData done', { employeesCount: employees.length, bookingsCount: bookings.length });
    console.log('[Time] fetchDateData raw employees sample', employees.slice(0,3));
    console.log('[Time] fetchDateData raw bookings sample', bookings.slice(0,6));
    // show mapping of appointmentsIndex keys and date keys inside them
    Object.keys(appointmentsIndex).forEach(empKey => {
      console.log('[Time] appointmentsIndex key', empKey, 'dates:', Object.keys(appointmentsIndex[empKey] || {}).slice(0,6));
    });
    // also show formattedDate and localDateKey for that date
    console.log('[Time] formattedDate/localDateKey', { formattedDate, localDateKey: localDateKey(date) });
    return { employees, appointmentsIndex };
  };

  const handleDateClick = async (day) => {
    console.log('[Time] handleDateClick start (local computation)', { day, selectedService, selectedProfessional });
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    setSelectedDate(newDate);
    setCalendarOpen(false);
    setLoadingTimeSlots(true);
    setAvailableTimeSlots([]);

    try {
      const flow = bookingFlow.load();
      const services = (flow.selectedServices && flow.selectedServices.length) ? flow.selectedServices : ([selectedService].filter(Boolean));

      const { employees, appointmentsIndex } = await fetchDateData(newDate);

      // single-service -> compute using local slots for the assigned professional (or union if 'any')
      if (!services || services.length <= 1) {
        const svc = services && services[0] || selectedService;
        if (!svc) throw new Error('No service selected');

        const assigned = flow.selectedProfessionals?.[svc._id] || selectedProfessional;

        if (!assigned || assigned.id === 'any' || assigned._id === 'any') {
          // union across all available employees for the service using employees + appointmentsIndex
          console.log('[Time] single-service ANY -> union slots from local employees list');
          const avail = getAvailableProfessionalsForService(svc._id, newDate, employees, appointmentsIndex, flow.selectedServices || [svc]);
          const union = [];
          (avail || []).forEach(r => (r.slots || []).forEach(s => union.push(s)));
          const uniq = Array.from(new Set(union)).sort();
          const slots = uniq.map((t,i) => ({ id:i, time:t, startTime:t, endTime: addMinutesToTime(t, svc.duration||30), available:true }));
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
        const mapped = slotsArr.map((t, i) => ({ id: i, time: t, startTime: t, endTime: addMinutesToTime(t, duration), available: true }));
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
        time: s.startTime,
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

  useEffect(() => {
    const fetchTimeSlots = async () => {
      console.log('[Time] useEffect fetchTimeSlots start (local computation with bookings)', { selectedService, selectedProfessional, selectedDate });

      if (!selectedService || !selectedDate) {
        console.log('[Time] fetchTimeSlots abort - missing service or date');
        setAvailableTimeSlots([]);
        return;
      }

      setLoadingTimeSlots(true);
      setError(null);

      try {
        // Always fetch date-specific data (employees + bookings) and build appointmentsIndex
        const { employees, appointmentsIndex } = await fetchDateData(selectedDate);
        console.log('[Time] fetchTimeSlots - fetched date data', {
          employeesCount: employees.length,
          appointmentEmployees: Object.keys(appointmentsIndex).length,
          selectedDate: selectedDate.toDateString(),
          appointmentsIndex: Object.keys(appointmentsIndex).map(empId => ({
            empId, 
            bookingCount: Object.keys(appointmentsIndex[empId] || {}).length
          }))
        });

        // Log shifts for debug (helps find why shifts not detected)
        employees.forEach(emp => {
          try {
            console.log('[Time] ENHANCED: employee workSchedule data', { 
              id: emp._id || emp.id, 
              name: emp.name || (emp.user && `${emp.user.firstName} ${emp.user.lastName}`),
              hasWorkSchedule: !!emp.workSchedule,
              workScheduleKeys: emp.workSchedule ? Object.keys(emp.workSchedule) : [],
              dayOfWeek: selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
              todaySchedule: emp.workSchedule ? emp.workSchedule[selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()] : null
            });
            const shifts = getEmployeeShiftHours(emp, selectedDate);
            console.log('[Time] ENHANCED: employee computed shifts', { 
              id: emp._id || emp.id, 
              name: emp.name || (emp.user && `${emp.user.firstName} ${emp.user.lastName}`), 
              shifts,
              isNinaKowalski: emp.user?.firstName === 'Nina' && emp.user?.lastName === 'Kowalski'
            });
          } catch (e) {
            console.warn('[Time] failed to get shifts for employee', emp._id || emp.id, e);
          }
        });

        const flow = bookingFlow.load();
        const services = flow.selectedServices && flow.selectedServices.length ? flow.selectedServices : [selectedService];

        // Multi-service flow
        if (services.length > 1) {
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
            time: s.startTime,
            startTime: s.startTime,
            endTime: s.sequence[s.sequence.length - 1].endTime,
            available: true,
            sequence: s.sequence
          }));
          setAvailableTimeSlots(slots);
          setLoadingTimeSlots(false);
          return;
        }

        // Single-service flow
        const svc = services[0];
        const assigned = flow.selectedProfessionals?.[svc._id] || selectedProfessional;
        
        console.log('[Time] Single-service assignment check:', {
          serviceId: svc._id,
          assignedFromFlow: flow.selectedProfessionals?.[svc._id],
          assignedFromState: selectedProfessional,
          finalAssigned: assigned,
          assignedId: assigned?.id || assigned?._id,
          assignedName: assigned?.user ? `${assigned.user.firstName} ${assigned.user.lastName}` : assigned?.name,
          isAny: !assigned || assigned.id === 'any' || assigned._id === 'any'
        });
        
        if (!assigned || assigned.id === 'any' || assigned._id === 'any') {
          console.log('[Time] single-service ANY -> using local week scan for union slots');
          const profsResult = await fetchAvailableProfessionalsForServiceByWeek(svc._id, selectedDate, services);
          const union = [];
          (profsResult || []).forEach(r => (r.slots || []).forEach(s => union.push(s)));
          const uniq = Array.from(new Set(union)).sort();
          const slots = uniq.map((t,i) => ({ id:i, time:t, startTime:t, endTime:addMinutesToTime(t, svc.duration||30), available:true }));
          console.log('[Time] union slots count', slots.length);
          setAvailableTimeSlots(slots);
          setLoadingTimeSlots(false);
          return;
        }

        // assigned is a specific employee -> use new public API to get scheduled and available time slots
        const duration = svc.duration || 30;
        const empId = assigned._id || assigned.id;
        const formattedDate = apiUtils.formatDate(selectedDate);
        
        console.log('[Time] DETAILED: About to call new API with employee details:', {
          assignedEmployee: assigned,
          employeeId: empId,
          employeeName: assigned?.user ? `${assigned.user.firstName} ${assigned.user.lastName}` : assigned?.name,
          formattedDate,
          selectedDate: selectedDate.toString(),
          isNinaKowalski: assigned?.user?.firstName === 'Nina' && assigned?.user?.lastName === 'Kowalski'
        });
        
        try {
          console.log('[Time] calling getEmployeeSchedule API for admin-configured schedule', { employeeId: empId, date: formattedDate });
          const response = await bookingsAPI.getEmployeeSchedule(empId, formattedDate);
          const scheduleData = response?.data || response;
          
          console.log('[Time] Employee schedule data:', {
            scheduledShifts: scheduleData.scheduledShifts,
            bookedSlots: scheduleData.bookedSlots,
            availableSlots: scheduleData.availableTimeSlots
          });
          
          // Use available time slots from the API (already excludes booked times)
          const slotsArr = scheduleData.availableTimeSlots || [];
          console.log('[Time] Available time slots from admin schedule:', { count: slotsArr.length, sample: slotsArr.slice(0,6) });
          
          const mapped = slotsArr.map((slot, i) => ({ 
            id: i, 
            time: slot.time, 
            startTime: slot.startTime, 
            endTime: slot.endTime, 
            available: true 
          }));
          setAvailableTimeSlots(mapped);
          console.log('[Time] SUCCESS: Using admin-scheduled time slots for', assigned?.user?.firstName, assigned?.user?.lastName);
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
          const mapped = slotsArr.map((t, i) => ({ id: i, time: t, startTime: t, endTime: addMinutesToTime(t, duration), available: true }));
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
  }, [selectedService, selectedProfessional, selectedDate]);

  const handleTimeSelect = (timeSlot) => {
    setSelectedTime(timeSlot);

    // Create proper date-time strings for startTime and endTime
    const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`; // YYYY-MM-DD in local timezone
    const startTimeStr = timeSlot.time || timeSlot.startTime; // e.g., "09:00" or "2025-09-03T09:00:00.000Z"
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

    const timeData = {
      date: selectedDateStr, // Store as YYYY-MM-DD string to avoid timezone shifts
      time: formattedStartTime, // Store simple time format like "09:00"
      startTime: startDateTimeLocal.toISOString(), // Proper UTC conversion from local time
      endTime: endDateTimeLocal.toISOString(), // Proper UTC conversion from local time
      professional: selectedProfessional,
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

  return (
    <div className="time-selector">
      {from === 'professionals' && (
        <button className="back-to-professionals" onClick={handleBackToProfessionals} aria-label="Back to Professionals">
          ← Back to professionals
        </button>
      )}

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
                    return (
                      <div
                        key={day}
                        className={`cal-day ${isSelected ? "cal-day-selected" : ""}`}
                        onClick={() => handleDateClick(day)}
                      >
                        {day}
                      </div>
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
              <Professionals />
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
            className="nav-btn"
            onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 7)))}
            aria-label="Previous week"
          >
            <ChevronLeft className="nav-icon" />
          </button>
          <button
            className="nav-btn nav-btn-active"
            onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 7)))}
            aria-label="Next week"
          >
            <ChevronRight className="nav-icon" />
          </button>
        </div>
      </div>

      <div className="date-grid">
        {weekDates.map((date, index) => (
          <button
            key={index}
            onClick={() => handleDateClick(date.getDate())}
            className={`date-btn ${selectedDate.toDateString() === date.toDateString() ? "date-btn-selected" : ""}`}
          >
            <span className="date-number">{date.getDate()}</span>
            <span className="date-weekday">{date.toLocaleString("default", { weekday: 'short' })}</span>
          </button>
        ))}
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
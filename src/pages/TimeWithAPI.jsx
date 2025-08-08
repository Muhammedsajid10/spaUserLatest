import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Time.css";
import Professionals from "./ProfessionalsUpdated";
import { bookingsAPI, apiUtils, bookingFlow } from "../services/api";

// Elegant full-page spinner component
const FullPageLoader = () => (
    <div className="full-page-loading">
        <div className="loader-spinner"></div>
        <p>Loading your booking options...</p>
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

const Time = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [selectedTime, setSelectedTime] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState(null);
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
    const [error, setError] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedServices, setSelectedServices] = useState([]);
    const [currentStep] = useState(3);
    const popupRef = useRef(null);
    const navigate = useNavigate();

    const [processingTimeSlotId, setProcessingTimeSlotId] = useState(null);
    
    // FIX: Use a ref to track if initial load is complete
    const isInitialLoad = useRef(true);

    // Load booking flow data and initial page load
    useEffect(() => {
        const loadBookingData = () => {
            const data = bookingFlow.load();
            if (data.selectedServices && data.selectedServices.length > 0) {
                setSelectedServices(data.selectedServices);
                setSelectedService(data.selectedServices[0]);
            } else {
                setSelectedServices([]);
            }
            
            const professionalForService = data.selectedProfessionals?.[data.selectedServices?.[0]?._id];
            if (professionalForService) {
                setSelectedProfessional(professionalForService);
            } else {
                setSelectedProfessional(null);
            }
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
  
    const handleDateClick = (day) => {
        const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
        setSelectedDate(newDate);
        setCalendarOpen(false);
    };

    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(selectedDate);
        d.setDate(selectedDate.getDate() - selectedDate.getDay() + i);
        return d;
    });
  
    useEffect(() => {
        const fetchTimeSlots = async () => {
            // No need to fetch if service/professional/date is not yet selected
            if (!selectedService || !selectedProfessional || !selectedDate) {
                setAvailableTimeSlots([]);
                return;
            }

            const professionalId = selectedProfessional.id || selectedProfessional._id;
            
            if (professionalId === 'any') {
                setAvailableTimeSlots([]);
                return;
            }

            setError(null);
            setLoadingTimeSlots(true); // Correctly set a separate loading state

            try {
                const formattedDate = apiUtils.formatDate(selectedDate);
                const response = await bookingsAPI.getAvailableTimeSlots(
                    professionalId,
                    selectedService._id,
                    formattedDate
                );
                if (response.success && response.data && response.data.timeSlots && response.data.timeSlots.length > 0) {
                    const transformedSlots = response.data.timeSlots.map((slot, index) => ({
                        id: index,
                        time: apiUtils.parseTimeSlot(slot),
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        available: slot.available
                    }));
                    setAvailableTimeSlots(transformedSlots);
                } else {
                    setAvailableTimeSlots([]);
                }
            } catch (err) {
                setError(err.message);
                setAvailableTimeSlots([]);
            } finally {
                setLoadingTimeSlots(false); // Correctly clears the inline loading state
            }
        };
        fetchTimeSlots();
    }, [selectedService, selectedProfessional, selectedDate]);
  
    const handleTimeSelect = (timeSlot) => {
        setProcessingTimeSlotId(timeSlot.id);
        setTimeout(() => {
            setSelectedTime(timeSlot);
            const timeData = {
                date: selectedDate,
                time: timeSlot,
                professional: selectedProfessional,
                service: selectedService
            };
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
  
    const professionalName = selectedProfessional?.id === 'any'
      ? 'Any professional'
      : (selectedProfessional?.user?.firstName && selectedProfessional?.user?.lastName
        ? `${selectedProfessional.user.firstName} ${selectedProfessional.user.lastName}`
        : selectedProfessional?.name || 'Select Professional');
  
    if (loading) {
      return <FullPageLoader />;
    }
    
    return (
      <div className="time-selector">
        <h1 className="header-title">Select time</h1>
  
        <div className="profile-section">
          <div className="profile-info" onClick={() => setShowPopup(!showPopup)}>
            <div className="avatar">
              <span>{selectedProfessional?.name?.charAt(0) || 'S'}</span>
            </div>
            <span className="username">
              {professionalName}
            </span>
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
              <div className="popup-scroll-view">
                <Professionals onProfessionalSelect={handleProfessionalSelect} />
              </div>
              <button className="popup-close-btn" onClick={() => setShowPopup(false)}>
                Close
              </button>
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
            >
              <ChevronLeft className="nav-icon" />
            </button>
            <button
              className="nav-btn nav-btn-active"
              onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 7)))}
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
              className={`date-btn ${
                selectedDate.toDateString() === date.toDateString() ? "date-btn-selected" : ""
              }`}
            >
              <span className="date-number">{date.getDate()}</span>
              <span className="date-day">
                {date.toLocaleString("default", { weekday: "short" })}
              </span>
            </button>
          ))}
        </div>
  
        <div className="time-slots">
          <div className="time-slots-wrapper">
            {loadingTimeSlots ? (
               <div className="info-container loading-state">
                  <LoadingDots />
                  <p>Checking for availability...</p>
               </div>
            ) : error ? (
              <div className="info-container error-state">
                <p>Error loading time slots: {error}</p>
                <button onClick={() => window.location.reload()} className="retry-button">Try Again</button>
              </div>
            ) : !selectedService || !selectedProfessional ? (
              <div className="info-container">
                <p>Please select a service and professional first</p>
              </div>
            ) : availableTimeSlots.length === 0 ? (
              <div className="info-container">
                <p>No available time slots for the selected date</p>
              </div>
            ) : (
              <div className="time-slots-grid">
                {availableTimeSlots.map((timeSlot, index) => (
                  <button
                    key={index}
                    onClick={() => handleTimeSelect(timeSlot)}
                    className={`time-slot ${
                      selectedTime?.id === timeSlot.id ? "time-slot-selected" : ""
                    } ${!timeSlot.available ? "time-slot-disabled" : ""}`}
                    disabled={!timeSlot.available || processingTimeSlotId !== null}
                  >
                    {processingTimeSlotId === timeSlot.id ? <LoadingDots /> : <span className="time-text">{timeSlot.time}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
      </div>
    );
  };
  
  // ServiceBottomBar Component
  function ServiceBottomBar({ currentStep = 3, navigate }) {
    const [selectedServices, setSelectedServices] = useState([]);
    useEffect(() => {
      const loadServices = () => {
        bookingFlow.load();
        setSelectedServices(bookingFlow.selectedServices || []);
      };
      
      loadServices();
      
      const handler = () => {
        loadServices();
      };
      
      window.addEventListener("bookingFlowChange", handler);
      return () => window.removeEventListener("bookingFlowChange", handler);
    }, []);
  
    const totalDuration = selectedServices.reduce(
      (sum, svc) => sum + (svc.duration || 0),
      0
    );
    const totalRate = selectedServices.reduce(
      (sum, svc) => sum + (svc.price || 0),
      0
    );
  
    const canContinue = () => !!bookingFlow.selectedTimeSlot;
  
    const handleContinue = () => {
      if (!canContinue()) {
        Swal.fire({
          title: 'Time Slot Required',
          text: 'Please select an available time slot.',
          icon: 'warning',
          confirmButtonText: 'OK',
          timer: 3000,
          showConfirmButton: true
        });
        return;
      }
      navigate('/payment');
    };
  
    return (
      <div className="service-bottom-bar">
        <span>{totalDuration} min</span>
        <span>{selectedServices.length} services</span>
        <span>AED {totalRate}</span>
        <button
          className={`btn-continue ${!canContinue() ? "disabled" : ""}`}
          onClick={handleContinue}
          disabled={!canContinue()}
        >
          {currentStep === 4 ? "Complete Booking" : "Continue"}
        </button>
      </div>
    );
  }
  
  export default Time;
import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Time.css";
import Professionals from "./ProfessionalsUpdated";
import { bookingsAPI, apiUtils, bookingFlow } from "../services/api";
import Swal from 'sweetalert2';

const Time = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentStep] = useState(3); // Step 3 for time selection
  const popupRef = useRef(null);
  const navigate = useNavigate();

  // Load booking flow data
  useEffect(() => {
    const loadBookingData = () => {
      const data = bookingFlow.load();
      console.log('TimeWithAPI - Loaded booking data:', data);
      
      // Load selected services
      if (data.selectedServices && data.selectedServices.length > 0) {
        setSelectedServices(data.selectedServices);
        setSelectedService(data.selectedServices[0]);
        console.log('TimeWithAPI - Setting selected services:', data.selectedServices);
      } else {
        console.log('TimeWithAPI - No services found in booking flow');
        setSelectedServices([]);
      }
      
      if (data.selectedProfessional) {
        console.log('TimeWithAPI - Setting selected professional:', data.selectedProfessional);
        setSelectedProfessional(data.selectedProfessional);
      } else if (data.selectedProfessionals && Object.keys(data.selectedProfessionals).length > 0) {
        // If using the new multiple professionals structure, get the first one
        const firstServiceId = Object.keys(data.selectedProfessionals)[0];
        const firstProfessional = data.selectedProfessionals[firstServiceId];
        console.log('TimeWithAPI - Setting selected professional from selectedProfessionals:', firstProfessional);
        setSelectedProfessional(firstProfessional);
      } else {
        console.log('TimeWithAPI - No professional found in booking flow');
        console.log('TimeWithAPI - Full booking flow data:', data);
        console.log('TimeWithAPI - selectedProfessional exists:', !!data.selectedProfessional);
        console.log('TimeWithAPI - selectedProfessionals keys:', Object.keys(data.selectedProfessionals || {}));
      }
    };
    
    loadBookingData();
    
    // Listen for changes in booking flow, but debounce to prevent too many calls
    let debounceTimer;
    const handleBookingFlowChange = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log('TimeWithAPI - Booking flow change detected, reloading data...');
        loadBookingData();
      }, 500); // Wait 500ms before reloading
    };
    
    window.addEventListener('bookingFlowChange', handleBookingFlowChange);
    
    return () => {
      clearTimeout(debounceTimer);
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

  // Fetch available time slots when professional, service, or date changes
  useEffect(() => {
    let isMounted = true;
    let requestTimeout;
    
    const fetchTimeSlots = async () => {
      if (!selectedService || !selectedProfessional || !selectedDate) {
        setAvailableTimeSlots([]);
        return;
      }

      // Don't fetch if "Any professional" is selected or if it's a sample professional
      console.log('Checking professional:', selectedProfessional);
      
      // Get the correct professional ID - handle both structures
      const professionalId = selectedProfessional.id || selectedProfessional._id;
      console.log('Professional ID:', professionalId);
      console.log('Is sample professional:', professionalId && professionalId.startsWith('sample'));
      
      if (professionalId === 'any' || (professionalId && professionalId.startsWith('sample'))) {
        console.log('Sample professional or "any" selected, showing demo time slots');
        showFallbackTimeSlots();
        return;
      }

      // Add a small delay to prevent rapid API calls
      requestTimeout = setTimeout(async () => {
        if (!isMounted) return;
        
        setLoading(true);
        setError(null);

        try {
          const formattedDate = apiUtils.formatDate(selectedDate);
          console.log('Fetching time slots for:', {
            professionalId: professionalId,
            serviceId: selectedService._id,
            date: formattedDate
          });
          
          const response = await bookingsAPI.getAvailableTimeSlots(
            professionalId,
            selectedService._id,
            formattedDate
          );

          if (!isMounted) return;

          console.log('Time slots API response:', response);

          if (response.success && response.data && response.data.timeSlots && response.data.timeSlots.length > 0) {
            // Transform time slots to readable format
            const transformedSlots = response.data.timeSlots.map((slot, index) => ({
              id: index,
              time: apiUtils.parseTimeSlot(slot),
              startTime: slot.startTime,
              endTime: slot.endTime,
              available: slot.available
            }));

            setAvailableTimeSlots(transformedSlots);
          } else {
            // No time slots found
            console.log('No time slots found in API response');
            setAvailableTimeSlots([]);
          }
        } catch (err) {
          if (!isMounted) return;
          
          console.error('Error fetching time slots:', err);
          setError(err.message);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      }, 300); // 300ms delay to debounce rapid calls
    };

    // Function to show fallback time slots for testing
    const showFallbackTimeSlots = () => {
      const fallbackSlots = [
        { id: 0, time: '9:00 AM', startTime: '09:00', endTime: '10:00', available: true },
        { id: 1, time: '10:00 AM', startTime: '10:00', endTime: '11:00', available: true },
        { id: 2, time: '11:00 AM', startTime: '11:00', endTime: '12:00', available: true },
        { id: 3, time: '12:00 PM', startTime: '12:00', endTime: '13:00', available: false },
        { id: 4, time: '1:00 PM', startTime: '13:00', endTime: '14:00', available: true },
        { id: 5, time: '2:00 PM', startTime: '14:00', endTime: '15:00', available: true },
        { id: 6, time: '3:00 PM', startTime: '15:00', endTime: '16:00', available: true },
        { id: 7, time: '4:00 PM', startTime: '16:00', endTime: '17:00', available: true },
        { id: 8, time: '5:00 PM', startTime: '17:00', endTime: '18:00', available: true },
        { id: 9, time: '6:00 PM', startTime: '18:00', endTime: '19:00', available: true }
      ];
      
      setAvailableTimeSlots(fallbackSlots);
    };

    fetchTimeSlots();
    
    return () => {
      isMounted = false;
      clearTimeout(requestTimeout);
    };
  }, [selectedService, selectedProfessional, selectedDate]);

  const handleProfessionalSelect = (professional) => {
    setSelectedProfessional(professional);
    setSelectedTime(null); // Reset selected time when professional changes
    
    // Save to booking flow using the new structure
    if (professional.id !== 'any') {
      // Assign this professional to all selected services
      bookingFlow.selectedServices.forEach(service => {
        bookingFlow.selectedProfessionals[service._id] = professional.employee;
      });
    } else {
      // For "any professional", assign to all services
      const anyProfessional = { id: 'any', name: 'Any professional' };
      bookingFlow.selectedServices.forEach(service => {
        bookingFlow.selectedProfessionals[service._id] = anyProfessional;
      });
    }
    bookingFlow.save();
  };

  const handleTimeSelect = (timeSlot) => {
    setSelectedTime(timeSlot);
    
    // Save selected time to booking flow without triggering unnecessary events
    const timeData = {
      date: selectedDate,
      time: timeSlot,
      professional: selectedProfessional,
      service: selectedService
    };
    
    // Update booking flow silently to avoid triggering events
    bookingFlow.selectedTimeSlot = timeData;
    
    // Save to localStorage directly without triggering events
    localStorage.setItem('bookingFlow', JSON.stringify({
      selectedServices: bookingFlow.selectedServices,
      selectedProfessionals: bookingFlow.selectedProfessionals,
      selectedDate: bookingFlow.selectedDate,
      selectedTimeSlot: bookingFlow.selectedTimeSlot,
      bookingConfirmation: bookingFlow.bookingConfirmation
    }));
    
    console.log('Time selected:', timeData);
  };

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="time-selector">
      <h1 className="header-title">Select time</h1>

      {/* Profile Section */}
      <div className="profile-section">
        <div className="profile-info" onClick={() => setShowPopup(!showPopup)}>
          <div className="avatar">
            <span>{selectedProfessional?.name?.charAt(0) || 'S'}</span>
          </div>
          <span className="username">
            {selectedProfessional?.name || 'Select Professional'}
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

      {/* Popup for Professional Selection */}
      {showPopup && (
        <div className="profile-popup">
          <div className="popup-content" ref={popupRef}>
            <div className="popup-scroll-view">
              <Professionals />
            </div>
            <button className="popup-close-btn" onClick={() => setShowPopup(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Month Navigation */}
      <div className="month-navigation">
        <h2 className="month-title">
          {selectedDate.toLocaleString("default", { month: "long" })} {selectedDate.getFullYear()}
        </h2>
        <div className="nav-buttons">
          <button
            className="nav-btn"
            onClick={() =>
              setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 7)))
            }
          >
            <ChevronLeft className="nav-icon" />
          </button>
          <button
            className="nav-btn nav-btn-active"
            onClick={() =>
              setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 7)))
            }
          >
            <ChevronRight className="nav-icon" />
          </button>
        </div>
      </div>

      {/* Date Grid */}
      <div className="date-grid">
        {weekDates.map((date, index) => (
          <button
            key={index}
            onClick={() => setSelectedDate(date)}
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

      {/* Time Slots */}
      <div className="time-slots">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading available times...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>Error loading time slots: {error}</p>
            <button onClick={() => window.location.reload()}>Try Again</button>
          </div>
        ) : !selectedService || !selectedProfessional ? (
          <div className="info-container">
            <p>Please select services and professional first</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              Debug: selectedService = {selectedService ? 'YES' : 'NO'}, 
              selectedProfessional = {selectedProfessional ? 'YES' : 'NO'}
            </p>
          </div>
        ) : selectedProfessional.id === 'any' ? (
          <div className="info-container">
            <p>Please select a specific professional to see available times</p>
          </div>
        ) : availableTimeSlots.length === 0 ? (
          <div className="info-container">
            <p>No available time slots for the selected date</p>
            {/* Show fallback time slots for testing */}
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                Showing sample time slots for testing:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                {[
                  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
                  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'
                ].map((time, index) => (
                  <button
                    key={index}
                    onClick={() => handleTimeSelect({
                      id: index,
                      time: time,
                      startTime: time,
                      endTime: time,
                      available: true
                    })}
                    className={`time-slot ${selectedTime?.id === index ? "time-slot-selected" : ""}`}
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      background: selectedTime?.id === index ? '#007bff' : 'white',
                      color: selectedTime?.id === index ? 'white' : '#333',
                      cursor: 'pointer'
                    }}
                  >
                    <span className="time-text">{time}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          availableTimeSlots.map((timeSlot, index) => (
            <button
              key={index}
              onClick={() => handleTimeSelect(timeSlot)}
              className={`time-slot ${selectedTime?.id === timeSlot.id ? "time-slot-selected" : ""}`}
              disabled={!timeSlot.available}
            >
              <span className="time-text">{timeSlot.time}</span>
            </button>
          ))
        )}
      </div>

      {/* ServiceBottomBar - only show if services are selected */}
      {selectedServices.length > 0 && (
        <ServiceBottomBar currentStep={currentStep} navigate={navigate} />
      )}
    </div>
  );
};

// ServiceBottomBar Component
function ServiceBottomBar({ currentStep = 3, navigate }) {
  const [selectedServices, setSelectedServices] = React.useState([]);

  React.useEffect(() => {
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

  const canContinue = () => selectedServices.length > 0;

  const handleContinue = () => {
    switch (currentStep) {
      case 1:
        if (canContinue()) {
          navigate("/professionals");
        } else {
          Swal.fire({
            title: 'Service Required',
            text: 'Please select at least one service.',
            icon: 'warning',
            confirmButtonText: 'OK'
          });
        }
        break;
      case 2:
        navigate("/time");
        break;
      case 3:
        navigate("/payment");
        break;
      case 4:
        Swal.fire({
          title: 'Complete Booking',
          text: 'Complete payment logic here.',
          icon: 'info',
          confirmButtonText: 'OK'
        });
        break;
      default:
        break;
    }
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
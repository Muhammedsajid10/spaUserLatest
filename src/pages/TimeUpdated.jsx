import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import "./Time.css";
import Services from "./Services";
import Professionals from "./ProfessionalsUpdated";
import { bookingsAPI, apiUtils } from "../services/api";

const Time = ({ selectedService, onTimeSelect }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);

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
    const fetchTimeSlots = async () => {
      if (!selectedService || !selectedProfessional || !selectedDate) {
        setAvailableTimeSlots([]);
        return;
      }

      // Don't fetch if "Any professional" is selected
      if (selectedProfessional.id === 'any') {
        setAvailableTimeSlots([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const formattedDate = apiUtils.formatDate(selectedDate);
        const response = await bookingsAPI.getAvailableTimeSlots(
          selectedProfessional.id,
          selectedService._id,
          formattedDate
        );

        if (response.success) {
          // Transform time slots to readable format
          const transformedSlots = response.data.timeSlots.map((slot, index) => ({
            id: index,
            time: apiUtils.parseTimeSlot(slot),
            startTime: slot.startTime,
            endTime: slot.endTime,
            available: slot.available
          }));

          setAvailableTimeSlots(transformedSlots);
        }
      } catch (err) {
        console.error('Error fetching time slots:', err);
        setError(err.message);
        setAvailableTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSlots();
  }, [selectedService, selectedProfessional, selectedDate]);

  const handleProfessionalSelect = (professional) => {
    setSelectedProfessional(professional);
    setSelectedTime(null); // Reset selected time when professional changes
  };

  const handleTimeSelect = (timeSlot) => {
    setSelectedTime(timeSlot);
    
    // Call the parent callback with the selected time
    if (onTimeSelect) {
      onTimeSelect({
        date: selectedDate,
        time: timeSlot,
        professional: selectedProfessional,
        service: selectedService
      });
    }
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
              <Professionals 
                selectedService={selectedService}
                selectedDate={selectedDate}
                onProfessionalSelect={handleProfessionalSelect}
              />
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
            <p>Please select a service and professional first</p>
          </div>
        ) : selectedProfessional.id === 'any' ? (
          <div className="info-container">
            <p>Please select a specific professional to see available times</p>
          </div>
        ) : availableTimeSlots.length === 0 ? (
          <div className="info-container">
            <p>No available time slots for the selected date</p>
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
    </div>
  );
};

export default Time; 
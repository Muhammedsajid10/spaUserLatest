import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import "./Time.css";
import Services from "./Services";
import Professionals from "./Professionals";
import { useHeaderTitle } from '../Service/HeaderTitleContext';

const Time = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef(null);
  const { setHeaderTitle } = useHeaderTitle();
  const headingRef = useRef();

  const timeSlots = [
    "9:45 am", "10:00 am", "10:15 am", "10:30 am", "10:45 am", "11:00 am",
    "11:15 am", "11:30 am", "11:45 am", "12:00 pm", "12:15 pm", "12:30 pm",
    "12:45 pm", "1:00 pm",
  ];

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

  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setHeaderTitle('Select time');
        } else {
          setHeaderTitle('');
        }
      },
      { threshold: 0 }
    );
    if (headingRef.current) observer.observe(headingRef.current);
    return () => observer.disconnect();
  }, [setHeaderTitle]);

  return (
    <div className="time-selector">
      <h1 ref={headingRef} className="header-title">Select time</h1>

      {/* Profile Section */}
      <div className="profile-section">
        <div className="profile-info" onClick={() => setShowPopup(!showPopup)}>
          <div className="avatar"><span>I</span></div>
          <span className="username">Icha</span>
          <ChevronLeft className="dropdown-icon" />
        </div>

        <div className="calendar-picker-wrapper">
          <button className="calendar-btn" onClick={() => setCalendarOpen(!calendarOpen)}>
            <Calendar className="calendar-icon" />
          </button>

          {calendarOpen && (
            <div className="calendar-popup">
              <div className="calendar-header">
                <button onClick={() => changeMonth(-1)} className="cal-arrow"><ChevronLeft /></button>
                <span>
                  {selectedDate.toLocaleString("default", { month: "long" })} {selectedDate.getFullYear()}
                </span>
                <button onClick={() => changeMonth(1)} className="cal-arrow"><ChevronRight /></button>
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

      {/* Popup for Icha */}
      {showPopup && (
  <div className="profile-popup">
    <div className="popup-content" ref={popupRef}>
      <div className="popup-scroll-view">
        {/* Scrollable area */}
        <Professionals />
      </div>
      <button className="popup-close-btn" onClick={() => setShowPopup(false)}>Close</button>
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
        {timeSlots.map((time, index) => (
          <button
            key={index}
            onClick={() => setSelectedTime(time)}
            className={`time-slot ${selectedTime === time ? "time-slot-selected" : ""}`}
          >
            <span className="time-text">{time}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Time;

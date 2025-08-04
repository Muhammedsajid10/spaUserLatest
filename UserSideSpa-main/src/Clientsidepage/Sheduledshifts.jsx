import React, { useState, useEffect } from 'react';
import './Sheduledshifts.css';

const ShiftScheduler = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showOptions, setShowOptions] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showShiftEditor, setShowShiftEditor] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [editingShift, setEditingShift] = useState({
    memberId: null,
    memberName: '',
    day: null,
    dateKey: '',
    currentShift: '',
    newShift: ''
  });

  // Sample team members data with dynamic shifts
  const [teamMembers, setTeamMembers] = useState([
    {
      id: 1,
      name: 'margirita',
      avatar: 'M',
      avatarColor: '#E8D5FF',
      shifts: {} // Will be populated dynamically
    },
    {
      id: 2,
      name: 'Icha Faradisa',
      avatar: 'I',
      avatarColor: '#E8F4FD',
      shifts: {}
    },
    {
      id: 3,
      name: 'Nining Niken',
      avatar: 'N',
      avatarColor: '#FFF4E6',
      shifts: {}
    },
    {
      id: 4,
      name: 'Onni',
      avatar: 'O',
      avatarColor: '#F0F0F0',
      shifts: {}
    }
  ]);

  // Get start of week (Sunday)
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  // Get week days array
  const getWeekDays = (startDate) => {
    const days = [];
    const weekStart = getWeekStart(startDate);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Format date for display
  const formatDateHeader = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Format week range for display
  const formatWeekRange = (startDate) => {
    const weekStart = getWeekStart(startDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${startDay} - ${endDay} ${months[weekStart.getMonth()]}, ${weekStart.getFullYear()}`;
    } else {
      return `${startDay} ${months[weekStart.getMonth()]} - ${endDay} ${months[weekEnd.getMonth()]}, ${weekStart.getFullYear()}`;
    }
  };

  // Calculate total hours for a member in a week
  const calculateWeekHours = (member, weekDays) => {
    let totalMinutes = 0;
    
    weekDays.forEach(day => {
      const dateKey = formatDateHeader(day);
      const shift = member.shifts[dateKey];
      
      if (shift && shift.includes('-')) {
        const [startTime, endTime] = shift.split(' - ');
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        
        if (endMinutes > startMinutes) {
          totalMinutes += endMinutes - startMinutes;
        } else {
          // Handle overnight shifts
          totalMinutes += (24 * 60 - startMinutes) + endMinutes;
        }
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  };

  // Calculate daily hours for a specific day
  const calculateDayHours = (day, allMembers) => {
    let totalMinutes = 0;
    const dateKey = formatDateHeader(day);
    
    allMembers.forEach(member => {
      const shift = member.shifts[dateKey];
      if (shift && shift.includes('-')) {
        const [startTime, endTime] = shift.split(' - ');
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        
        if (endMinutes > startMinutes) {
          totalMinutes += endMinutes - startMinutes;
        } else {
          totalMinutes += (24 * 60 - startMinutes) + endMinutes;
        }
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  };

  // Convert time string to minutes
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Generate sample shifts for a member
  const generateSampleShifts = (memberId, weekDays) => {
    const shifts = {};
    const shiftPatterns = [
      ['00:00', '23:59'], // Full day
      ['02:00', '14:00'], // Morning shift
      ['12:00', '23:55'], // Afternoon/evening shift
      ['08:00', '16:00'], // Standard day shift
      ['16:00', '00:00'], // Night shift
    ];
    
    weekDays.forEach((day, index) => {
      const dateKey = formatDateHeader(day);
      const patternIndex = (memberId + index) % shiftPatterns.length;
      
      if (Math.random() > 0.1) { // 90% chance of having a shift
        const pattern = shiftPatterns[patternIndex];
        shifts[dateKey] = `${pattern[0]} - ${pattern[1]}`;
      }
    });
    
    return shifts;
  };

  // Update shifts when date changes
  useEffect(() => {
    const weekDays = getWeekDays(currentDate);
    const updatedMembers = teamMembers.map(member => ({
      ...member,
      shifts: generateSampleShifts(member.id, weekDays)
    }));
    setTeamMembers(updatedMembers);
  }, [currentDate]);

  const currentWeekDays = getWeekDays(currentDate);

  const handlePrevWeek = () => {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentDate(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentDate(nextWeek);
  };

  const handleDateSelect = (year, month, day) => {
    const newDate = new Date(year, month, day);
    setCurrentDate(newDate);
    setShowDatePicker(false);
  };

  const handleShiftClick = (memberId, day, currentShift) => {
    const member = teamMembers.find(m => m.id === memberId);
    const dateKey = formatDateHeader(day);
    
    setEditingShift({
      memberId,
      memberName: member.name,
      day,
      dateKey,
      currentShift: currentShift || '',
      newShift: currentShift || '09:00 - 17:00'
    });
    setShowShiftEditor(true);
  };

  const handleSaveShift = () => {
    setTeamMembers(prevMembers => 
      prevMembers.map(member => 
        member.id === editingShift.memberId 
          ? {
              ...member,
              shifts: {
                ...member.shifts,
                [editingShift.dateKey]: editingShift.newShift || undefined
              }
            }
          : member
      )
    );
    setShowShiftEditor(false);
  };

  const handleDeleteShift = () => {
    setTeamMembers(prevMembers => 
      prevMembers.map(member => 
        member.id === editingShift.memberId 
          ? {
              ...member,
              shifts: {
                ...member.shifts,
                [editingShift.dateKey]: undefined
              }
            }
          : member
      )
    );
    setShowShiftEditor(false);
  };

  const handleCancelShift = () => {
    setShowShiftEditor(false);
  };

  const handleEditMember = (memberId) => {
    console.log(`Edit member ${memberId}`);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const weekStart = getWeekStart(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return today >= weekStart && today <= weekEnd;
  };

  // Generate years for date picker
  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear - 10; year <= currentYear + 10; year++) {
      years.push(year);
    }
    return years;
  };

  // Generate days for date picker
  const generateDaysInMonth = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="shift-scheduler">
      <div className="scheduler-header">
        <h1 className="scheduler-title">Scheduled shifts</h1>
        <div className="header-controls">
          <div className="dropdown-container">
            <button 
              className="options-btn"
              onClick={() => setShowOptions(!showOptions)}
            >
              Options
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showOptions && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={goToToday}>Go to Today</div>
                <div className="dropdown-item" onClick={() => setShowDatePicker(true)}>Select Date</div>
                <div className="dropdown-item">Export Schedule</div>
                <div className="dropdown-item">Print Schedule</div>
                <div className="dropdown-item">Settings</div>
              </div>
            )}
          </div>
          
          <div className="dropdown-container">
            <button 
              className="add-btn"
              onClick={() => setShowAdd(!showAdd)}
            >
              Add
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showAdd && (
              <div className="dropdown-menu">
                <div className="dropdown-item">Add Team Member</div>
                <div className="dropdown-item">Add Shift</div>
                <div className="dropdown-item">Import Schedule</div>
                <div className="dropdown-item">Bulk Edit</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shift Editor Modal */}
      {showShiftEditor && (
        <div className="modal-overlay" onClick={handleCancelShift}>
          <div className="shift-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Shift</h3>
              <button className="close-btn" onClick={handleCancelShift}>×</button>
            </div>
            <div className="modal-content">
              <div className="shift-info">
                <div className="shift-member">
                  <strong>{editingShift.memberName}</strong>
                </div>
                <div className="shift-date">
                  {formatDateHeader(editingShift.day)}
                </div>
              </div>
              
              <div className="shift-input-group">
                <label>Shift Time:</label>
                <input
                  type="text"
                  value={editingShift.newShift}
                  onChange={(e) => setEditingShift(prev => ({ ...prev, newShift: e.target.value }))}
                  placeholder="e.g., 09:00 - 17:00"
                  className="shift-input"
                />
                <div className="shift-examples">
                  <span>Examples: 09:00 - 17:00, 14:00 - 22:00, 00:00 - 08:00</span>
                </div>
              </div>

              <div className="quick-shifts">
                <label>Quick Select:</label>
                <div className="quick-shift-buttons">
                  <button 
                    className="quick-btn"
                    onClick={() => setEditingShift(prev => ({ ...prev, newShift: '09:00 - 17:00' }))}
                  >
                    Day Shift
                  </button>
                  <button 
                    className="quick-btn"
                    onClick={() => setEditingShift(prev => ({ ...prev, newShift: '14:00 - 22:00' }))}
                  >
                    Evening Shift
                  </button>
                  <button 
                    className="quick-btn"
                    onClick={() => setEditingShift(prev => ({ ...prev, newShift: '22:00 - 06:00' }))}
                  >
                    Night Shift
                  </button>
                  <button 
                    className="quick-btn"
                    onClick={() => setEditingShift(prev => ({ ...prev, newShift: '00:00 - 23:59' }))}
                  >
                    Full Day
                  </button>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="delete-btn" onClick={handleDeleteShift}>
                Delete Shift
              </button>
              <div className="action-buttons">
                <button className="cancel-btn" onClick={handleCancelShift}>
                  Cancel
                </button>
                <button className="save-btn" onClick={handleSaveShift}>
                  Save Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="date-picker-overlay" onClick={() => setShowDatePicker(false)}>
          <div className="date-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="date-picker-header">
              <h3>Select Date</h3>
              <button className="close-btn" onClick={() => setShowDatePicker(false)}>×</button>
            </div>
            <div className="date-picker-content">
              <div className="date-picker-selects">
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="date-select"
                >
                  {generateYears().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="date-select"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
              </div>
              <div className="date-picker-days">
                {generateDaysInMonth(selectedYear, selectedMonth).map(day => (
                  <button
                    key={day}
                    className="day-btn"
                    onClick={() => handleDateSelect(selectedYear, selectedMonth, day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="week-navigation">
        <button className="nav-btn" onClick={handlePrevWeek}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <div className="week-info">
          <span className="week-label">{isCurrentWeek() ? 'This week' : 'Week of'}</span>
          <span className="week-date">{formatWeekRange(currentDate)}</span>
        </div>
        
        <button className="nav-btn" onClick={handleNextWeek}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="schedule-container">
        <div className="schedule-table">
          <div className="table-header">
            <div className="member-column-header">
              <span className="member-title">Team member</span>
              <span className="change-link">Change</span>
            </div>
            {currentWeekDays.map((day) => (
              <div key={day.getTime()} className="day-header">
                <div className="day-name">{formatDateHeader(day)}</div>
                <div className="day-hours">{calculateDayHours(day, teamMembers)}</div>
              </div>
            ))}
          </div>

          <div className="table-body">
            {teamMembers.map((member) => (
              <div key={member.id} className="member-row">
                <div className="member-info">
                  <div className="member-avatar" style={{ backgroundColor: member.avatarColor }}>
                    {member.avatar.startsWith('/') ? (
                      <img src={member.avatar} alt={member.name} />
                    ) : (
                      <span>{member.avatar}</span>
                    )}
                  </div>
                  <div className="member-details">
                    <div className="member-name">{member.name}</div>
                    <div className="member-hours">{calculateWeekHours(member, currentWeekDays)}</div>
                  </div>
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditMember(member.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                
                {currentWeekDays.map((day) => {
                  const dateKey = formatDateHeader(day);
                  const shift = member.shifts[dateKey];
                  return (
                    <div key={day.getTime()} className="shift-cell">
                      {shift && (
                        <div 
                          className="shift-block"
                          onClick={() => handleShiftClick(member.id, day, shift)}
                          title="Click to edit shift"
                        >
                          {shift}
                        </div>
                      )}
                      {!shift && (
                        <div 
                          className="shift-block shift-empty"
                          onClick={() => handleShiftClick(member.id, day, '')}
                          title="Click to add shift"
                        >
                          +
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftScheduler;
# Current Booking Workflow Logic - Detailed Example

## Scenario Setup
Let's say we have:
- **Employee**: Sarah (ID: "emp_sarah_123")
- **Selected Date**: September 6, 2025 (Today)
- **Selected Service**: Haircut (Duration: 60 minutes)
- **Employee's Schedule**: 9:00 AM - 6:00 PM (configured in admin)
- **Existing Bookings**: Sarah has 2 existing appointments today

## Step-by-Step Workflow

### Step 1: Fetch All Booking Data
**Function Called**: `fetchDateData(selectedDate)`

```javascript
// API Call
const resp = await bookingsAPI.getTotalBookingsFromAdminSide("2025-09-06");
```

**Raw API Response** (All bookings from database):
```json
{
  "bookings": [
    {
      "_id": "booking_001",
      "appointmentDate": "2025-09-06T00:00:00.000Z",
      "services": [
        {
          "_id": "service_001",
          "startTime": "10:00",
          "endTime": "11:00", 
          "duration": 60,
          "employee": { "_id": "emp_sarah_123", "name": "Sarah" },
          "service": { "name": "Haircut" }
        }
      ]
    },
    {
      "_id": "booking_002", 
      "appointmentDate": "2025-09-06T00:00:00.000Z",
      "services": [
        {
          "_id": "service_002",
          "startTime": "14:30",
          "endTime": "15:30",
          "duration": 60, 
          "employee": { "_id": "emp_sarah_123", "name": "Sarah" },
          "service": { "name": "Facial" }
        }
      ]
    },
    {
      "_id": "booking_003",
      "appointmentDate": "2025-09-07T00:00:00.000Z", 
      "services": [
        {
          "_id": "service_003",
          "startTime": "09:00",
          "endTime": "10:00",
          "duration": 60,
          "employee": { "_id": "emp_john_456", "name": "John" },
          "service": { "name": "Massage" }
        }
      ]
    }
  ]
}
```

### Step 2: Filter by Selected Date
**Logic**: Filter bookings where `appointmentDate` matches selected date

```javascript
const selectedDateKey = "2025-09-06"; // localDateKey(date)
const dateFilteredBookings = allBookings.filter(booking => {
  const bookingDateKey = localDateKey(new Date(booking.appointmentDate));
  return bookingDateKey === selectedDateKey;
});
```

**Result after date filtering**:
```json
[
  {
    "_id": "booking_001",
    "appointmentDate": "2025-09-06T00:00:00.000Z",
    "services": [/* Sarah's 10:00-11:00 Haircut */]
  },
  {
    "_id": "booking_002",
    "appointmentDate": "2025-09-06T00:00:00.000Z", 
    "services": [/* Sarah's 14:30-15:30 Facial */]
  }
  // booking_003 removed (different date)
]
```

### Step 3: Filter by Selected Employee & Extract Services
**Logic**: Since we selected Sarah specifically, filter by her employee ID

```javascript
const selectedEmployeeId = "emp_sarah_123";
let relevantServiceBookings = [];

dateFilteredBookings.forEach(booking => {
  booking.services.forEach(service => {
    const serviceEmployeeId = service.employee._id;
    if (String(serviceEmployeeId) === String(selectedEmployeeId)) {
      relevantServiceBookings.push({
        _id: service._id,
        employeeId: serviceEmployeeId,
        startTime: service.startTime,
        endTime: service.endTime,
        duration: service.duration,
        serviceName: service.service.name
      });
    }
  });
});
```

**Result after employee filtering**:
```json
[
  {
    "_id": "service_001",
    "employeeId": "emp_sarah_123",
    "startTime": "10:00",
    "endTime": "11:00",
    "duration": 60,
    "serviceName": "Haircut"
  },
  {
    "_id": "service_002", 
    "employeeId": "emp_sarah_123",
    "startTime": "14:30",
    "endTime": "15:30",
    "duration": 60,
    "serviceName": "Facial"
  }
]
```

### Step 4: Build appointmentsIndex
**Logic**: Organize bookings by employee and date for fast lookup

```javascript
const appointmentsIndex = {};
appointmentsIndex["emp_sarah_123"] = {};
appointmentsIndex["emp_sarah_123"]["2025-09-06"] = {
  "service_001": {
    startTime: "10:00",
    endTime: "11:00", 
    duration: 60,
    serviceName: "Haircut"
  },
  "service_002": {
    startTime: "14:30",
    endTime: "15:30",
    duration: 60, 
    serviceName: "Facial"
  }
};
```

### Step 5: Fetch Employee Schedule Template
**API Call**: Get Sarah's configured working hours and theoretical time slots

```javascript
const response = await bookingsAPI.getEmployeeSchedule("emp_sarah_123", "2025-09-06");
```

**Schedule API Response**:
```json
{
  "scheduledShifts": [
    {
      "startTime": "09:00",
      "endTime": "18:00"
    }
  ],
  "availableTimeSlots": [
    { "time": "09:00", "startTime": "09:00", "endTime": "10:00" },
    { "time": "09:15", "startTime": "09:15", "endTime": "10:15" },
    { "time": "09:30", "startTime": "09:30", "endTime": "10:30" },
    { "time": "09:45", "startTime": "09:45", "endTime": "10:45" },
    { "time": "10:00", "startTime": "10:00", "endTime": "11:00" }, // CONFLICT!
    { "time": "10:15", "startTime": "10:15", "endTime": "11:15" }, // CONFLICT!
    { "time": "10:30", "startTime": "10:30", "endTime": "11:30" }, // CONFLICT!
    { "time": "10:45", "startTime": "10:45", "endTime": "11:45" }, // CONFLICT!
    { "time": "11:00", "startTime": "11:00", "endTime": "12:00" },
    // ... more slots until 17:00
    { "time": "14:00", "startTime": "14:00", "endTime": "15:00" }, // CONFLICT!
    { "time": "14:15", "startTime": "14:15", "endTime": "15:15" }, // CONFLICT!
    { "time": "14:30", "startTime": "14:30", "endTime": "15:30" }, // CONFLICT!
    { "time": "14:45", "startTime": "14:45", "endTime": "15:45" }, // CONFLICT!
    { "time": "15:00", "startTime": "15:00", "endTime": "16:00" },
    { "time": "15:15", "startTime": "15:15", "endTime": "16:15" },
    // ... more slots until 17:00
  ]
}
```

### Step 6: Apply Booking Conflict Filtering (NEW LOGIC!)
**Logic**: Remove schedule slots that conflict with existing bookings

```javascript
const employeeBookings = appointmentsIndex["emp_sarah_123"]["2025-09-06"];
const filteredSlots = rawScheduleSlots.filter(slot => {
  const slotStartTime = slot.time; // e.g., "10:15"
  const slotEndTime = slot.endTime; // e.g., "11:15"
  
  // Check each existing booking for overlap
  const hasConflict = Object.values(employeeBookings).some(booking => {
    const bookingStart = booking.startTime; // e.g., "10:00"
    const bookingEnd = booking.endTime;     // e.g., "11:00"
    
    // Overlap check: slot overlaps with booking if:
    // slotStart < bookingEnd AND slotEnd > bookingStart
    return (slotStartTime < bookingEnd && slotEndTime > bookingStart);
  });
  
  return !hasConflict;
});
```

### Step 7: Conflict Detection Examples

**Example 1**: Slot 10:15-11:15 vs Booking 10:00-11:00
```javascript
slotStartTime = "10:15"
slotEndTime = "11:15" 
bookingStart = "10:00"
bookingEnd = "11:00"

// Check overlap: 
// "10:15" < "11:00" AND "11:15" > "10:00"
// true AND true = CONFLICT! ❌
```

**Example 2**: Slot 11:00-12:00 vs Booking 10:00-11:00  
```javascript
slotStartTime = "11:00"
slotEndTime = "12:00"
bookingStart = "10:00" 
bookingEnd = "11:00"

// Check overlap:
// "11:00" < "11:00" AND "12:00" > "10:00"
// false AND true = NO CONFLICT! ✅
```

**Example 3**: Slot 14:15-15:15 vs Booking 14:30-15:30
```javascript
slotStartTime = "14:15"
slotEndTime = "15:15"
bookingStart = "14:30"
bookingEnd = "15:30"

// Check overlap:
// "14:15" < "15:30" AND "15:15" > "14:30" 
// true AND true = CONFLICT! ❌
```

### Step 8: Final Available Slots

**Before Filtering**: 32 theoretical time slots from 9:00 AM - 5:00 PM
**After Filtering**: 24 available time slots (8 removed due to conflicts)

**Removed Conflicting Slots**:
- ❌ 10:00-11:00 (conflicts with Haircut booking)
- ❌ 10:15-11:15 (conflicts with Haircut booking) 
- ❌ 10:30-11:30 (conflicts with Haircut booking)
- ❌ 10:45-11:45 (conflicts with Haircut booking)
- ❌ 14:00-15:00 (conflicts with Facial booking)
- ❌ 14:15-15:15 (conflicts with Facial booking)
- ❌ 14:30-15:30 (conflicts with Facial booking) 
- ❌ 14:45-15:45 (conflicts with Facial booking)

**Available Time Slots Shown to User**:
```
✅ 9:00 AM   ✅ 11:00 AM  ✅ 12:00 PM  ✅ 3:00 PM
✅ 9:15 AM   ✅ 11:15 AM  ✅ 12:15 PM  ✅ 3:15 PM  
✅ 9:30 AM   ✅ 11:30 AM  ✅ 12:30 PM  ✅ 3:30 PM
✅ 9:45 AM   ✅ 11:45 AM  ✅ 12:45 PM  ✅ 3:45 PM
                         ✅ 1:00 PM   ✅ 4:00 PM
                         ✅ 1:15 PM   ✅ 4:15 PM
                         ✅ 1:30 PM   ✅ 4:30 PM  
                         ✅ 1:45 PM   ✅ 4:45 PM
                         ✅ 2:00 PM   ✅ 5:00 PM
                         ✅ 2:15 PM   
                         ✅ 2:30 PM   
                         ✅ 2:45 PM   
```

## Console Log Output Example

```
[Time] WORKFLOW FIX - Filtering schedule slots against bookings:
  employeeId: "emp_sarah_123"
  dateKey: "2025-09-06"  
  rawScheduleSlots: 32
  employeeBookings: 2
  bookingTimes: ["10:00-11:00", "14:30-15:30"]

[Time] CONFLICT DETECTED - Removing slot:
  slotTime: "10:00-11:00"
  conflictsWith: "10:00-11:00"
  bookingService: "Haircut"

[Time] CONFLICT DETECTED - Removing slot:
  slotTime: "10:15-11:15" 
  conflictsWith: "10:00-11:00"
  bookingService: "Haircut"

[Time] CONFLICT DETECTED - Removing slot:
  slotTime: "14:30-15:30"
  conflictsWith: "14:30-15:30" 
  bookingService: "Facial"

[Time] WORKFLOW RESULT - Schedule slots after booking filter:
  beforeFilter: 32
  afterFilter: 24
  removedConflicts: 8
```

## Key Benefits of This Logic

1. **Prevents Double Booking**: Impossible to book overlapping times
2. **Real-time Accuracy**: Always reflects current booking state  
3. **Efficient Filtering**: Uses optimized overlap detection algorithm
4. **Comprehensive Logging**: Easy to debug conflicts and validate logic
5. **Fallback Safety**: Still works if admin schedule API fails

This workflow ensures that customers can only book available time slots that don't conflict with existing appointments! 🎯

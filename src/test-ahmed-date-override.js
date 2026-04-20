// Test Ahmed's actual database structure with specific date override

const ahmed = {
  _id: "68b692857d727a2aee495f53",
  user: {
    firstName: "Ahmed",
    lastName: "Al-Rashid"
  },
  workSchedule: {
    // Regular weekly schedule
    monday: {
      isWorking: true,
      startTime: "09:00",
      endTime: "17:00",
      shifts: null,
      shiftsData: [],
      shiftCount: 0
    },
    tuesday: {
      isWorking: true,
      startTime: "09:00", 
      endTime: "17:00",
      shifts: null,
      shiftsData: [],
      shiftCount: 0
    },
    wednesday: {
      isWorking: true,
      startTime: "09:00",
      endTime: "17:00", 
      shifts: null,
      shiftsData: [],
      shiftCount: 0
    },
    thursday: {
      isWorking: true,
      startTime: "09:00",
      endTime: "17:00",
      shifts: null,
      shiftsData: [],
      shiftCount: 0
    },
    friday: {
      isWorking: true,
      startTime: "09:00",
      endTime: "17:00",
      shifts: null,
      shiftsData: [],
      shiftCount: 0
    },
    saturday: {
      isWorking: false,
      startTime: "00:00",
      endTime: "23:59",
      shifts: null,
      shiftsData: [],
      shiftCount: 0
    },
    sunday: {
      isWorking: false,
      startTime: "00:00", 
      endTime: "23:59",
      shifts: null,
      shiftsData: [],
      shiftCount: 0
    },
    // Specific date override
    "2025-09-04": {
      isWorking: true,
      startTime: "01:15",
      endTime: "20:15",
      shifts: "01:15 - 20:15",
      shiftsData: [
        {
          startTime: "01:15",
          endTime: "20:15",
          _id: "68b70096f2017029fb120967"
        }
      ],
      shiftCount: 1,
      _id: "68b70096f2017029fb120966"
    }
  }
};

// Helper function for date key
function localDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Test our enhanced getEmployeeShiftHours function
function getEmployeeShiftHours(employee, date) {
  if (!employee || !employee.workSchedule) return [];
  
  const schedule = employee.workSchedule;
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayIndex = date.getDay();
  const dayKey = dayNames[dayIndex];
  
  let dayEntry = null;
  
  if (typeof schedule === 'object' && !Array.isArray(schedule)) {
    // PRIORITY 1: Check for specific date override (YYYY-MM-DD format)
    const dateStr = localDateKey(date);
    dayEntry = schedule[dateStr];
    
    if (!dayEntry) {
      // PRIORITY 2: Check regular day names
      dayEntry = schedule[dayKey];
    }
    
    console.log('Schedule lookup for', dayKey, dateStr, {
      hasSpecificDate: !!schedule[dateStr],
      hasDayName: !!schedule[dayKey],
      usingEntry: dayEntry ? (schedule[dateStr] ? 'specific-date' : 'day-name') : 'none'
    });
  }
  
  if (!dayEntry || !dayEntry.isWorking) return [];
  
  // Handle shiftsData array (admin format) - PRIORITY 1
  if (Array.isArray(dayEntry.shiftsData) && dayEntry.shiftsData.length) {
    console.log('Found shiftsData array for', dayKey, dayEntry.shiftsData);
    return dayEntry.shiftsData.map(s => ({
      start: s.startTime,
      end: s.endTime
    }));
  }
  
  // Handle dash-separated shifts string - PRIORITY 2 
  if (typeof dayEntry.shifts === 'string' && dayEntry.shifts.includes(' - ')) {
    console.log('Found dash-separated shifts for', dayKey, dayEntry.shifts);
    const parts = dayEntry.shifts.split(' - ').map(s => s.trim());
    if (parts.length === 2) {
      return [{ start: parts[0], end: parts[1] }];
    }
  }
  
  // Handle single shift (startTime/endTime) - PRIORITY 3
  return [{ start: dayEntry.startTime, end: dayEntry.endTime }];
}

console.log('=== TESTING AHMED AL-RASHID WITH SPECIFIC DATE OVERRIDE ===');

// Test regular Thursday (should use day name - 09:00-17:00)
const regularThursday = new Date('2025-09-05'); // Different Thursday
console.log('\n--- Regular Thursday (2025-09-05) ---');
const regularShifts = getEmployeeShiftHours(ahmed, regularThursday);
console.log('Shifts:', regularShifts);

// Test specific date Thursday (should use specific date - 01:15-20:15)
const specificThursday = new Date('2025-09-04'); // The specific date with override
console.log('\n--- Specific Thursday (2025-09-04) ---');
const specificShifts = getEmployeeShiftHours(ahmed, specificThursday);
console.log('Shifts:', specificShifts);

// Validation
console.log('\n=== VALIDATION ===');
if (regularShifts.length === 1 && regularShifts[0].start === "09:00" && regularShifts[0].end === "17:00") {
  console.log('✅ Regular Thursday: Correctly using day name (09:00-17:00)');
} else {
  console.log('❌ Regular Thursday failed:', regularShifts);
}

if (specificShifts.length === 1 && specificShifts[0].start === "01:15" && specificShifts[0].end === "20:15") {
  console.log('✅ Specific Thursday: Correctly using date override (01:15-20:15)');
} else {
  console.log('❌ Specific Thursday failed:', specificShifts);
}

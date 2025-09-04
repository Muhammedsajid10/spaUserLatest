// Test: Create employees with 24-hour shifts to verify the system works

const testEmployee24Hour = {
  user: {
    firstName: "Alex",
    lastName: "24Hour",
    email: "alex24@test.com"
  },
  workSchedule: {
    monday: {
      isWorking: true,
      startTime: "00:00",
      endTime: "23:59",
      shifts: "00:00,08:00,08:00,16:00,16:00,23:59", // 3 shifts: midnight-8am, 8am-4pm, 4pm-midnight
      shiftCount: 3
    },
    tuesday: {
      isWorking: true, 
      startTime: "00:00",
      endTime: "23:59",
      shifts: "00:00,12:00,12:00,23:59", // 2 shifts: midnight-noon, noon-midnight
      shiftCount: 2
    },
    wednesday: {
      isWorking: true,
      startTime: "00:00", 
      endTime: "23:59",
      shifts: null,
      shiftCount: 1 // Single 24-hour shift
    },
    thursday: {
      isWorking: true,
      startTime: "00:00",
      endTime: "23:59", 
      shifts: null,
      shiftCount: 1
    },
    friday: {
      isWorking: true,
      startTime: "00:00",
      endTime: "23:59",
      shifts: null, 
      shiftCount: 1
    },
    saturday: {
      isWorking: true,
      startTime: "00:00",
      endTime: "23:59",
      shifts: "00:00,06:00,06:00,18:00,18:00,23:59", // 3 shifts covering 24 hours
      shiftCount: 3
    },
    sunday: {
      isWorking: true,
      startTime: "00:00", 
      endTime: "23:59",
      shifts: null,
      shiftCount: 1
    }
  }
};

console.log('24-Hour Employee Example:');
console.log(JSON.stringify(testEmployee24Hour, null, 2));

// Test our enhanced getEmployeeShiftHours function
console.log('\n=== TESTING ENHANCED SHIFT PARSING ===');

// Import the enhanced function (simulate the logic)
function getEmployeeShiftHours(employee, date) {
  if (!employee || !employee.workSchedule) return [];
  
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayIndex = date.getDay();
  const dayKey = dayNames[dayIndex];
  
  const dayEntry = employee.workSchedule[dayKey];
  if (!dayEntry || !dayEntry.isWorking) return [];
  
  // Handle comma-separated shifts (admin format)
  if (typeof dayEntry.shifts === 'string' && dayEntry.shifts.includes(',')) {
    const shiftPairs = dayEntry.shifts.split(',').map(s => s.trim());
    const shifts = [];
    for (let i = 0; i < shiftPairs.length; i += 2) {
      if (shiftPairs[i] && shiftPairs[i + 1]) {
        shifts.push({ start: shiftPairs[i], end: shiftPairs[i + 1] });
      }
    }
    return shifts;
  }
  
  // Single shift
  return [{ start: dayEntry.startTime, end: dayEntry.endTime }];
}

// Test different days
const testDates = [
  new Date('2025-09-01'), // Monday
  new Date('2025-09-02'), // Tuesday  
  new Date('2025-09-03'), // Wednesday
  new Date('2025-09-06'), // Saturday
];

testDates.forEach(date => {
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()];
  const shifts = getEmployeeShiftHours(testEmployee24Hour, date);
  console.log(`${dayName}: ${shifts.map(s => `${s.start}-${s.end}`).join(', ')}`);
});

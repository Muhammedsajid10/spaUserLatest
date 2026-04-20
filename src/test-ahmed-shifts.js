// Test Ahmed Al-Rashid's specific shift parsing case

// Simulate Ahmed's workSchedule data
const ahmed = {
  _id: "68b692857d727a2aee495f53",
  user: {
    firstName: "Ahmed",
    lastName: "Al-Rashid"
  },
  workSchedule: {
    thursday: {
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
      shiftCount: 1
    }
  }
};

// Test our enhanced getEmployeeShiftHours function
function getEmployeeShiftHours(employee, date) {
  if (!employee || !employee.workSchedule) return [];
  
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayIndex = date.getDay();
  const dayKey = dayNames[dayIndex];
  
  const dayEntry = employee.workSchedule[dayKey];
  if (!dayEntry || !dayEntry.isWorking) return [];
  
  // Handle shiftsData array (admin format) - PRIORITY 1
  if (Array.isArray(dayEntry.shiftsData) && dayEntry.shiftsData.length) {
    console.log('Found shiftsData array for', dayKey, dayEntry.shiftsData);
    return dayEntry.shiftsData.map(s => {
      const start = s.startTime || s.start || s.from || s.open;
      const end = s.endTime || s.end || s.to || s.close;
      return { start, end };
    });
  }
  
  // Handle dash-separated shifts string (admin format) - PRIORITY 2 
  if (typeof dayEntry.shifts === 'string' && dayEntry.shifts.includes(' - ')) {
    console.log('Found dash-separated shifts for', dayKey, dayEntry.shifts);
    const parts = dayEntry.shifts.split(' - ').map(s => s.trim());
    if (parts.length === 2) {
      return [{ start: parts[0], end: parts[1] }];
    }
  }
  
  // Handle comma-separated shifts string (admin format) - PRIORITY 3
  if (typeof dayEntry.shifts === 'string' && dayEntry.shifts.includes(',')) {
    console.log('Found comma-separated shifts for', dayKey, dayEntry.shifts);
    const shiftPairs = dayEntry.shifts.split(',').map(s => s.trim());
    const shifts = [];
    for (let i = 0; i < shiftPairs.length; i += 2) {
      if (shiftPairs[i] && shiftPairs[i + 1]) {
        shifts.push({ start: shiftPairs[i], end: shiftPairs[i + 1] });
      }
    }
    return shifts;
  }
  
  // Handle single shift (startTime/endTime) - PRIORITY 4
  return [{ start: dayEntry.startTime, end: dayEntry.endTime }];
}

// Test parsing for Thursday (September 4, 2025 is a Thursday)
const thursday = new Date('2025-09-04'); // Thursday
console.log('=== TESTING AHMED AL-RASHID SHIFT PARSING ===');
console.log('Date:', thursday.toDateString());
console.log('Day of week:', ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][thursday.getDay()]);

const shifts = getEmployeeShiftHours(ahmed, thursday);
console.log('Parsed shifts:', shifts);

// Expected result: [{ start: "01:15", end: "20:15" }]
if (shifts.length === 1 && shifts[0].start === "01:15" && shifts[0].end === "20:15") {
  console.log('✅ SUCCESS: Correctly parsed Ahmed\'s shift 01:15 - 20:15');
} else {
  console.log('❌ FAILURE: Expected [{ start: "01:15", end: "20:15" }], got:', shifts);
}

// Test time slot generation
function generateTimeSlotsPreview(shifts) {
  const slots = [];
  shifts.forEach(shift => {
    // Convert time to minutes
    const [startH, startM] = shift.start.split(':').map(Number);
    const [endH, endM] = shift.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    // Generate 15-minute intervals
    for (let min = startMinutes; min < endMinutes; min += 15) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slots.push(timeStr);
    }
  });
  return slots;
}

const timeSlots = generateTimeSlotsPreview(shifts);
console.log('\n=== GENERATED TIME SLOTS ===');
console.log(`Total slots: ${timeSlots.length}`);
console.log('First 10:', timeSlots.slice(0, 10));
console.log('Last 10:', timeSlots.slice(-10));
console.log('Should start at 01:15:', timeSlots[0]);
console.log('Should end before 20:15:', timeSlots[timeSlots.length - 1]);

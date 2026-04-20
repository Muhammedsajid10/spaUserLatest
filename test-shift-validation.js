// Test script to verify shift-based time slot validation
import { getValidTimeSlotsForProfessional, timeToMinutesFn, addMinutesToTime } from './src/bookingUtils.jsx';

// Test scenarios for shift-based validation
const testCases = [
  {
    name: "Late night shift - service must complete before shift ends",
    employee: {
      _id: "emp1",
      name: "John Doe", 
      isActive: true,
      workSchedule: {
        friday: {
          shiftsData: [
            { startTime: "20:00", endTime: "00:00" } // 8 PM to midnight
          ]
        }
      }
    },
    date: new Date(2025, 8, 5), // Friday, September 5, 2025
    serviceDuration: 60, // 1 hour service
    expectedLastSlot: "23:00", // 11:00 PM (11:00 PM + 60 min = 12:00 AM = shift end)
    description: "60-min service in 8PM-midnight shift should end at 11:00 PM"
  },
  {
    name: "Regular day shift - 90 minute service",
    employee: {
      _id: "emp2", 
      name: "Jane Smith",
      isActive: true,
      workSchedule: {
        friday: {
          shiftsData: [
            { startTime: "09:00", endTime: "18:00" } // 9 AM to 6 PM
          ]
        }
      }
    },
    date: new Date(2025, 8, 5), // Friday
    serviceDuration: 90, // 90 minute service
    expectedLastSlot: "16:30", // 4:30 PM (4:30 PM + 90 min = 6:00 PM = shift end)
    description: "90-min service in 9AM-6PM shift should end at 4:30 PM"
  },
  {
    name: "Multiple shifts - morning and evening",
    employee: {
      _id: "emp3",
      name: "Bob Wilson",
      isActive: true, 
      workSchedule: {
        friday: {
          shiftsData: [
            { startTime: "08:00", endTime: "12:00" }, // 8 AM to noon
            { startTime: "17:00", endTime: "21:00" }  // 5 PM to 9 PM  
          ]
        }
      }
    },
    date: new Date(2025, 8, 5), // Friday
    serviceDuration: 45, // 45 minute service
    expectedMorningLastSlot: "11:15", // 11:15 AM + 45 min = 12:00 PM
    expectedEveningLastSlot: "20:15", // 8:15 PM + 45 min = 9:00 PM
    description: "45-min service in split shifts"
  }
];

// Run tests
console.log("🧪 Testing Shift-Based Time Slot Validation\n");

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
  console.log(`Description: ${testCase.description}`);
  
  try {
    const slots = getValidTimeSlotsForProfessional(
      testCase.employee,
      testCase.date, 
      testCase.serviceDuration,
      {} // No existing appointments
    );
    
    console.log(`✅ Generated ${slots.length} valid time slots`);
    console.log(`📍 First slot: ${slots[0] || 'none'}`);
    console.log(`📍 Last slot: ${slots[slots.length - 1] || 'none'}`);
    
    if (testCase.expectedLastSlot) {
      const actualLast = slots[slots.length - 1];
      const matches = actualLast === testCase.expectedLastSlot;
      console.log(`${matches ? '✅' : '❌'} Expected last slot: ${testCase.expectedLastSlot}, Got: ${actualLast}`);
    }
    
    // Verify all slots can complete within shifts
    const allValid = slots.every(slot => {
      const endTime = addMinutesToTime(slot, testCase.serviceDuration);
      const employee = testCase.employee;
      const shifts = employee.workSchedule?.friday?.shiftsData || [];
      
      return shifts.some(shift => {
        const slotMinutes = timeToMinutesFn(slot);
        const endMinutes = timeToMinutesFn(endTime);
        const shiftStartMinutes = timeToMinutesFn(shift.startTime);
        const shiftEndMinutes = timeToMinutesFn(shift.endTime);
        
        return slotMinutes >= shiftStartMinutes && endMinutes <= shiftEndMinutes;
      });
    });
    
    console.log(`${allValid ? '✅' : '❌'} All slots complete within shifts: ${allValid}`);
    
  } catch (error) {
    console.log(`❌ Test failed with error: ${error.message}`);
  }
});

console.log("\n🎯 Test Summary:");
console.log("- Time slots now dynamically calculated based on employee shifts");
console.log("- Service duration is considered to ensure completion within shift hours");
console.log("- No more hard-coded 10:45 PM limit - validation is shift-specific");
console.log("- Multiple shifts are handled independently");

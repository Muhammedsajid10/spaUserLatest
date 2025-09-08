// Test the specific bug: 9AM-5PM shift with 1-hour service
import { getValidTimeSlotsForProfessional, timeToMinutesFn, addMinutesToTime } from './src/bookingUtils.jsx';

const testShiftBug = () => {
  console.log("🐛 Testing Shift Bug: 9AM-5PM with 1-hour service\n");

  const employee = {
    _id: "emp1",
    name: "Test Employee",
    isActive: true,
    workSchedule: {
      friday: {
        shiftsData: [
          { startTime: "09:00", endTime: "17:00" } // 9 AM to 5 PM
        ]
      }
    }
  };

  const serviceDuration = 60; // 1 hour
  const testDate = new Date(2025, 8, 5); // Friday
  const appointments = {}; // No existing appointments

  console.log("📋 Test Setup:");
  console.log(`Employee shift: 9:00 AM - 5:00 PM`);
  console.log(`Service duration: ${serviceDuration} minutes (1 hour)`);
  console.log(`Expected last valid slot: 4:00 PM (4:00 PM + 60 min = 5:00 PM)`);
  console.log("");

  try {
    const slots = getValidTimeSlotsForProfessional(employee, testDate, serviceDuration, appointments);
    
    console.log(`✅ Generated ${slots.length} time slots`);
    console.log(`📍 First slot: ${slots[0] || 'none'}`);
    console.log(`📍 Last slot: ${slots[slots.length - 1] || 'none'}`);
    
    // Verify the last slot
    const lastSlot = slots[slots.length - 1];
    if (lastSlot) {
      const serviceEndTime = addMinutesToTime(lastSlot, serviceDuration);
      const lastSlotMinutes = timeToMinutesFn(lastSlot);
      const serviceEndMinutes = timeToMinutesFn(serviceEndTime);
      const shiftEndMinutes = timeToMinutesFn("17:00");
      
      console.log(`\n🔍 Last Slot Analysis:`);
      console.log(`Last slot: ${lastSlot}`);
      console.log(`Service ends at: ${serviceEndTime}`);
      console.log(`Shift ends at: 17:00 (5:00 PM)`);
      console.log(`Service end minutes: ${serviceEndMinutes}`);
      console.log(`Shift end minutes: ${shiftEndMinutes}`);
      console.log(`Fits within shift: ${serviceEndMinutes <= shiftEndMinutes ? '✅ YES' : '❌ NO'}`);
      
      // Check if 4:00 PM is in the slots
      const expectedLastSlot = "16:00"; // 4:00 PM
      const hasExpectedSlot = slots.includes(expectedLastSlot);
      console.log(`\n🎯 Expected vs Actual:`);
      console.log(`Expected last slot: ${expectedLastSlot}`);
      console.log(`Actual last slot: ${lastSlot}`);
      console.log(`Contains expected slot: ${hasExpectedSlot ? '✅ YES' : '❌ NO'}`);
      
      // Check for any invalid slots (that would extend beyond shift)
      const invalidSlots = slots.filter(slot => {
        const endTime = addMinutesToTime(slot, serviceDuration);
        return timeToMinutesFn(endTime) > timeToMinutesFn("17:00");
      });
      
      console.log(`\n⚠️  Invalid slots found: ${invalidSlots.length}`);
      if (invalidSlots.length > 0) {
        console.log(`Invalid slots: ${invalidSlots.join(', ')}`);
        invalidSlots.forEach(slot => {
          const endTime = addMinutesToTime(slot, serviceDuration);
          console.log(`  ${slot} → ${endTime} (exceeds 17:00)`);
        });
      }
    }

    // Show some sample slots with their end times
    console.log(`\n📅 Sample Time Slots:`);
    slots.slice(-10).forEach(slot => {
      const endTime = addMinutesToTime(slot, serviceDuration);
      const valid = timeToMinutesFn(endTime) <= timeToMinutesFn("17:00");
      console.log(`${slot} → ${endTime} ${valid ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.error(error);
  }
};

// Run the test
testShiftBug();

// Manual calculation verification
console.log(`\n🧮 Manual Calculation Verification:`);
console.log(`Shift: 09:00 - 17:00 (480 minutes total)`);
console.log(`Service: 60 minutes`);
console.log(`Available for start times: 480 - 60 = 420 minutes`);
console.log(`420 minutes = 7 hours`);
console.log(`9:00 AM + 7 hours = 4:00 PM`);
console.log(`So 4:00 PM should be the last valid slot`);
console.log(`4:00 PM + 60 minutes = 5:00 PM (exactly at shift end) ✅`);
console.log(`4:15 PM + 60 minutes = 5:15 PM (exceeds shift end) ❌`);

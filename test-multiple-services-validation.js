// Test script to verify multiple service duration validation
import { 
  computeSequentialServiceStartTimesWithBookings, 
  getEmployeeShiftHours,
  timeToMinutesFn,
  addMinutesToTime 
} from './src/bookingUtils.jsx';

// Test case: Multiple services with different durations
const testMultipleServices = async () => {
  console.log("🧪 Testing Multiple Service Duration Validation\n");

  // Test scenario
  const employee = {
    _id: "emp1",
    name: "Sarah Johnson",
    isActive: true,
    workSchedule: {
      friday: {
        shiftsData: [
          { startTime: "14:00", endTime: "18:00" } // 2 PM to 6 PM (4 hours = 240 minutes)
        ]
      }
    }
  };

  const services = [
    { _id: "svc1", name: "Massage", duration: 60 },       // 60 min
    { _id: "svc2", name: "Facial", duration: 45 },        // 45 min  
    { _id: "svc3", name: "Manicure", duration: 30 },      // 30 min
    { _id: "svc4", name: "Pedicure", duration: 45 },      // 45 min
    { _id: "svc5", name: "Hair Treatment", duration: 30 } // 30 min
  ];
  
  // Total duration: 60 + 45 + 30 + 45 + 30 = 210 minutes (3.5 hours)
  const totalDuration = services.reduce((sum, svc) => sum + svc.duration, 0);

  const professionalsMap = {};
  services.forEach(svc => {
    professionalsMap[svc._id] = employee;
  });

  const testDate = new Date(2025, 8, 5); // Friday, September 5, 2025
  const appointmentsIndex = {}; // No existing appointments

  console.log("📋 Test Setup:");
  console.log(`Employee: ${employee.name}`);
  console.log(`Shift: 2:00 PM - 6:00 PM (240 minutes available)`);
  console.log(`Total service duration: ${totalDuration} minutes (${totalDuration/60} hours)`);
  console.log(`Services: ${services.map(s => `${s.name}(${s.duration}min)`).join(', ')}`);
  console.log("");

  try {
    const sequences = await computeSequentialServiceStartTimesWithBookings(
      services, 
      professionalsMap, 
      testDate, 
      appointmentsIndex
    );

    console.log("✅ Results:");
    console.log(`Generated ${sequences.length} valid time slot sequences`);
    
    if (sequences.length > 0) {
      console.log("\n📅 Valid Time Slots:");
      sequences.slice(0, 5).forEach((seq, index) => {
        const endTime = addMinutesToTime(seq.startTime, totalDuration);
        console.log(`${index + 1}. ${seq.startTime} → ${endTime} (${totalDuration} min total)`);
        
        // Verify each service in the sequence
        seq.sequence.forEach((service, i) => {
          console.log(`   ${i + 1}. ${services[i].name}: ${service.startTime} → ${service.endTime}`);
        });
      });

      // Calculate expected latest valid slot
      const shiftEnd = "18:00"; // 6 PM
      const shiftEndMinutes = timeToMinutesFn(shiftEnd);
      const latestStartMinutes = shiftEndMinutes - totalDuration;
      const expectedLatestSlot = `${String(Math.floor(latestStartMinutes / 60)).padStart(2, '0')}:${String(latestStartMinutes % 60).padStart(2, '0')}`;
      
      const actualLatestSlot = sequences[sequences.length - 1]?.startTime;
      
      console.log(`\n🎯 Validation:`);
      console.log(`Expected latest slot: ${expectedLatestSlot} (${expectedLatestSlot} + ${totalDuration}min = ${shiftEnd})`);
      console.log(`Actual latest slot: ${actualLatestSlot}`);
      console.log(`✅ Validation ${actualLatestSlot === expectedLatestSlot ? 'PASSED' : 'FAILED'}`);
      
    } else {
      console.log("❌ No valid sequences found");
      
      // Check why no sequences were found
      const shiftDuration = 240; // 4 hours
      if (totalDuration > shiftDuration) {
        console.log(`⚠️  Total service duration (${totalDuration}min) exceeds shift duration (${shiftDuration}min)`);
      }
    }

    // Test edge case: Services that exactly fit the shift
    console.log(`\n🧪 Edge Case Test: Services that exactly fit shift duration`);
    const exactServices = [
      { _id: "exact1", name: "Long Service 1", duration: 120 },
      { _id: "exact2", name: "Long Service 2", duration: 120 }
    ]; // Total: 240 minutes (exactly 4 hours)
    
    const exactProfessionalsMap = {};
    exactServices.forEach(svc => {
      exactProfessionalsMap[svc._id] = employee;
    });

    const exactSequences = await computeSequentialServiceStartTimesWithBookings(
      exactServices,
      exactProfessionalsMap,
      testDate,
      appointmentsIndex
    );

    console.log(`Exact fit sequences: ${exactSequences.length}`);
    if (exactSequences.length > 0) {
      const firstExact = exactSequences[0];
      const lastExact = exactSequences[exactSequences.length - 1];
      console.log(`First slot: ${firstExact.startTime} → ${firstExact.finalEndTime}`);
      console.log(`Last slot: ${lastExact.startTime} → ${lastExact.finalEndTime}`);
    }

  } catch (error) {
    console.log(`❌ Test failed with error: ${error.message}`);
    console.error(error);
  }
};

// Run the test
testMultipleServices();

console.log(`
🎯 Summary of Multiple Service Duration Validation:

✅ IMPLEMENTED FEATURES:
- Total duration calculation for multiple services
- Shift-based validation ensuring entire sequence fits
- Individual service validation within assigned employee shifts  
- Enhanced logging for debugging multi-service scenarios

📝 VALIDATION LOGIC:
1. Calculate total duration of all selected services
2. For each potential start time, verify:
   - Each service can start and complete within its assigned employee's shift
   - The entire sequence fits within the shift duration
   - No conflicts with existing appointments

🔍 EXAMPLE:
Employee shift: 2:00 PM - 6:00 PM (240 minutes)
5 services totaling 210 minutes (3.5 hours)
Latest valid start time: 2:30 PM (2:30 PM + 210 min = 6:00 PM ✓)
Invalid start time: 3:00 PM (3:00 PM + 210 min = 6:30 PM ✗ exceeds shift)
`);

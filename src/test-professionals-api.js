/**
 * Test what the public professionals API returns and verify workSchedule data
 */

const API_BASE_URL = 'https://spabacklat.onrender.com/api/v1';

async function testProfessionalsAPI() {
  console.log("🔍 Testing Public Professionals API for workSchedule data...\n");

  try {
    // First, get available services to find a service ID
    console.log("📋 Step 1: Getting available services...");
    const servicesResponse = await fetch(`${API_BASE_URL}/bookings/services`);
    
    if (!servicesResponse.ok) {
      console.error(`❌ Services API failed: ${servicesResponse.status}`);
      return;
    }
    
    const servicesData = await servicesResponse.json();
    console.log(`✅ Found ${servicesData.data?.services?.length || 0} services`);
    
    if (!servicesData.data?.services?.length) {
      console.error("❌ No services found");
      return;
    }
    
    const testService = servicesData.data.services[0];
    console.log(`📍 Using test service: ${testService.name} (ID: ${testService._id})`);

    // Test the professionals API
    console.log("\n🔍 Step 2: Testing professionals API...");
    const testDate = "2025-09-04"; // Today
    const professionalsResponse = await fetch(`${API_BASE_URL}/bookings/professionals?service=${testService._id}&date=${testDate}`);
    
    console.log(`Status: ${professionalsResponse.status} ${professionalsResponse.statusText}`);
    
    if (!professionalsResponse.ok) {
      const errorText = await professionalsResponse.text();
      console.error("❌ Professionals API failed:", errorText);
      return;
    }
    
    const professionalsData = await professionalsResponse.json();
    console.log("✅ Professionals API Response:", JSON.stringify(professionalsData, null, 2));
    
    // Analyze the workSchedule data
    const professionals = professionalsData?.data?.professionals ?? professionalsData?.professionals ?? professionalsData?.data ?? [];
    
    console.log(`\n📊 Analysis: Found ${professionals.length} professionals`);
    
    professionals.forEach((prof, index) => {
      console.log(`\n👤 Professional ${index + 1}:`);
      console.log(`  ID: ${prof._id}`);
      console.log(`  Name: ${prof.user ? `${prof.user.firstName} ${prof.user.lastName}` : prof.name || 'N/A'}`);
      console.log(`  Has workSchedule: ${!!prof.workSchedule}`);
      
      if (prof.workSchedule) {
        console.log(`  WorkSchedule keys: ${Object.keys(prof.workSchedule)}`);
        
        // Check Thursday specifically (as mentioned in your example)
        if (prof.workSchedule.thursday) {
          console.log(`  Thursday schedule:`, JSON.stringify(prof.workSchedule.thursday, null, 4));
        }
        
        // Check Wednesday specifically (24-hour example)
        if (prof.workSchedule.wednesday) {
          console.log(`  Wednesday schedule:`, JSON.stringify(prof.workSchedule.wednesday, null, 4));
        }
        
        // Look for Nina Kowalski specifically
        const name = prof.user ? `${prof.user.firstName} ${prof.user.lastName}` : prof.name;
        if (name && name.includes('Nina')) {
          console.log(`  🎯 FOUND NINA KOWALSKI! Full workSchedule:`, JSON.stringify(prof.workSchedule, null, 4));
        }
      } else {
        console.log(`  ❌ NO workSchedule data returned for this professional`);
      }
    });

    // Test what happens when we import the bookingUtils
    console.log("\n🧪 Step 3: Testing shift parsing with bookingUtils...");
    
    if (professionals.length > 0) {
      const testProf = professionals.find(p => 
        (p.user && p.user.firstName && p.user.firstName.includes('Nina')) ||
        (p.name && p.name.includes('Nina'))
      ) || professionals[0];
      
      console.log(`Testing shift parsing for: ${testProf.user ? `${testProf.user.firstName} ${testProf.user.lastName}` : testProf.name}`);
      
      // Manually parse similar to bookingUtils
      const testDate = new Date('2025-09-04'); // Thursday
      const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][testDate.getDay()];
      console.log(`Day: ${dayName} (${testDate.toDateString()})`);
      
      if (testProf.workSchedule && testProf.workSchedule[dayName]) {
        const daySchedule = testProf.workSchedule[dayName];
        console.log(`${dayName} schedule:`, JSON.stringify(daySchedule, null, 2));
        
        // Check different schedule formats
        if (daySchedule.shiftsData) {
          console.log(`✅ Found shiftsData: ${JSON.stringify(daySchedule.shiftsData)}`);
        }
        if (daySchedule.shifts) {
          console.log(`✅ Found shifts string: "${daySchedule.shifts}"`);
        }
        if (daySchedule.startTime && daySchedule.endTime) {
          console.log(`✅ Found startTime/endTime: ${daySchedule.startTime} - ${daySchedule.endTime}`);
        }
      } else {
        console.log(`❌ No ${dayName} schedule found`);
      }
    }

  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

testProfessionalsAPI();

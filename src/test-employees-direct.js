/**
 * Direct test of the employees endpoint to check workSchedule data
 */

const API_BASE_URL = 'https://api.alloraspadubai.com/api/v1';

async function testEmployeesDirectly() {
  console.log("🔍 Testing Direct Employees Endpoint...\n");

  try {
    // Test the direct employees endpoint (if it exists)
    console.log("📋 Testing direct /employees endpoint...");
    const employeesResponse = await fetch(`${API_BASE_URL}/employees`);
    
    console.log(`Status: ${employeesResponse.status} ${employeesResponse.statusText}`);
    
    if (employeesResponse.status === 401) {
      console.log("❌ Employees endpoint requires authentication");
      console.log("✅ This is expected for security reasons");
    } else if (employeesResponse.ok) {
      const employeesData = await employeesResponse.json();
      console.log("✅ Direct employees endpoint accessible:");
      console.log(JSON.stringify(employeesData, null, 2));
    } else {
      const errorText = await employeesResponse.text();
      console.log("❌ Direct employees endpoint failed:", errorText);
    }

    // Test with a specific service that we know exists
    console.log("\n🔍 Testing professionals API with massage service...");
    
    // Get services first to find a massage service
    const servicesResponse = await fetch(`${API_BASE_URL}/bookings/services`);
    if (!servicesResponse.ok) {
      console.error("❌ Cannot get services");
      return;
    }
    
    const servicesData = await servicesResponse.json();
    const massageService = servicesData.data.services.find(s => 
      s.name.toLowerCase().includes('massage') || 
      s.category?.toLowerCase().includes('massage')
    ) || servicesData.data.services[0];
    
    console.log(`📍 Using service: ${massageService.name} (ID: ${massageService._id})`);

    // Test professionals endpoint
    const testDate = "2025-09-04";
    const professionalsResponse = await fetch(`${API_BASE_URL}/bookings/professionals?service=${massageService._id}&date=${testDate}`);
    
    if (!professionalsResponse.ok) {
      const errorText = await professionalsResponse.text();
      console.error("❌ Professionals API failed:", errorText);
      return;
    }
    
    const professionalsData = await professionalsResponse.json();
    const professionals = professionalsData?.data?.professionals ?? [];
    
    console.log(`\n📊 Found ${professionals.length} professionals for massage service`);
    
    if (professionals.length > 0) {
      const sampleProf = professionals[0];
      console.log("\n🔍 Sample professional data structure:");
      console.log("Keys available:", Object.keys(sampleProf));
      console.log("Full data:", JSON.stringify(sampleProf, null, 2));
      
      // Check specifically for workSchedule
      if (sampleProf.workSchedule) {
        console.log("✅ workSchedule found!");
        console.log("workSchedule keys:", Object.keys(sampleProf.workSchedule));
      } else {
        console.log("❌ workSchedule missing from response");
      }
      
      // Check for Nina specifically
      const nina = professionals.find(p => p.user?.firstName?.includes('Nina'));
      if (nina) {
        console.log("\n🎯 Nina Kowalski data:");
        console.log("ID:", nina._id);
        console.log("workSchedule exists:", !!nina.workSchedule);
        if (nina.workSchedule) {
          console.log("Nina's workSchedule:", JSON.stringify(nina.workSchedule, null, 2));
        }
      }
    }
    
    // Test what the backend logs show
    console.log("\n💡 Backend Investigation:");
    console.log("If workSchedule is missing, check:");
    console.log("1. Employee.find() query includes workSchedule in .select()");
    console.log("2. Employee model has workSchedule field defined");
    console.log("3. Database actually contains workSchedule data for employees");
    console.log("4. No middleware is filtering out workSchedule data");
    
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
  }
}

testEmployeesDirectly();

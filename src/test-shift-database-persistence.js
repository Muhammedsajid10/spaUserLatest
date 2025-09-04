/**
 * Test script to verify shift changes are persisting to database/backend
 * This simulates the exact same API calls that the admin panel makes
 */

const BASE_URL = "https://spabacklat.onrender.com/api/v1";

// Mock token - you'll need to replace this with a real admin token
// You can get this by logging into the admin panel and checking localStorage
const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2ZWZhODEzNDY4YzAwOWUzNzBhNzJhZSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcyNzExNTc1MSwiZXhwIjoxNzI3NzIwNTUxfQ.lGGDRxo9XPZS7AjGvR3HwKO2Vgh8lOhb8LZFf7N4UhE";

async function testShiftDatabasePersistence() {
  console.log("🧪 Testing Shift Database Persistence...\n");

  try {
    // Step 1: Get all employees first to see what we're working with
    console.log("📋 Step 1: Fetching all employees...");
    const employeesResponse = await fetch(`${BASE_URL}/employees`, {
      headers: {
        'Authorization': `Bearer ${MOCK_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!employeesResponse.ok) {
      console.error(`❌ Failed to fetch employees: ${employeesResponse.status} ${employeesResponse.statusText}`);
      const errorText = await employeesResponse.text();
      console.error("Error details:", errorText);
      return;
    }

    const employeesData = await employeesResponse.json();
    console.log(`✅ Found ${employeesData.data.employees.length} employees`);
    
    // Find Ahmed Al-Rashid or use the first employee
    let testEmployee = employeesData.data.employees.find(emp => 
      emp.user?.firstName?.includes('Ahmad') || 
      emp.user?.lastName?.includes('Al-Rashid') ||
      emp.name?.includes('Ahmad')
    );
    
    if (!testEmployee) {
      testEmployee = employeesData.data.employees[0];
      console.log(`⚠️ Ahmed Al-Rashid not found, using first employee: ${testEmployee.user?.firstName || testEmployee.name || testEmployee._id}`);
    } else {
      console.log(`✅ Found test employee: ${testEmployee.user?.firstName} ${testEmployee.user?.lastName || ''}`);
    }

    const employeeId = testEmployee._id;
    console.log(`📍 Test Employee ID: ${employeeId}`);
    console.log(`📋 Current workSchedule:`, JSON.stringify(testEmployee.workSchedule, null, 2));

    // Step 2: Test shift update - simulate what the admin panel does
    console.log("\n🔄 Step 2: Testing shift update...");
    const updateData = {
      workSchedule: {
        thursday: {
          isWorking: true,
          startTime: "08:00",
          endTime: "16:00", 
          shifts: "08:00 - 16:00",
          shiftsData: [{ startTime: "08:00", endTime: "16:00" }],
          multipleShifts: "08:00 - 16:00",
          shiftCount: 1
        }
      },
      weekStartDate: "2025-09-01" // This week
    };

    console.log("📤 Sending PATCH request:");
    console.log(`  URL: ${BASE_URL}/employees/${employeeId}`);
    console.log(`  Data:`, JSON.stringify(updateData, null, 2));

    const updateResponse = await fetch(`${BASE_URL}/employees/${employeeId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${MOCK_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      console.error(`❌ PATCH failed: ${updateResponse.status} ${updateResponse.statusText}`);
      const errorText = await updateResponse.text();
      console.error("Error details:", errorText);
      return;
    }

    const updateResult = await updateResponse.json();
    console.log("✅ PATCH Response:", JSON.stringify(updateResult, null, 2));

    // Step 3: Verify the change by fetching the employee again
    console.log("\n🔍 Step 3: Verifying database persistence...");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    const verifyResponse = await fetch(`${BASE_URL}/employees/${employeeId}`, {
      headers: {
        'Authorization': `Bearer ${MOCK_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!verifyResponse.ok) {
      console.error(`❌ Verification fetch failed: ${verifyResponse.status} ${verifyResponse.statusText}`);
      return;
    }

    const verifyData = await verifyResponse.json();
    const updatedEmployee = verifyData.data.employee;
    
    console.log("📋 Updated workSchedule from database:");
    console.log(JSON.stringify(updatedEmployee.workSchedule, null, 2));
    
    // Check if the change was saved
    const thursdaySchedule = updatedEmployee.workSchedule?.thursday;
    if (thursdaySchedule && thursdaySchedule.shifts === "08:00 - 16:00") {
      console.log("✅ SUCCESS: Shift change was persisted to database!");
      console.log(`✅ Thursday shift: ${thursdaySchedule.shifts}`);
      console.log(`✅ Working status: ${thursdaySchedule.isWorking}`);
    } else {
      console.log("❌ FAILURE: Shift change was NOT persisted to database");
      console.log(`❌ Expected Thursday shifts: "08:00 - 16:00"`);
      console.log(`❌ Actual Thursday shifts: ${thursdaySchedule?.shifts || 'undefined'}`);
    }

    // Step 4: Test fetching all employees again to see if data is consistent
    console.log("\n🔄 Step 4: Testing employee list API consistency...");
    const finalEmployeesResponse = await fetch(`${BASE_URL}/employees?weekStartDate=2025-09-01`, {
      headers: {
        'Authorization': `Bearer ${MOCK_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (finalEmployeesResponse.ok) {
      const finalEmployeesData = await finalEmployeesResponse.json();
      const finalEmployee = finalEmployeesData.data.employees.find(emp => emp._id === employeeId);
      
      if (finalEmployee) {
        console.log("📋 Employee from list API:");
        console.log(JSON.stringify(finalEmployee.workSchedule, null, 2));
        
        const listThursdaySchedule = finalEmployee.workSchedule?.thursday;
        if (listThursdaySchedule && listThursdaySchedule.shifts === "08:00 - 16:00") {
          console.log("✅ SUCCESS: Employee list API shows updated data!");
        } else {
          console.log("❌ FAILURE: Employee list API shows stale data");
        }
      }
    }

  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Note: You need to update MOCK_TOKEN with a real admin token
console.log("⚠️ IMPORTANT: Update MOCK_TOKEN with a real admin token from your browser's localStorage");
console.log("You can get this by:");
console.log("1. Open admin panel in browser");
console.log("2. Login as admin");
console.log("3. Open browser dev tools");
console.log("4. Run: localStorage.getItem('token')");
console.log("5. Copy that token and replace MOCK_TOKEN in this script\n");

testShiftDatabasePersistence();

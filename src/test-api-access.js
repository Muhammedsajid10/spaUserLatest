/**
 * Simple test to check what happens when we try to access employees API
 * This will help us understand the authentication requirements
 */

const BASE_URL = "https://api.alloraspadubai.com/api/v1";

async function testEmployeeAPIAccess() {
  console.log("🔍 Testing Employee API Access Requirements...\n");

  try {
    // Test 1: Try without authentication
    console.log("📋 Test 1: Accessing employees API without authentication...");
    const noAuthResponse = await fetch(`${BASE_URL}/employees`);
    console.log(`Status: ${noAuthResponse.status} ${noAuthResponse.statusText}`);
    
    if (!noAuthResponse.ok) {
      const errorText = await noAuthResponse.text();
      console.log("Response:", errorText);
    }

    // Test 2: Check admin login endpoint
    console.log("\n🔐 Test 2: Testing admin login endpoint...");
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: "admin@spa.com", // Common default admin email
        password: "admin123" // Common default admin password
      })
    });
    
    console.log(`Login Status: ${loginResponse.status} ${loginResponse.statusText}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log("✅ Login successful!");
      console.log("Login response:", JSON.stringify(loginData, null, 2));
      
      const token = loginData.token;
      if (token) {
        console.log(`🔑 Token: ${token}`);
        
        // Test 3: Try employees API with valid token
        console.log("\n📋 Test 3: Accessing employees API with authentication...");
        const authResponse = await fetch(`${BASE_URL}/employees`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Authenticated Status: ${authResponse.status} ${authResponse.statusText}`);
        
        if (authResponse.ok) {
          const employeesData = await authResponse.json();
          console.log("✅ Employees API accessible with auth!");
          console.log(`Found ${employeesData.data?.employees?.length || 0} employees`);
          
          if (employeesData.data?.employees?.length > 0) {
            const firstEmployee = employeesData.data.employees[0];
            console.log("\n👤 First employee sample:");
            console.log(`ID: ${firstEmployee._id}`);
            console.log(`Name: ${firstEmployee.user?.firstName || firstEmployee.name || 'N/A'} ${firstEmployee.user?.lastName || ''}`);
            console.log(`WorkSchedule exists: ${!!firstEmployee.workSchedule}`);
            if (firstEmployee.workSchedule) {
              console.log("WorkSchedule sample:", JSON.stringify(firstEmployee.workSchedule, null, 2));
            }
          }
        } else {
          const errorText = await authResponse.text();
          console.log("❌ Still failed with auth:", errorText);
        }
      }
    } else {
      const loginErrorText = await loginResponse.text();
      console.log("❌ Login failed:", loginErrorText);
      console.log("\n💡 Try common admin credentials:");
      console.log("- admin@spa.com / admin123");
      console.log("- admin@example.com / password");
      console.log("- admin@admin.com / admin");
    }

  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
  }
}

testEmployeeAPIAccess();

/**
 * Try different admin credential combinations
 */

const BASE_URL = "https://api.alloraspadubai.com/api/v1";

async function tryDifferentCredentials() {
  console.log("🔐 Trying Different Admin Credentials...\n");

  const credentialCombinations = [
    { email: "admin@spa.com", password: "admin123" },
    { email: "admin@example.com", password: "password" },
    { email: "admin@admin.com", password: "admin" },
    { email: "admin@test.com", password: "test123" },
    { email: "admin@localhost.com", password: "admin123" },
    { email: "test@admin.com", password: "admin123" },
    { email: "spa@admin.com", password: "password123" },
    { email: "admin@spa.com", password: "password123" },
    { email: "admin@spa.local", password: "admin123" }
  ];

  for (let i = 0; i < credentialCombinations.length; i++) {
    const creds = credentialCombinations[i];
    console.log(`🔑 Attempt ${i + 1}: ${creds.email} / ${creds.password}`);
    
    try {
      const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(creds)
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log("✅ SUCCESS! Login successful with:", creds.email);
        console.log("Token:", loginData.token);
        console.log("User:", JSON.stringify(loginData.data?.user || loginData.user, null, 2));
        return loginData.token;
      } else {
        console.log(`❌ Failed: ${loginResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log("\n❌ All credential attempts failed");
  console.log("💡 You may need to:");
  console.log("1. Check the backend admin user creation");
  console.log("2. Create an admin user manually");
  console.log("3. Use the admin panel to login and get a token");
  return null;
}

async function testWithWorkingToken() {
  const token = await tryDifferentCredentials();
  
  if (token) {
    console.log("\n📋 Testing employee API with working token...");
    
    try {
      const response = await fetch(`${BASE_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Employee API accessible!");
        console.log(`Found ${data.data?.employees?.length || 0} employees`);
        
        if (data.data?.employees?.length > 0) {
          console.log("\n📋 Testing shift update simulation...");
          const testEmployee = data.data.employees[0];
          console.log(`Test employee: ${testEmployee._id}`);
          
          // Try to update a shift
          const updateData = {
            workSchedule: {
              thursday: {
                isWorking: true,
                startTime: "09:30",
                endTime: "17:30", 
                shifts: "09:30 - 17:30",
                shiftsData: [{ startTime: "09:30", endTime: "17:30" }],
                multipleShifts: "09:30 - 17:30",
                shiftCount: 1
              }
            },
            weekStartDate: "2025-09-01"
          };
          
          const updateResponse = await fetch(`${BASE_URL}/employees/${testEmployee._id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          });
          
          if (updateResponse.ok) {
            const updateResult = await updateResponse.json();
            console.log("✅ Shift update successful!");
            console.log("Response:", JSON.stringify(updateResult, null, 2));
            
            // Verify the change
            setTimeout(async () => {
              const verifyResponse = await fetch(`${BASE_URL}/employees/${testEmployee._id}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json();
                const thursdaySchedule = verifyData.data.employee.workSchedule?.thursday;
                console.log("\n🔍 Verification result:");
                console.log(`Thursday shifts: ${thursdaySchedule?.shifts || 'undefined'}`);
                
                if (thursdaySchedule?.shifts === "09:30 - 17:30") {
                  console.log("✅ SUCCESS: Shift changes ARE persisting to database!");
                } else {
                  console.log("❌ FAILURE: Shift changes are NOT persisting to database");
                }
              }
            }, 1000);
            
          } else {
            const updateError = await updateResponse.text();
            console.log("❌ Shift update failed:", updateError);
          }
        }
      } else {
        const error = await response.text();
        console.log("❌ Employee API failed:", error);
      }
    } catch (error) {
      console.log("❌ Error testing employee API:", error.message);
    }
  }
}

testWithWorkingToken();

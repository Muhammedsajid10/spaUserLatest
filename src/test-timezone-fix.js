// Test the timezone fix for booking dates
console.log('🧪 Testing timezone fix for booking dates...\n');

// Simulate the old behavior (problematic)
console.log('❌ OLD BEHAVIOR (problematic):');
const selectedDate = new Date(2025, 0, 5); // January 5, 2025 (month is 0-indexed)
console.log('1. selectedDate (local):', selectedDate.toString());
console.log('2. selectedDate.toISOString():', selectedDate.toISOString());
console.log('3. new Date(selectedDate).toISOString():', new Date(selectedDate).toISOString());

const appointmentDateOld = selectedDate;
const finalDateOld = new Date(appointmentDateOld).toISOString();
console.log('4. Final appointment date (old):', finalDateOld);
console.log('5. Date extracted from ISO:', new Date(finalDateOld).toLocaleDateString());

console.log('\n✅ NEW BEHAVIOR (fixed):');
// Simulate the new behavior (fixed)
const selectedDate2 = new Date(2025, 0, 5); // January 5, 2025
const dateString = selectedDate2.toISOString().split('T')[0]; // "2025-01-05"
console.log('1. selectedDate (local):', selectedDate2.toString());
console.log('2. dateString (YYYY-MM-DD):', dateString);

const appointmentDateNew = `${dateString}T12:00:00.000Z`; // Noon UTC to avoid timezone shifts
const finalDateNew = new Date(appointmentDateNew).toISOString();
console.log('3. Final appointment date (new):', finalDateNew);
console.log('4. Date extracted from ISO:', new Date(finalDateNew).toLocaleDateString());

console.log('\n📊 COMPARISON:');
console.log('Old method result:', new Date(finalDateOld).toLocaleDateString());
console.log('New method result:', new Date(finalDateNew).toLocaleDateString());

const oldDate = new Date(finalDateOld);
const newDate = new Date(finalDateNew);
if (oldDate.getDate() === newDate.getDate()) {
  console.log('✅ Dates match - fix successful!');
} else {
  console.log('❌ Dates still don\'t match - need more investigation');
  console.log('Old date day:', oldDate.getDate());
  console.log('New date day:', newDate.getDate());
}

// Test the improved timezone fix for booking dates
console.log('🧪 Testing IMPROVED timezone fix for booking dates...\n');

// Simulate a date selection (January 5, 2025)
const selectedDate = new Date(2025, 0, 5); // January 5, 2025 (local time)
console.log('Selected date (local):', selectedDate.toString());

console.log('\n❌ OLD PROBLEMATIC METHOD:');
const oldDateStr = selectedDate.toISOString().split('T')[0];
console.log('1. selectedDate.toISOString().split("T")[0]:', oldDateStr);
const oldAppointmentDate = `${oldDateStr}T12:00:00.000Z`;
console.log('2. Appointment date:', oldAppointmentDate);
console.log('3. Final date displayed:', new Date(oldAppointmentDate).toLocaleDateString());

console.log('\n✅ NEW IMPROVED METHOD:');
const newDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
console.log('1. Manual date string construction:', newDateStr);
const newAppointmentDate = `${newDateStr}T12:00:00.000Z`;
console.log('2. Appointment date:', newAppointmentDate);
console.log('3. Final date displayed:', new Date(newAppointmentDate).toLocaleDateString());

console.log('\n📊 COMPARISON:');
console.log('Original selected date:', selectedDate.toLocaleDateString());
console.log('Old method result:', new Date(oldAppointmentDate).toLocaleDateString());
console.log('New method result:', new Date(newAppointmentDate).toLocaleDateString());

const originalDay = selectedDate.getDate();
const oldDay = new Date(oldAppointmentDate).getDate();  
const newDay = new Date(newAppointmentDate).getDate();

console.log('\nDay comparison:');
console.log('Original day:', originalDay);
console.log('Old method day:', oldDay);
console.log('New method day:', newDay);

if (originalDay === newDay) {
  console.log('✅ NEW METHOD WORKS - Date preserved correctly!');
} else {
  console.log('❌ Still issues with the new method');
}

if (originalDay === oldDay) {
  console.log('🤔 Old method was actually working?');
} else {
  console.log('❌ Old method was indeed problematic');
}

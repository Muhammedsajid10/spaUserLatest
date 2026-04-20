// Test to verify 24/7 default hours are working
import { getShiftHours } from './bookingUtils.jsx';

// Test case 1: Employee with no schedule should return 00:00-23:59
const employeeWithoutSchedule = {
  _id: 'test-employee-1',
  name: 'Test Employee',
  workSchedule: {}
};

console.log('Testing employee without schedule:');
const result1 = getShiftHours(employeeWithoutSchedule, new Date('2025-01-10'));
console.log('Expected: [{ start: "00:00", end: "23:59" }]');
console.log('Actual:', result1);

// Test case 2: Employee with schedule but no entry for specific day
const employeeWithPartialSchedule = {
  _id: 'test-employee-2', 
  name: 'Test Employee 2',
  workSchedule: {
    monday: { isWorking: true, startTime: '10:00', endTime: '18:00' }
    // No Friday entry
  }
};

console.log('\nTesting employee with partial schedule (no Friday):');
const result2 = getShiftHours(employeeWithPartialSchedule, new Date('2025-01-10')); // Friday
console.log('Expected: [{ start: "00:00", end: "23:59" }]');
console.log('Actual:', result2);

export { result1, result2 };

// Test script to validate the createValidDate function and date handling
const createValidDate = (dateInput) => {
  if (!dateInput) {
    console.error('createValidDate: No date input provided');
    return new Date(); // fallback to current date
  }

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      console.error('createValidDate: Invalid date input:', dateInput);
      return new Date(); // fallback to current date
    }
    return date;
  } catch (error) {
    console.error('createValidDate: Error creating date:', error.message, 'Input:', dateInput);
    return new Date(); // fallback to current date
  }
};

// Test cases
console.log('Testing createValidDate function:');

const testCases = [
  '2024-01-15T10:00:00.000Z',
  '2024-01-15T10:00:00',
  new Date('2024-01-15T10:00:00'),
  null,
  undefined,
  'invalid-date-string',
  '',
  1234567890
];

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: Input =`, testCase);
  const result = createValidDate(testCase);
  console.log('Result:', result);
  console.log('Is valid Date:', result instanceof Date && !isNaN(result.getTime()));
  console.log('ISO string:', result.toISOString());
});

console.log('\nAll tests completed.');
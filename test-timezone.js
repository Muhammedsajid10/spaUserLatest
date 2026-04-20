// Test script to verify timezone detection and formatting
import { formatLocalTime, formatLocalDateTime, formatTimeRange, getTimezoneDisplay } from './src/Utils/timeZoneUtils.js';

// Test with your API data
const testStartTime = "2025-10-23T17:45:00.000Z";  // 5:45 PM UTC
const testEndTime = "2025-10-23T18:45:00.000Z";    // 6:45 PM UTC

console.log('=== TIMEZONE DETECTION ===');
const timezoneInfo = getTimezoneDisplay();
console.log('User Timezone:', timezoneInfo.timezone);
console.log('GMT Offset:', timezoneInfo.offset);
console.log('Timezone Name:', timezoneInfo.name);

console.log('\n=== TIME FORMATTING TESTS ===');
console.log('Start Time (formatLocalTime):', formatLocalTime(testStartTime));
console.log('End Time (formatLocalTime):', formatLocalTime(testEndTime));
console.log('Start DateTime (formatLocalDateTime):', formatLocalDateTime(testStartTime));
console.log('Time Range (formatTimeRange):', formatTimeRange(testStartTime, testEndTime));

console.log('\n=== BROWSER TIMEZONE INFO ===');
console.log('Browser timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Browser locale:', Intl.DateTimeFormat().resolvedOptions().locale);

// Show what the times should look like in different timezones for comparison
console.log('\n=== COMPARISON (for debugging) ===');
const date = new Date(testStartTime);
console.log('UTC time:', date.toISOString());
console.log('Local time (auto):', date.toLocaleString());
console.log('Manila time:', date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
console.log('New York time:', date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
console.log('London time:', date.toLocaleString('en-US', { timeZone: 'Europe/London' }));
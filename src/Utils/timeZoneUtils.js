export const formatTimeRange = (startUtc, endUtc) => {
  if (!startUtc || !endUtc) return '';

  try {
    const start = new Date(startUtc);
    const end = new Date(endUtc);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('Invalid date detected:', { startUtc, endUtc });
      return 'Invalid time format';
    }

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Options for date and time with 12-hour format
    const fullOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric', // This ensures 12-hour format
      minute: '2-digit',
      hour12: true,    // Force 12-hour clock with AM/PM
      timeZone: userTimezone
    };

    // Options for time-only with 12-hour format
    const timeOnlyOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,    // Force 12-hour clock with AM/PM
      timeZone: userTimezone
    };

    // Get the dates in user's timezone for comparison
    const startDate = start.toLocaleDateString('en-US', { timeZone: userTimezone });
    const endDate = end.toLocaleDateString('en-US', { timeZone: userTimezone });

    // If same day, only show date once with times in 12-hour format
    if (startDate === endDate) {
      const formattedStart = new Intl.DateTimeFormat('en-US', fullOptions).format(start);
      const formattedEndTime = new Intl.DateTimeFormat('en-US', timeOnlyOptions).format(end);
      return `${formattedStart} - ${formattedEndTime}`;
    }

    // If different days, show full date-time for both in 12-hour format
    const formattedStart = new Intl.DateTimeFormat('en-US', fullOptions).format(start);
    const formattedEnd = new Intl.DateTimeFormat('en-US', fullOptions).format(end);
    return `${formattedStart} - ${formattedEnd}`;

  } catch (error) {
    console.error('Error formatting time range:', error);
    return 'Error formatting time';
  }
};

export const formatLocalDateTime = (utcString) => {
  if (!utcString) return '';
  
  try {
    const date = new Date(utcString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,    // Force 12-hour clock with AM/PM
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).format(date);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Error formatting date';
  }
};

export const formatTimeRangeAlternative = (startUtc, endUtc) => {
  if (!startUtc || !endUtc) return '';

  const start = new Date(startUtc);
  const end = new Date(endUtc);
  
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const baseOptions = {
    timeZone: userTimezone,
    hour12: true
  };

  const fullOptions = {
    ...baseOptions,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  };

  const timeOptions = {
    ...baseOptions,
    hour: 'numeric',
    minute: '2-digit'
  };

  // More direct approach: get date parts in user timezone
  const startDateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(start);

  const endDateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(end);

  // Extract date components
  const startYear = startDateParts.find(part => part.type === 'year').value;
  const startMonth = startDateParts.find(part => part.type === 'month').value;
  const startDay = startDateParts.find(part => part.type === 'day').value;

  const endYear = endDateParts.find(part => part.type === 'year').value;
  const endMonth = endDateParts.find(part => part.type === 'month').value;
  const endDay = endDateParts.find(part => part.type === 'day').value;

  const isSameDay = startYear === endYear && startMonth === endMonth && startDay === endDay;

  if (isSameDay) {
    const formattedStart = new Intl.DateTimeFormat('en-US', fullOptions).format(start);
    const formattedEndTime = new Intl.DateTimeFormat('en-US', timeOptions).format(end);
    return `${formattedStart} - ${formattedEndTime}`;
  }

  const formattedStart = new Intl.DateTimeFormat('en-US', fullOptions).format(start);
  const formattedEnd = new Intl.DateTimeFormat('en-US', fullOptions).format(end);
  return `${formattedStart} - ${formattedEnd}`;
};

export const formatLocalDate = (utcString) => {
  if (!utcString) return '';
  
  const date = new Date(utcString);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: userTimezone
  });
};

export const formatLocalTime = (utcString) => {
  if (!utcString) return '';
  
  const date = new Date(utcString);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: userTimezone
  });
};

// Helper to get timezone offset display
export const getTimezoneDisplay = () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = new Date().getTimezoneOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const minutes = Math.abs(offset % 60);
  const sign = offset < 0 ? '+' : '-';
  
  return {
    timezone,
    offset: `GMT${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    name: timezone.split('/').pop().replace('_', ' ')
  };
};

// Enhanced debug helper with more detailed output
export const debugTimezoneConversion = (utcString) => {
  const date = new Date(utcString);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  console.log({
    originalUTC: utcString,
    userTimezone,
    utcDate: date.toISOString(),
    convertedLocal: new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    }).format(date),
    dateInUserTZ: new Date(date.toLocaleString("en-CA", { timeZone: userTimezone }))
  });
};

// Test function to verify the fixes
export const testTimeRangeFormatting = () => {
  const testCases = [
    {
      name: "Same day, different times",
      start: "2024-01-15T10:00:00.000Z",
      end: "2024-01-15T14:00:00.000Z"
    },
    {
      name: "Different days",
      start: "2024-01-15T22:00:00.000Z",
      end: "2024-01-16T02:00:00.000Z"
    },
    {
      name: "Cross-timezone boundary",
      start: "2024-01-15T23:30:00.000Z",
      end: "2024-01-16T00:30:00.000Z"
    }
  ];

  console.log("Testing formatTimeRange fixes:");
  testCases.forEach(test => {
    console.log(`\n${test.name}:`);
    console.log("Original:", formatTimeRange(test.start, test.end));
    console.log("Alternative:", formatTimeRangeAlternative(test.start, test.end));
  });
};
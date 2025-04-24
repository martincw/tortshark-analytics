
/**
 * Formats a Date object to YYYY-MM-DD format for consistent storage
 * This function ensures dates are stored in a format that won't be affected by timezones
 */
export const formatDateForStorage = (date: Date): string => {
  // Get UTC components to avoid timezone issues
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  console.log(`formatDateForStorage: Input Date:`, date);
  console.log(`formatDateForStorage: UTC components - Year: ${year}, Month: ${month}, Day: ${day}`);
  
  // Create a string in YYYY-MM-DD format (no time component)
  const result = `${year}-${month}-${day}`;
  console.log(`formatDateForStorage: Result:`, result);
  return result;
};

/**
 * Parses a YYYY-MM-DD string into a Date object at UTC midnight
 */
export const parseStoredDate = (dateString: string): Date => {
  console.log(`parseStoredDate: Input String:`, dateString);
  
  // Parse the date components
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create a UTC date
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  console.log(`parseStoredDate: Result:`, date);
  
  return date;
};

/**
 * Formats a YYYY-MM-DD string for display
 */
export const formatDisplayDate = (dateStr: string): string => {
  const date = parseStoredDate(dateStr);
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Get local date string (YYYY-MM-DD) from a Date object
 * This handles timezone conversions to ensure the date in local timezone is used
 */
export const getLocalDateString = (date: Date): string => {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

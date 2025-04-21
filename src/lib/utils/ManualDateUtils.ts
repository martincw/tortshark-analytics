
/**
 * Formats a Date object to YYYY-MM-DD format for consistent storage
 * This function ensures dates are stored in a format that won't be affected by timezones
 */
export const formatDateForStorage = (date: Date): string => {
  // Get the year, month, and day in the local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Create a string in YYYY-MM-DD format (no time component)
  return `${year}-${month}-${day}`;
};

/**
 * Parses a YYYY-MM-DD string into a date object
 * The returned date will be at the start of the day in the local timezone
 */
export const parseStoredDate = (dateString: string): Date => {
  // Create a new date at the start of the day in local timezone
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  // Set time to noon to avoid timezone issues
  date.setHours(12, 0, 0, 0);
  
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

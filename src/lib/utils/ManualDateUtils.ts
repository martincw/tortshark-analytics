
/**
 * Date utilities to ensure consistent date handling across the application.
 * These utilities help with timezone-related issues when storing and displaying dates.
 */

import { addDays, format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";

/**
 * Creates a Date object at UTC noon for a given date to avoid timezone issues
 */
const createDateAtUTCNoon = (date: Date): Date => {
  // Create a new date set to noon UTC for the same date
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12, 0, 0, 0
  ));
};

/**
 * Formats a Date object to YYYY-MM-DD format for consistent storage
 * This function ensures dates are stored in a format that won't be affected by timezones
 */
const formatDateForStorage = (date: Date): string => {
  // We don't create a new UTC noon date here - we expect the date to already be properly handled
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Parses a YYYY-MM-DD string into a Date object at UTC noon
 */
const parseStoredDate = (dateString: string): Date => {
  // Parse the date components
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create a UTC date at noon
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
};

/**
 * Formats a YYYY-MM-DD string for display
 */
const formatDisplayDate = (dateStr: string): string => {
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
const getLocalDateString = (date: Date): string => {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Creates a week's worth of dates starting from a given date, all at UTC noon
 */
const createWeekDates = (startDate: Date): Date[] => {
  // Ensure start date is at UTC noon
  const utcNoonStartDate = createDateAtUTCNoon(startDate);
  
  return Array.from({ length: 7 }, (_, i) => {
    // Create a new date object for each day to avoid mutating the original
    const newDate = new Date(utcNoonStartDate);
    // Use UTC date methods for consistency
    newDate.setUTCDate(utcNoonStartDate.getUTCDate() + i);
    return newDate;
  });
};

/**
 * Converts a local date to a consistent UTC noon date
 * This is crucial for form input dates which might be in local timezone
 */
const localDateToUTCNoon = (localDate: Date): Date => {
  // Extract local year, month, day
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();
  
  // Create new UTC date at noon using these components
  return new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
};

/**
 * Formats a date safely for display, handling various input formats
 * and ensuring consistent output regardless of timezone
 */
const formatSafeDate = (dateString: string, formatStr: string = "PP"): string => {
  try {
    if (!dateString) {
      return "Invalid date";
    }
    
    // Parse the date string to a Date object
    let dateObj: Date;
    
    if (dateString.includes('T')) {
      // Handle ISO format strings
      dateObj = new Date(dateString);
      
      // Check if valid
      if (isNaN(dateObj.getTime())) {
        throw new Error(`Invalid ISO date: ${dateString}`);
      }
    } else {
      // Handle YYYY-MM-DD format
      const [year, month, day] = dateString.split('-').map(Number);
      if (!year || !month || !day) {
        throw new Error(`Invalid date format: ${dateString}`);
      }
      
      // Create date at UTC noon to avoid timezone issues
      dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    }
    
    // Use date-fns format function
    return format(dateObj, formatStr);
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
    return "Invalid date";
  }
};

/**
 * Gets the Monday of the week containing the given date
 */
const getWeekStartDate = (date: Date): Date => {
  const utcNoonDate = createDateAtUTCNoon(date);
  const day = utcNoonDate.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // If Sunday, go back 6 days, else adjust to Monday
  
  const monday = new Date(utcNoonDate);
  monday.setUTCDate(utcNoonDate.getUTCDate() + diff);
  return monday;
};

/**
 * Standardizes a date string to YYYY-MM-DD format
 * Safely handles both ISO dates and YYYY-MM-DD strings
 */
const standardizeDateString = (dateStr: string): string => {
  if (!dateStr) return '';
  
  try {
    if (dateStr.includes('T')) {
      // It's an ISO date string
      const date = new Date(dateStr);
      return formatDateForStorage(createDateAtUTCNoon(date));
    } else {
      // It's already YYYY-MM-DD, validate it
      const [year, month, day] = dateStr.split('-').map(Number);
      if (!year || !month || !day) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }
      return dateStr;
    }
  } catch (error) {
    console.error(`Error standardizing date: ${dateStr}`, error);
    return '';
  }
};

/**
 * Checks if two dates are the same day in UTC
 */
const isSameUTCDay = (date1: string | Date, date2: string | Date): boolean => {
  const d1 = typeof date1 === 'string' ? parseStoredDate(date1) : createDateAtUTCNoon(date1);
  const d2 = typeof date2 === 'string' ? parseStoredDate(date2) : createDateAtUTCNoon(date2);
  
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
};

/**
 * Creates proper date range boundaries for filtering data
 * Returns start of day and end of day in UTC
 */
const createDateBoundaries = (startDateStr: string, endDateStr: string): { start: Date, end: Date } => {
  // Parse dates to UTC noon format for consistency
  const startDate = parseStoredDate(startDateStr);
  const endDate = parseStoredDate(endDateStr);
  
  // Create boundaries at start of day and end of day in UTC
  return {
    start: new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
      0, 0, 0, 0
    )),
    end: new Date(Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate(),
      23, 59, 59, 999
    ))
  };
};

/**
 * Determines if a date string falls within a date range
 * Safely handles both ISO dates and YYYY-MM-DD strings
 */
const isDateInRange = (dateStr: string, startDateStr: string, endDateStr: string): boolean => {
  if (!dateStr || !startDateStr || !endDateStr) return false;
  
  try {
    // Ensure we're working with standardized dates
    const standardDate = standardizeDateString(dateStr);
    const standardStart = standardizeDateString(startDateStr);
    const standardEnd = standardizeDateString(endDateStr);
    
    // Parse all dates to UTC noon for consistent comparison
    const date = parseStoredDate(standardDate);
    const startDate = parseStoredDate(standardStart);
    const endDate = parseStoredDate(standardEnd);
    
    // Check if date is within range (inclusive)
    return date >= startDate && date <= endDate;
  } catch (error) {
    console.error(`Error checking date range: ${dateStr} in ${startDateStr} to ${endDateStr}`, error);
    return false;
  }
};

// Export all date utilities in a single export statement
export { 
  createDateAtUTCNoon, 
  formatDateForStorage, 
  parseStoredDate, 
  formatDisplayDate,
  getLocalDateString,
  createWeekDates,
  localDateToUTCNoon,
  formatSafeDate,
  addDays,
  format,
  getWeekStartDate,
  standardizeDateString,
  isSameUTCDay,
  createDateBoundaries,
  isDateInRange,
  isWithinInterval,
  parseISO,
  startOfDay,
  endOfDay
};

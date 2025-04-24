
/**
 * Date utilities to ensure consistent date handling across the application.
 * These utilities help with timezone-related issues when storing and displaying dates.
 */

import { addDays, format } from "date-fns";

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
export const formatDateForStorage = (date: Date): string => {
  // We don't create a new UTC noon date here - we expect the date to already be properly handled
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Parses a YYYY-MM-DD string into a Date object at UTC noon
 */
export const parseStoredDate = (dateString: string): Date => {
  // Parse the date components
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create a UTC date at noon
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
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

/**
 * Creates a week's worth of dates starting from a given date, all at UTC noon
 */
export const createWeekDates = (startDate: Date): Date[] => {
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
export const localDateToUTCNoon = (localDate: Date): Date => {
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
export const formatSafeDate = (dateString: string, formatStr: string = "PP"): string => {
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

// Export all the date utilities
export { createDateAtUTCNoon, addDays, format };

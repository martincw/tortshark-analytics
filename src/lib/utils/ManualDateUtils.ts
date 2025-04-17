
export const formatDateForStorage = (date: Date): string => {
  // Create Date object at midnight UTC
  const utcDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0, 0, 0, 0
  ));
  
  // Convert to YYYY-MM-DD format for storage
  return utcDate.toISOString().split('T')[0];
};

export const parseStoredDate = (dateString: string): Date => {
  // Parse YYYY-MM-DD string and create date at midnight UTC
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const formatDisplayDate = (dateStr: string): string => {
  // Parse YYYY-MM-DD string and create date at midnight UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC' // Important: Use UTC when formatting
  });
};

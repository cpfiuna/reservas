
import { addDays, isBefore, isToday as isDateToday } from 'date-fns';

// Check if two dates represent the same day
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();
};

// Get the beginning of the day
export const startOfDay = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

// Check if a time slot is in the past (for today)
export const isPastTimeSlot = (time: string): boolean => {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  return now.getHours() > hours || (now.getHours() === hours && now.getMinutes() > minutes);
};

// Get the next time slot based on the current one
export const getNextTimeSlot = (time: string): string => {
  const [hour, minute] = time.split(':').map(Number);
  if (minute === 30) {
    return `${(hour + 1).toString().padStart(2, '0')}:00`;
  } else {
    return `${hour.toString().padStart(2, '0')}:30`;
  }
};

// Format a time string to remove seconds
export const formatTimeWithoutSeconds = (timeString: string): string => {
  if (!timeString) return '';
  // If the time has seconds (contains two colons), remove the seconds part
  if (timeString.split(':').length > 2) {
    return timeString.split(':').slice(0, 2).join(':');
  }
  return timeString;
};

// Standardize time format for comparison (HH:MM) without seconds
export const standardizeTimeFormat = (timeString: string): string => {
  if (!timeString) return '';
  return timeString.split(':').slice(0, 2).join(':');
};

// Check if time slot is equal to or between start and end time
export const isTimeSlotInRange = (timeSlot: string, startTime: string, endTime: string): boolean => {
  const standardTimeSlot = standardizeTimeFormat(timeSlot);
  const standardStart = standardizeTimeFormat(startTime);
  const standardEnd = standardizeTimeFormat(endTime);
  
  // Important: For the end time, we need to check if it's EXACTLY equal to the slot
  // or if the slot is between start and end (inclusive for start, exclusive for end)
  return standardTimeSlot === standardStart || 
         standardTimeSlot === standardEnd || 
         (standardTimeSlot > standardStart && standardTimeSlot < standardEnd);
};


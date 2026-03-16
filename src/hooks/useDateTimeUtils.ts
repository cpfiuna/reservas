
import { isSameDay as isSameDayDateFns } from 'date-fns';
import { BlockedDate } from '@/types/reservation';

export const useDateTimeUtils = () => {
  // Helper to convert date and time string to a Date object
  const timeToDate = (date: Date, timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  // Helper to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    // Use the dates' calendar components directly to compare days
    // This approach ignores timezone issues and focuses on calendar date
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Check if two time ranges overlap
  const doTimeRangesOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    // Compare times as strings for simplicity
    // This works because the time format is HH:MM and can be compared lexicographically
    return start1 < end2 && end1 > start2;
  };

  // Check if a date is within a blocked period
  const isDateWithinBlockedPeriod = (date: Date, blockedDates: BlockedDate[]): boolean => {
    return blockedDates.some(blockedDate => {
      // Use our improved isSameDay comparison
      return isSameDay(date, blockedDate.fecha);
    });
  };

  // Check if a time slot is within a blocked period
  const isTimeSlotWithinBlockedPeriod = (
    date: Date,
    startTime: string,
    endTime: string,
    blockedDates: BlockedDate[]
  ): boolean => {
    return blockedDates.some(blockedDate => {
      if (!isSameDay(date, blockedDate.fecha)) {
        return false;
      }

      // If the blocked date has specific start and end times
      if (blockedDate.start_time && blockedDate.end_time) {
        // Check if the time ranges overlap
        return doTimeRangesOverlap(
          startTime,
          endTime,
          blockedDate.start_time,
          blockedDate.end_time
        );
      }
      
      // If there's no specific time range, the entire day is blocked
      return true;
    });
  };

  return {
    timeToDate,
    isSameDay,
    doTimeRangesOverlap,
    isDateWithinBlockedPeriod,
    isTimeSlotWithinBlockedPeriod
  };
};

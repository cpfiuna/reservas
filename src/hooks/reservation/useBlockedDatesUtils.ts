
import { isBefore, startOfDay } from 'date-fns';
import { BlockedDate } from '@/types/reservation';
import { timeOptions } from '@/utils/timeUtils';

export const useBlockedDatesUtils = (
  blockedDates: BlockedDate[],
  isTimeSlotAvailable: (date: Date, startTime: string, endTime: string) => boolean
) => {
  // Check if a specific date is in the blocked dates array
  const isDateBlocked = (date: Date): boolean => {
    // Disable recurring Sundays site-wide
    if (date.getDay() === 0) {
      return true;
    }

    return blockedDates.some(blockedDate => 
      blockedDate.fecha.getDate() === date.getDate() && 
      blockedDate.fecha.getMonth() === date.getMonth() && 
      blockedDate.fecha.getFullYear() === date.getFullYear()
    );
  };

  // Check if a date should be disabled in the calendar
  const disabledDays = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Disable past dates
    if (isBefore(date, today)) {
      return true;
    }
    
    // Disable explicitly blocked dates
    if (isDateBlocked(date)) {
      return true;
    }
    
    // Check if there's at least one available time slot for this date
    const anySlotAvailable = timeOptions.some(startTime => 
      timeOptions.some(endTime => 
        endTime > startTime && isTimeSlotAvailable(date, startTime, endTime)
      )
    );
    
    // Disable dates with no available time slots
    return !anySlotAvailable;
  };

  return {
    isDateBlocked,
    disabledDays
  };
};

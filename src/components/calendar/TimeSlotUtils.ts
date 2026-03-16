
import { isBefore as isBeforeDateFns, startOfDay } from 'date-fns';

export const handleTimeSlotClick = (
  date: Date, 
  time: string, 
  navigate: (path: string) => void
) => {
  if (isBeforeDateFns(date, startOfDay(new Date()))) {
    return;
  }
  
  const [startHour, startMinute] = time.split(':').map(Number);
  let endHour = startHour + 1;
  let endMinute = startMinute;
  
  if (endHour > 22) {
    endHour = 22;
    endMinute = 30;
  }
  
  const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  
  // Format the date correctly to prevent timezone issues
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  navigate(`/nueva-reserva?fecha=${formattedDate}&hora=${time}&fin=${endTime}`);
};

// Helper function to check if date is before another date
export const compareDates = (date1: Date, date2: Date): boolean => {
  return date1.getTime() < date2.getTime();
};

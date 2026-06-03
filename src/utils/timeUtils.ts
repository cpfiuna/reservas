
// Default opening hours used when a venue's hours are not (yet) known.
export const DEFAULT_HOUR_START = 8;
export const DEFAULT_HOUR_END = 22;

// Parse a "HH:MM" / "HH:MM:SS" string into a whole hour. Falls back to the
// provided default if the value is missing or malformed.
export const parseHour = (value: string | null | undefined, fallback: number): number => {
  if (!value) return fallback;
  const hour = parseInt(value.split(':')[0], 10);
  return Number.isFinite(hour) ? hour : fallback;
};

// Helper function to generate time options for a given opening-hours range.
export const generateTimeOptions = (
  startHour: number = DEFAULT_HOUR_START,
  endHour: number = DEFAULT_HOUR_END
) => {
  const options = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    const hourString = hour.toString().padStart(2, '0');
    options.push(`${hourString}:00`);
    if (hour < endHour) {
      options.push(`${hourString}:30`);
    }
  }
  return options;
};

export const timeOptions = generateTimeOptions();

// Validate email format
export const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Check if two dates are the same day
export const isSameDay = (date1: Date, date2: Date) => {
  return date1.getDate() === date2.getDate() && 
         date1.getMonth() === date2.getMonth() && 
         date1.getFullYear() === date2.getFullYear();
};


// Helper function to generate time options
export const generateTimeOptions = () => {
  const options = [];
  // Start time from 8:00 (changing from 7:00)
  for (let hour = 8; hour <= 22; hour++) {
    const hourString = hour.toString().padStart(2, '0');
    options.push(`${hourString}:00`);
    if (hour < 22) {
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

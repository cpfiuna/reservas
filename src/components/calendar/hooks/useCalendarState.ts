
import { useState, useEffect } from 'react';
import { format, addDays, addWeeks, subWeeks, addMonths, subMonths, startOfDay } from 'date-fns';

export type ViewType = 'month' | 'week' | 'day' | 'agenda';

export const useCalendarState = () => {
  // Use sessionStorage to persist view state across refreshes
  const [currentDate, setCurrentDate] = useState(() => {
    const savedDate = sessionStorage.getItem('calendarDate');
    return savedDate ? new Date(savedDate) : new Date();
  });
  
  const [view, setView] = useState<ViewType>(() => {
    const savedView = sessionStorage.getItem('calendarView');
    return (savedView as ViewType) || 'month';
  });
  
  // Save state to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('calendarDate', currentDate.toISOString());
    sessionStorage.setItem('calendarView', view);
  }, [currentDate, view]);

  const nextHandler = () => {
    switch(view) {
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case 'agenda':
        break;
    }
  };

  const prevHandler = () => {
    switch(view) {
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, -1));
        break;
      case 'agenda':
        break;
    }
  };

  const todayHandler = () => {
    setCurrentDate(new Date());
  };

  return {
    currentDate,
    setCurrentDate,
    view,
    setView,
    nextHandler,
    prevHandler,
    todayHandler
  };
};

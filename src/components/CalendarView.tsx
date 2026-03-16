
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useReservations } from '@/context/ReservationContext';
import { useAuth } from '@/context/AuthContext';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarViewContent from '@/components/calendar/CalendarViewContent';
import ReservationLegend from '@/components/calendar/ReservationLegend';
import LoadingState from '@/components/calendar/LoadingState';
import ErrorState from '@/components/calendar/ErrorState';
import { useCalendarState } from '@/components/calendar/hooks/useCalendarState';
import { useReservationUpdates } from '@/components/calendar/hooks/useReservationUpdates';
import { handleTimeSlotClick } from '@/components/calendar/TimeSlotUtils';
import { shouldShowReservation } from '@/utils/reservationStyles';

const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { reservations, isDateBlocked, isTimeSlotAvailable, isLoading, dataInitialized } = useReservations();
  
  // Use the extracted hooks
  const { 
    currentDate, 
    setCurrentDate, 
    view, 
    setView, 
    nextHandler, 
    prevHandler, 
    todayHandler 
  } = useCalendarState();
  
  // For monthly view, filter reservations based on admin status
  // For week/day views, pass all reservations and let individual components handle filtering
  const getFilteredReservations = (viewType: string) => {
    if (viewType === 'month') {
      return reservations.filter(reservation => shouldShowReservation(reservation, isAdmin));
    }
    // For week and day views, return all reservations so past ones can be shown to admins
    return reservations;
  };
  
  const filteredReservations = getFilteredReservations(view);
  
  // Use the reservation updates hook for side effects
  useReservationUpdates(reservations, isLoading, dataInitialized);

  // Handler for day click in month view
  const handleDayClick = (day: Date) => {
    // Prevent navigating to Sundays
    if (day.getDay && day.getDay() === 0) return;
    setCurrentDate(day);
    setView('day');
  };

  // Delegate to the extracted utility function
  const onTimeSlotClick = (date: Date, time: string) => {
    handleTimeSlotClick(date, time, navigate);
  };

  // Handle the case when data is still initializing
  if (isLoading) {
    return <LoadingState />;
  }

  // Handle the case when there was an error loading data
  if (!isLoading && filteredReservations.length === 0 && reservations.length === 0 && !dataInitialized) {
    return <ErrorState />;
  }

  return (
    <div className="bg-white p-2 sm:p-4 rounded-lg shadow-sm border border-gray-100 animate-fade-in w-full">
      <CalendarHeader 
        currentDate={currentDate}
        view={view}
        onPrev={prevHandler}
        onNext={nextHandler}
        onToday={todayHandler}
        onViewChange={setView}
      />
      
      <ReservationLegend />
      
      <CalendarViewContent
        view={view}
        currentDate={currentDate}
        reservations={filteredReservations}
        isDateBlocked={isDateBlocked}
        isTimeSlotAvailable={isTimeSlotAvailable}
        onDayClick={handleDayClick}
        onTimeSlotClick={onTimeSlotClick}
      />
    </div>
  );
};

export default CalendarView;

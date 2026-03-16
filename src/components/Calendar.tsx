import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, addWeeks, addDays, parse, parseISO, isToday, isAfter, isBefore, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ViewType, Reservation } from '@/lib/types';
import { getReservations } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get('date');
    if (dateParam) {
      try {
        const parsedDate = parseISO(dateParam);
        if (!isNaN(parsedDate.getTime())) {
          setCurrentDate(parsedDate);
        }
      } catch (e) {
        }
    }
  }, [location.search]);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReservations();
      const filteredData = data?.map(reservation => ({
        ...reservation,
        responsable: reservation.responsable === 'Admin' ? reservation.responsable : 'Reservado',
        email: reservation.responsable === 'Admin' ? reservation.email : '',
        cantidadPersonas: reservation.responsable === 'Admin' ? reservation.cantidadPersonas : 0
      })) || [];
      
      setReservations(filteredData);
    } catch (error) {
      } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reservations' 
      }, payload => {
        fetchReservations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReservations]);

  const nextDate = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (view === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const prevDate = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, -1));
    } else if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, -1));
    } else if (view === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const navigateToDate = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };

  const getReservationsForDay = (day: Date) => {
    const formattedDate = format(day, 'yyyy-MM-dd');
    return reservations.filter(reservation => reservation.fecha === formattedDate);
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const dateFormat = "d";
    const rows = [];
    
    let days = [];
    let day = startDate;
    let formattedDate = "";
    
    const daysOfWeek = [];
    const dayOfWeekFormat = "EEE";
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
      daysOfWeek.push(
        <div key={`header-${i}`} className="text-center font-medium text-xs uppercase py-2">
          {format(dayOfWeek, dayOfWeekFormat, { locale: es })}
        </div>
      );
    }
    
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const isSunday = cloneDay.getDay() === 0;
        const dayReservations = getReservationsForDay(cloneDay);
        const isPastDay = isBefore(day, new Date().setHours(0, 0, 0, 0));
        days.push(
          <div
            key={day.toString()}
            className={`relative p-2 border border-gray-100 min-h-[80px] overflow-hidden 
              ${!isSameMonth(day, monthStart) ? "bg-gray-50 text-gray-400" : ""}
              ${isToday(day) ? "bg-fiuna-red/10" : ""}
              ${isPastDay ? "opacity-60" : ""}
              ${isSunday ? "opacity-50 bg-gray-100 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}
            onClick={() => { if (!isSunday) navigateToDate(cloneDay); }}
          >
            <span className={`text-sm font-medium ${isToday(day) ? "text-fiuna-red" : ""}`}>
              {formattedDate}
            </span>
            <div className="mt-1 space-y-1 max-h-[60px] overflow-y-auto text-xs">
              {dayReservations.slice(0, 3).map((reservation, idx) => (
                <div 
                  key={idx} 
                  className="bg-fiuna-red text-white p-1 rounded truncate"
                  title={reservation.motivo}
                >
                  {reservation.horaInicio.substring(0, 5)} - {reservation.horaFin.substring(0, 5)}
                </div>
              ))}
              {dayReservations.length > 3 && (
                <div className="text-xs text-gray-500 mt-1">
                  +{dayReservations.length - 3} más
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }
    
    return (
      <div className="w-full">
        <div className="grid grid-cols-7">
          {daysOfWeek}
        </div>
        {rows}
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-8 border-b">
            <div className="py-2 text-center font-medium text-xs">Hora</div>
            {days.map((day, i) => (
              <div 
                key={i} 
                className={`py-2 text-center font-medium text-xs 
                  ${isSameDay(day, new Date()) ? "text-fiuna-red" : ""}
                  ${day.getDay() === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:underline'}`}
                onClick={() => { if (day.getDay() !== 0) navigateToDate(day); }}
              >
                {format(day, 'EEEE, d', { locale: es })}
              </div>
            ))}
          </div>
          
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b">
              <div className="py-3 text-center text-xs font-medium border-r">
                {hour}:00
              </div>
              
              {days.map((day, i) => {
                const isSunday = day.getDay() === 0;
                const dateStr = format(day, 'yyyy-MM-dd');
                const hourReservations = reservations.filter(res => {
                  const startHour = parseInt(res.horaInicio.split(':')[0]);
                  const endHour = parseInt(res.horaFin.split(':')[0]);
                  return (
                    res.fecha === dateStr && 
                    ((startHour <= hour && endHour > hour) || 
                     (startHour === hour))
                  );
                });
                
                return (
                  <div 
                    key={i} 
                    className="py-3 px-1 text-center relative min-h-[60px] cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (isSunday) return;
                      if (hourReservations.length === 0) {
                        const startTime = `${hour.toString().padStart(2, '0')}:00`;
                        const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
                        navigate(`/form?date=${dateStr}&startTime=${startTime}&endTime=${endTime}`);
                      } else {
                        navigateToDate(day);
                      }
                    }}
                  >
                    {hourReservations.map((res, idx) => (
                      <div 
                        key={idx}
                        className="absolute inset-x-1 top-1 bottom-1 bg-fiuna-red/90 text-white text-xs p-1 rounded overflow-hidden"
                        title={`${res.motivo} - ${res.responsable}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToDate(day);
                        }}
                      >
                        <div className="text-left">
                          <span className="font-medium block">{res.horaInicio.substring(0, 5)} - {res.horaFin.substring(0, 5)}</span>
                          <div className="truncate text-left">{res.motivo}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const isSundayDay = currentDate.getDay() === 0;
    
    return (
      <div className="border rounded-md overflow-hidden">
        <div className="bg-gray-50 p-3 border-b text-center">
          <h3 className="font-medium">
            {format(currentDate, 'EEEE, d MMMM yyyy', { locale: es })}
          </h3>
        </div>
        {isSundayDay && (
          <div className="p-4 bg-yellow-50 text-yellow-900 text-center text-sm">No se permiten reservas los domingos</div>
        )}
        
        {hours.map(hour => {
          const hourReservations = reservations.filter(res => {
            const startHour = parseInt(res.horaInicio.split(':')[0]);
            const endHour = parseInt(res.horaFin.split(':')[0]);
            return (
              res.fecha === dateStr && 
              ((startHour <= hour && endHour > hour) || (startHour === hour))
            );
                ) : (
                  <div 
                    className={`text-sm text-gray-400 h-full flex items-center justify-center ${isSundayDay ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 hover:text-fiuna-red group'}`}
                    onClick={() => {
                      if (isSundayDay) return;
                      const startTime = `${hour.toString().padStart(2, '0')}:00`;
                      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
                      navigate(`/form?date=${dateStr}&startTime=${startTime}&endTime=${endTime}`);
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <span>{isSundayDay ? 'No disponible' : 'Disponible'}</span>
                      {!isSundayDay && (
                        <span className="mt-1 opacity-0 group-hover:opacity-100 flex items-center text-xs">
                          <Plus className="h-3 w-3 mr-1" /> Reservar
                        </span>
                      )}
                    </div>
                  </div>
                        <Clock className="h-3 w-3 mr-1" /> 
                        {res.horaInicio.substring(0, 5)} - {res.horaFin.substring(0, 5)}
                      </div>
                      <div className="mt-1 text-sm">{res.motivo}</div>
                      <div className="mt-1 text-xs opacity-80">{res.responsable}</div>
                    </div>
                  ))
                ) : (
                  <div 
                    className="text-sm text-gray-400 h-full flex items-center justify-center cursor-pointer hover:bg-gray-50 hover:text-fiuna-red group"
                    onClick={() => {
                      const startTime = `${hour.toString().padStart(2, '0')}:00`;
                      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
                      navigate(`/form?date=${dateStr}&startTime=${startTime}&endTime=${endTime}`);
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <span>Disponible</span>
                      <span className="mt-1 opacity-0 group-hover:opacity-100 flex items-center text-xs">
                        <Plus className="h-3 w-3 mr-1" /> Reservar
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAgendaView = () => {
    const groupedReservations: Record<string, Reservation[]> = {};
    
    reservations.forEach(reservation => {
      if (!groupedReservations[reservation.fecha]) {
        groupedReservations[reservation.fecha] = [];
      }
      groupedReservations[reservation.fecha].push(reservation);
    });
    
    const sortedDates = Object.keys(groupedReservations).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });
    
    return (
      <div className="divide-y">
        {sortedDates.length > 0 ? (
          sortedDates.map(date => {
            const parsedDate = parseISO(date);
            return (
              <div key={date} className="py-4">
                <h3 className="font-medium mb-2">
                  {format(parsedDate, 'EEEE, d MMMM yyyy', { locale: es })}
                </h3>
                <div className="space-y-2">
                  {groupedReservations[date].map((reservation, idx) => (
                    <div 
                      key={idx} 
                      className="bg-white p-3 rounded-md shadow-sm border flex flex-col sm:flex-row sm:items-center gap-4"
                    >
                      <div className="bg-fiuna-red/10 text-fiuna-red p-2 rounded-md text-center font-medium min-w-20">
                        {reservation.horaInicio.substring(0, 5)} - {reservation.horaFin.substring(0, 5)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{reservation.motivo}</div>
                        {reservation.responsable === 'Admin' && (
                          <div className="text-sm text-gray-600">Bloqueado por administración</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-gray-500">
            No hay reservas programadas
          </div>
        )}
      </div>
    );
  };

  const renderCalendarView = () => {
    switch (view) {
      case 'month':
        return renderMonthView();
      case 'week':
        return renderWeekView();
      case 'day':
        return renderDayView();
      case 'agenda':
        return renderAgendaView();
      default:
        return renderMonthView();
    }
  };

  const renderViewTitle = () => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: es });
      case 'week':
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`;
      case 'day':
        return format(currentDate, 'd MMMM yyyy', { locale: es });
      case 'agenda':
        return 'Agenda de Reservas';
      default:
        return '';
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm neo-morphism p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-1">
            <CalendarIcon className="h-5 w-5 text-fiuna-red" />
            <h2 className="text-xl font-bold text-fiuna-black">Calendario de Reservas</h2>
          </div>
          
          <div className="flex flex-wrap items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className={`text-xs ${view === 'month' ? 'bg-fiuna-red text-white' : ''}`}
              onClick={() => setView('month')}
            >
              Mes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`text-xs ${view === 'week' ? 'bg-fiuna-red text-white' : ''}`}
              onClick={() => setView('week')}
            >
              Semana
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`text-xs ${view === 'day' ? 'bg-fiuna-red text-white' : ''}`}
              onClick={() => setView('day')}
            >
              Día
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`text-xs ${view === 'agenda' ? 'bg-fiuna-red text-white' : ''}`}
              onClick={() => setView('agenda')}
            >
              Agenda
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium capitalize">
            {renderViewTitle()}
          </h3>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={prevDate}
              className="rounded-full h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="text-xs"
            >
              Hoy
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={nextDate}
              className="rounded-full h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="overflow-auto">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-fiuna-red border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-gray-600">Cargando reservas...</p>
            </div>
          ) : (
            <div className="mt-2">
              {renderCalendarView()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;



import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewType = 'month' | 'week' | 'day' | 'agenda';

interface CalendarHeaderProps {
  currentDate: Date;
  view: ViewType;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: ViewType) => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  view,
  onPrev,
  onNext,
  onToday,
  onViewChange
}) => {
  const renderDateDisplay = () => {
    let dateFormat = '';
    let dateContent = '';
    
    switch(view) {
      case 'month':
        dateFormat = 'MMMM yyyy';
        dateContent = format(currentDate, dateFormat, { locale: es });
        break;
      case 'week':
        dateContent = getWeekRangeText();
        break;
      case 'day':
        dateFormat = 'EEEE d MMMM, yyyy';
        dateContent = format(currentDate, dateFormat, { locale: es });
        break;
      case 'agenda':
        dateContent = 'Próximas reservas';
        break;
    }
    
    return (
      <div className="text-lg font-medium">
        {dateContent}
      </div>
    );
  };
  
  const getWeekRangeText = () => {
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const startDateText = format(startDate, 'd', { locale: es });
    const endDateText = format(endDate, 'd', { locale: es });
    const monthYearText = format(currentDate, 'MMMM yyyy', { locale: es });
    
    return `${startDateText} - ${endDateText} ${monthYearText}`;
  };
  
  return (
    <div className="mb-4 md:mb-6">
      <div className="flex flex-col md:flex-row justify-between items-center md:items-center space-y-3 md:space-y-0 calendar-header-mobile">
        {/* Left column */}
        <div className="flex flex-col items-center md:items-start">
          <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 text-fiuna-gray">
            Calendario de Reservas
          </h1>
          {renderDateDisplay()}
        </div>
        
        {/* Right column */}
        <div className="flex flex-col items-center md:items-end space-y-3 md:space-y-4">
          <div className="flex space-x-1">
            <Button 
              variant={view === 'month' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => onViewChange('month')}
              className="text-xs"
            >
              Mes
            </Button>
            <Button 
              variant={view === 'week' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => onViewChange('week')}
              className="text-xs"
            >
              Semana
            </Button>
            <Button 
              variant={view === 'day' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => onViewChange('day')}
              className="text-xs"
            >
              Día
            </Button>
            <Button 
              variant={view === 'agenda' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => onViewChange('agenda')}
              className="text-xs"
            >
              Agenda
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onToday}
            >
              Hoy
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;

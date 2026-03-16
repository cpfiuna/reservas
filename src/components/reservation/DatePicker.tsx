
import React from 'react';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  id: string;
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  disabledDays?: (date: Date) => boolean;
  error?: string;
  noAvailableTimes?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  disabled = false,
  disabledDays,
  error,
  noAvailableTimes
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            id={id}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-gray-500",
              error && "border-red-500",
              noAvailableTimes && "border-yellow-500"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd 'de' MMMM, yyyy", { locale: es }) : <span>Seleccionar fecha</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            disabled={disabledDays}
            locale={es}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {noAvailableTimes && !error && (
        <p className="text-yellow-600 text-sm">No hay horarios disponibles para esta fecha</p>
      )}
    </div>
  );
};

export default DatePicker;

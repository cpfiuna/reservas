
import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';

interface TimeSelectorProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  error?: string;
  updateEndTimes?: (value: string) => void;
  onValueChange?: (value: string) => void; // Add this prop to support both naming conventions
}

const TimeSelector: React.FC<TimeSelectorProps> = ({
  id,
  label,
  value,
  onChange,
  onValueChange, // Support both naming conventions
  options,
  disabled = false,
  error,
  updateEndTimes
}) => {
  const handleChange = (newValue: string) => {
    // Call both onChange and onValueChange if they exist
    if (onChange) onChange(newValue);
    if (onValueChange) onValueChange(newValue);
    
    if (updateEndTimes) {
      updateEndTimes(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={handleChange}
        disabled={disabled || options.length === 0}
      >
        <SelectTrigger id={id} className={`w-full ${error ? 'border-red-500' : ''}`}>
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Seleccionar horario" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {options.length > 0 ? (
            options.map(time => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-1 text-sm text-gray-500">
              No hay horarios disponibles
            </div>
          )}
        </SelectContent>
      </Select>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default TimeSelector;

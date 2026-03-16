import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CalendarX } from 'lucide-react';

// Generate time options from 7:00 to 22:00
const timeOptions = (() => {
  const options = [];
  for (let hour = 7; hour <= 22; hour++) {
    const hourString = hour.toString().padStart(2, '0');
    options.push(`${hourString}:00`);
    if (hour < 22) {
      options.push(`${hourString}:30`);
    }
  }
  return options;
})();

interface BlockDateFormProps {
  onBlockSuccess: () => void;
}

const BlockDateForm: React.FC<BlockDateFormProps> = ({ onBlockSuccess }) => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [blockStartTime, setBlockStartTime] = useState('');
  const [blockEndTime, setBlockEndTime] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const resetBlockForm = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setBlockStartTime('');
    setBlockEndTime('');
    setBlockReason('');
  };

  const handleBlock = async () => {
    if (!startDate) {
      toast.error('Debe seleccionar una fecha de inicio');
      return;
    }
    
    if (!blockStartTime || !blockEndTime) {
      toast.error('Debe seleccionar horarios de inicio y fin');
      return;
    }

    try {
      // If no end date is specified, just block the single start date
      // If end date is specified, create a range of dates to block
      const datesToBlock: Date[] = [];
      
      if (!endDate || startDate.getTime() === endDate.getTime()) {
        // Single date blocking
        datesToBlock.push(startDate);
      } else {
        // Date range blocking - more robust implementation
        const currentDate = new Date(startDate.getTime());
        const lastDate = new Date(endDate.getTime());
        
        while (currentDate <= lastDate) {
          datesToBlock.push(new Date(currentDate.getTime()));
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      // Create a blocked date entry for each date in the range
      for (const date of datesToBlock) {
        const blockData = {
          fecha: format(date, 'yyyy-MM-dd'),
          motivo: blockReason || 'Bloqueo administrativo',
          start_time: blockStartTime,
          end_time: blockEndTime
        };

        const { error } = await supabase
          .from('blocked_dates')
          .insert(blockData);

        if (error) throw error;
      }

      toast.success('Periodo bloqueado exitosamente');
      resetBlockForm();
      onBlockSuccess();
    } catch (error) {

      toast.error('Error al bloquear el periodo');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Bloquear Fechas</CardTitle>
        <CardDescription>
          {startDate ? 
            endDate && endDate !== startDate ? 
              `Periodo: ${format(startDate, 'dd/MM/yyyy')} al ${format(endDate, 'dd/MM/yyyy')}` : 
              `Fecha: ${format(startDate, 'dd/MM/yyyy')}` : 
            'Seleccione fecha(s) para bloquear'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="pr-4">
          <div className="space-y-4">
            <div className="flex justify-center mb-4">
              <Calendar
                mode="range"
                selected={{
                  from: startDate,
                  to: endDate
                }}
                onSelect={(range) => {
                  setStartDate(range?.from);
                  setEndDate(range?.to);
                }}
                disabled={(date) => differenceInDays(date, new Date()) < 0}
                locale={es}
                className="rounded-md border mx-auto"
              />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora inicio</Label>
                  <Select
                    value={blockStartTime}
                    onValueChange={setBlockStartTime}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={`start-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hora fin</Label>
                  <Select
                    value={blockEndTime}
                    onValueChange={setBlockEndTime}
                    disabled={!blockStartTime}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions
                        .filter(time => !blockStartTime || time > blockStartTime)
                        .map(time => (
                          <SelectItem key={`end-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ingrese motivo del bloqueo"
                />
              </div>

              <Button 
                className="w-full mt-4" 
                disabled={!startDate || !blockStartTime || !blockEndTime}
                onClick={handleBlock}
              >
                <CalendarX className="mr-2 h-4 w-4" />
                Bloquear Fechas
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default BlockDateForm;

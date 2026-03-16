
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useUrlParams = (
  setFecha: (date: Date) => void,
  setInicio: (time: string) => void,
  setFin: (time: string) => void,
  currentFecha: Date | undefined,
  initialDate?: string | null,
  initialStartTime?: string | null,
  initialEndTime?: string | null
) => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Only process parameters if we don't already have a date selected
    if (!currentFecha) {
      // First priority: URL params
      let fechaParam = searchParams.get('fecha');
      let horaParam = searchParams.get('hora');
      let finParam = searchParams.get('fin');
      
      // Second priority: explicit initial values passed as props
      if (!fechaParam && initialDate) fechaParam = initialDate;
      if (!horaParam && initialStartTime) horaParam = initialStartTime;
      if (!finParam && initialEndTime) finParam = initialEndTime;

      if (fechaParam) {
        try {
          // Parse the date directly without timezone conversion
          // Create a Date object directly from the YYYY-MM-DD format
          // Split the date string and recreate with consistent time component
          const [year, month, day] = fechaParam.split('-').map(Number);
          const newDate = new Date(year, month - 1, day, 12, 0, 0);
          
          setFecha(newDate);
        } catch (error) {
          // Error parsing date
        }
      }

      if (horaParam) {
        setInicio(horaParam);
      }

      if (finParam) {
        setFin(finParam);
      }
    }
  }, [searchParams, setFecha, setInicio, setFin, currentFecha, initialDate, initialStartTime, initialEndTime]);
};

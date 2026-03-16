
import { useState } from 'react';
import { isValidEmail } from '@/utils/timeUtils';
import { toast } from 'sonner';
import { startOfDay, isBefore } from 'date-fns';

export const useReservationFormState = () => {
  // Form state
  const [responsable, setResponsable] = useState('');
  const [email, setEmail] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [personas, setPersonas] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!responsable.trim()) {
      errors.responsable = 'El nombre es obligatorio';
    }
    
    if (!email.trim()) {
      errors.email = 'El correo electrónico es obligatorio';
    } else if (!isValidEmail(email)) {
      errors.email = 'Ingrese un correo electrónico válido';
    }
    
    if (!motivo.trim()) {
      errors.motivo = 'El motivo es obligatorio';
    }

    if (!affiliation) {
      errors.affiliation = 'Seleccione su vínculo con la facultad';
    }
    
    if (!fecha) {
      errors.fecha = 'La fecha es obligatoria';
    } else {
      if (isBefore(fecha, startOfDay(new Date()))) {
        errors.fecha = 'No se pueden realizar reservas para fechas pasadas';
      }
    }
    
    if (!inicio) {
      errors.inicio = 'La hora de inicio es obligatoria';
    } else if (fecha && isToday(fecha)) {
      const currentTime = new Date();
      const [hours, minutes] = inicio.split(':').map(Number);
      if (currentTime.getHours() > hours || (currentTime.getHours() === hours && currentTime.getMinutes() > minutes)) {
        errors.inicio = 'No se pueden realizar reservas para horarios pasados';
      }
    }
    
    if (!fin) {
      errors.fin = 'La hora de fin es obligatoria';
    } else if (inicio && fin && fin <= inicio) {
      errors.fin = 'La hora de fin debe ser posterior a la hora de inicio';
    }
    
    if (!personas || isNaN(Number(personas)) || Number(personas) <= 0) {
      errors.personas = 'Ingrese un número válido de personas';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper function to check if two dates are the same day
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  return {
    formState: {
      responsable,
      setResponsable,
      email,
      setEmail,
      motivo,
      setMotivo,
      fecha,
      setFecha,
      inicio,
      setInicio,
      fin,
      setFin,
      personas,
      setPersonas,
      affiliation,
      setAffiliation,
      formErrors
    },
    validateForm,
    isToday
  };
};

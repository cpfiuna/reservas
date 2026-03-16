
export type ViewType = 'month' | 'week' | 'day' | 'agenda';

export interface Reservation {
  id: string;
  responsable: string;
  email: string;
  motivo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  cantidadPersonas: number;
  createdAt: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  isAvailable: boolean;
  reservation?: Reservation;
}

export interface AdminUser {
  email: string;
  password: string;
}

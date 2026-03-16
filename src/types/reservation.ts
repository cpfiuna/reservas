
export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Reservation {
  id: string;
  responsable: string;
  email: string;
  motivo: string;
  fecha: Date;
  inicio: string;
  fin: string;
  personas: number;
  createdAt: Date;
  approved?: boolean; // Deprecated: kept for backward compatibility
  status: ReservationStatus;
  admin_notes?: string;
  affiliation?: string;
  updated_at?: Date;
  updated_by?: string;
}

export interface BlockedDate {
  id: string;
  fecha: Date;
  motivo: string | null;
  created_at: Date;
  created_by: string | null;
  start_time?: string;
  end_time?: string;
}

export interface ReservationContextType {
  reservations: Reservation[];
  blockedDates: BlockedDate[];
  addReservation: (reservation: Omit<Reservation, 'id' | 'createdAt'>) => Promise<Reservation | null>;
  deleteReservation: (id: string) => Promise<void>;
  updateReservation: (id: string, reservation: Partial<Omit<Reservation, 'id' | 'createdAt'>>) => Promise<void>;
  getReservationsByDate: (date: Date) => Reservation[];
  isTimeSlotAvailable: (date: Date, startTime: string, endTime: string, excludeId?: string) => boolean;
  isDateBlocked: (date: Date) => boolean;
  isLoading: boolean;
  dataInitialized: boolean;
}

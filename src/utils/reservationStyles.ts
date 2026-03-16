/**
 * Utility functions for reservation styling based on approval status
 * This file handles visual styling without affecting backend data
 */

import { Reservation, ReservationStatus } from '@/types/reservation';

export interface ReservationStyleConfig {
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
  opacity?: string;
}

/**
 * Check if a reservation is in the past
 * @param reservation - The reservation to check
 * @returns True if the reservation is past its end time
 */
export const isReservationPast = (reservation: Reservation): boolean => {
  const now = new Date();
  const reservationEnd = new Date(reservation.fecha);
  const [endHours, endMinutes] = reservation.fin.split(':').map(Number);
  reservationEnd.setHours(endHours, endMinutes, 0, 0);
  
  return reservationEnd < now;
};

/**
 * Check if a reservation should be displayed based on user admin status
 * @param reservation - The reservation to check
 * @param isAdmin - Whether the current user is an admin
 * @returns True if the reservation should be displayed
 */
export const shouldShowReservation = (reservation: Reservation, isAdmin: boolean): boolean => {
  const isPast = isReservationPast(reservation);
  // Only show past reservations to admins
  return !isPast || isAdmin;
};

/**
 * Get styling configuration based on reservation status
 * @param status - The reservation status enum
 * @param approved - Legacy boolean field (for backward compatibility)
 * @param isPast - Whether the reservation is in the past
 * @returns Style configuration object
 */
export const getReservationStyle = (status?: ReservationStatus, approved?: boolean, isPast?: boolean): ReservationStyleConfig => {
  // Use status if available, otherwise fall back to approved
  const effectiveStatus = status || (approved === true ? 'approved' : approved === false ? 'pending' : undefined);
  
  if (isPast) {
    // Past reservations: Always use grey regardless of status
    return {
      backgroundColor: 'bg-gray-400',
      textColor: 'text-white',
      borderColor: 'border-gray-400',
      opacity: 'opacity-75',
    };
  }
  
  switch (effectiveStatus) {
    case 'approved':
      // Approved reservations: Red styling
      return {
        backgroundColor: 'bg-fiuna-red',
        textColor: 'text-white',
        borderColor: 'border-fiuna-red',
      };
    case 'pending':
      // Pending reservations: Yellow to indicate waiting
      return {
        backgroundColor: 'bg-yellow-500',
        textColor: 'text-white',
        borderColor: 'border-yellow-500',
      };
    case 'rejected':
      // Rejected reservations: Red with strikethrough or muted
      return {
        backgroundColor: 'bg-red-300',
        textColor: 'text-gray-700',
        borderColor: 'border-red-300',
        opacity: 'opacity-60',
      };
    case 'cancelled':
      // Cancelled reservations: Gray
      return {
        backgroundColor: 'bg-gray-300',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-300',
        opacity: 'opacity-60',
      };
    default:
      // Unknown status: Use neutral gray
      return {
        backgroundColor: 'bg-gray-500',
        textColor: 'text-white',
        borderColor: 'border-gray-500',
      };
  }
};

/**
 * Get CSS classes string for reservation styling
 * @param status - The reservation status enum (preferred)
 * @param approved - Legacy boolean field (for backward compatibility)
 * @param isPast - Whether the reservation is in the past
 * @returns CSS classes string
 */
export const getReservationClasses = (status?: ReservationStatus, approved?: boolean, isPast?: boolean): string => {
  const style = getReservationStyle(status, approved, isPast);
  const classes = `${style.backgroundColor} ${style.textColor}`;
  return style.opacity ? `${classes} ${style.opacity}` : classes;
};

/**
 * Get status text for tooltip or UI display
 * @param status - The reservation status enum (preferred)
 * @param approved - Legacy boolean field (for backward compatibility)
 * @param isPast - Whether the reservation is in the past
 * @returns Human-readable status text in Spanish
 */
export const getReservationStatusText = (status?: ReservationStatus, approved?: boolean, isPast?: boolean): string => {
  // Use status if available, otherwise fall back to approved
  const effectiveStatus = status || (approved === true ? 'approved' : approved === false ? 'pending' : undefined);
  
  if (isPast) {
    return 'Finalizada';
  }
  
  switch (effectiveStatus) {
    case 'approved':
      return 'Aprobada';
    case 'pending':
      return 'Pendiente de aprobación';
    case 'rejected':
      return 'Rechazada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return 'Estado desconocido';
  }
};

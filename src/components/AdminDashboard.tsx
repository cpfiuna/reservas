
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import BlockDateForm from './admin/BlockDateForm';
import ReservationsList from './admin/ReservationsList';
import PendingReservationsList from './admin/PendingReservationsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const sb: any = supabase;
  const [reservations, setReservations] = useState<any[]>([]);
  const [pendingReservations, setPendingReservations] = useState<any[]>([]);
  const [cancelledReservations, setCancelledReservations] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('approved');
  
  useEffect(() => {
    if (!isAdmin) {
      navigate('/login');
      return;
    }
    
    fetchReservations();
    fetchCancelledReservations();
    fetchPendingReservations();
    fetchBlockedDates();
    
    // Subscribe to reservation changes
    const reservationsChannel = sb
      .channel('reservations_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'reservations' }, 
        () => {
          fetchReservations();
          fetchCancelledReservations();
          fetchPendingReservations();
        }
      )
      .subscribe();
      
    // Subscribe to blocked dates changes
    const blockedDatesChannel = sb
      .channel('blocked_dates_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'blocked_dates' }, 
        () => {
          fetchBlockedDates();
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(reservationsChannel);
      sb.removeChannel(blockedDatesChannel);
    };
  }, [isAdmin, navigate]);

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await sb
        .from('reservations')
        .select('*')
        .eq('status', 'approved')
        .not('status', 'eq', 'cancelled')
        .order('fecha', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedReservations = data.map(item => {
          // Explicitly parse the date with local timezone consideration
          const parts = item.fecha.split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS
          const day = parseInt(parts[2], 10);
          const dateObj = new Date(year, month, day, 12, 0, 0); // Set to noon to avoid timezone issues
          
          return {
            ...item,
            fecha: dateObj,
            createdAt: new Date(item.created_at),
            status: item.status || 'pending',
            updated_at: item.updated_at ? new Date(item.updated_at) : undefined,
            updated_by: item.updated_by || undefined
          };
        });
        setReservations(formattedReservations);
      }
    } catch (error) {

      toast.error('Error al cargar las reservas');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCancelledReservations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await sb
        .from('reservations')
        .select('*')
        .eq('status', 'cancelled')
        .order('fecha', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedReservations = data.map(item => {
          const parts = item.fecha.split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const dateObj = new Date(year, month, day, 12, 0, 0);

          return {
            ...item,
            fecha: dateObj,
            createdAt: new Date(item.created_at),
            status: item.status || 'cancelled',
            updated_at: item.updated_at ? new Date(item.updated_at) : undefined,
            updated_by: item.updated_by || undefined
          };
        });
        setCancelledReservations(formattedReservations);
      }
    } catch (error) {
      toast.error('Error al cargar las reservas canceladas');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingReservations = async () => {
    try {
      const { data, error } = await sb
        .from('reservations')
        .select('*')
        .eq('status', 'pending')
        .eq('confirmed', true)
        .order('fecha', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedReservations = data.map(item => {
          // Explicitly parse the date with local timezone consideration
          const parts = item.fecha.split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS
          const day = parseInt(parts[2], 10);
          const dateObj = new Date(year, month, day, 12, 0, 0); // Set to noon to avoid timezone issues
          
          return {
            ...item,
            fecha: dateObj,
            createdAt: new Date(item.created_at),
            status: item.status || 'pending',
            updated_at: item.updated_at ? new Date(item.updated_at) : undefined,
            updated_by: item.updated_by || undefined
          };
        });
        setPendingReservations(formattedReservations);
      }
    } catch (error) {

      toast.error('Error al cargar las reservas pendientes');
    }
  };

  const fetchBlockedDates = async () => {
    try {
      const { data, error } = await sb
        .from('blocked_dates')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;

      setBlockedDates(data || []);
    } catch (error) {

      toast.error('Error al cargar las fechas bloqueadas');
    }
  };

  const handleApproveReservation = async (id: string) => {
    try {
      // Get reservation details first
      const { data: reservation, error: fetchError } = await sb
        .from('reservations')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update reservation status
      const { error } = await sb
        .from('reservations')
        .update({ 
          status: 'approved'
        })
        .eq('id', id);
        
      if (error) throw error;

      // Send approval email
      if (reservation) {
        try {
          await sb.functions.invoke('send-email', {
            body: {
              type: 'reservation-approved',
              recipient: reservation.email,
              reservation: {
                id: reservation.id,
                responsable: reservation.responsable,
                email: reservation.email,
                motivo: reservation.motivo,
                fecha: reservation.fecha,
                inicio: reservation.inicio,
                fin: reservation.fin,
                personas: reservation.personas
              }
            }
          });
        } catch (emailError) {
          logger.error('Error sending approval email', emailError);
          // Don't fail the approval if email fails
        }
      }
      
      toast.success('Reserva aprobada exitosamente');
      fetchReservations();
      fetchPendingReservations();
    } catch (error) {

      toast.error('Error al aprobar la reserva');
    }
  };

  const handleRejectReservation = async (id: string, adminNotes?: string) => {
    try {
      // Get reservation details first
      const { data: reservation, error: fetchError } = await sb
        .from('reservations')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Mark reservation as rejected (soft) and store admin notes
      let adminId: string | null = null;
      try {
        const { data: userData } = await sb.auth.getUser();
        adminId = userData?.user?.id || null;
      } catch (e) {
        // ignore
      }

      const { error } = await sb
        .from('reservations')
        .update({ status: 'rejected', admin_notes: adminNotes || null, updated_by: adminId })
        .eq('id', id);

      if (error) throw error;

      // Send rejection email
      if (reservation) {
        try {
          await sb.functions.invoke('send-email', {
            body: {
              type: 'reservation-rejected',
              recipient: reservation.email,
              reservation: {
                id: reservation.id,
                responsable: reservation.responsable,
                email: reservation.email,
                motivo: reservation.motivo,
                fecha: reservation.fecha,
                inicio: reservation.inicio,
                fin: reservation.fin,
                personas: reservation.personas
              },
              reason: adminNotes || 'No se proporcionó un motivo específico'
            }
          });
        } catch (emailError) {
          logger.error('Error sending rejection email', emailError);
          // Don't fail the rejection if email fails
        }
      }
      
      toast.success('Reserva rechazada exitosamente');
      fetchPendingReservations();
    } catch (error) {

      toast.error('Error al rechazar la reserva');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Panel de Administración</CardTitle>
          <CardDescription>Gestione las reservas y bloqueos del Quincho</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side - Calendar View and Block Controls */}
            <div className="space-y-4 col-span-1">
              <BlockDateForm onBlockSuccess={fetchBlockedDates} />
            </div>

            {/* Right Side - Bookings List and Blocked Dates */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="approved" onValueChange={setActiveTab}>
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="approved">Reservas Aprobadas</TabsTrigger>
                  <TabsTrigger value="cancelled">Reservas Canceladas</TabsTrigger>
                  <TabsTrigger value="pending" className="relative">
                    Reservas Pendientes
                    {pendingReservations.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-fiuna-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {pendingReservations.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="approved">
                  <ReservationsList 
                    reservations={reservations}
                    blockedDates={blockedDates}
                    onDelete={fetchReservations}
                    onBlockedDateDelete={fetchBlockedDates}
                    isLoading={isLoading && activeTab === 'approved'}
                  />
                </TabsContent>
                
                <TabsContent value="cancelled">
                  <ReservationsList
                    reservations={cancelledReservations}
                    blockedDates={blockedDates}
                    onDelete={fetchCancelledReservations}
                    disableDelete={true}
                    useMotivoAsSecondary={true}
                    onBlockedDateDelete={fetchBlockedDates}
                    isLoading={isLoading && activeTab === 'cancelled'}
                    title="Reservas Canceladas"
                    emptyMessage="No se encontraron reservas canceladas"
                    showBlockedDates={false}
                  />
                </TabsContent>
                
                <TabsContent value="pending">
                  <PendingReservationsList
                    pendingReservations={pendingReservations}
                    onApprove={handleApproveReservation}
                    onReject={handleRejectReservation}
                    isLoading={isLoading && activeTab === 'pending'}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;

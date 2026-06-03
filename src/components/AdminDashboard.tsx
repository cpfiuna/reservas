
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { CalendarPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useVenue } from '@/context/VenueContext';
import BlockDateForm from './admin/BlockDateForm';
import AdminReservationForm from './admin/AdminReservationForm';
import ReservationsList from './admin/ReservationsList';
import PendingReservationsList from './admin/PendingReservationsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const { venues, venueId, currentVenue, setVenueBySlug } = useVenue();
  const sb: any = supabase;
  const [reservations, setReservations] = useState<any[]>([]);
  const [pendingReservations, setPendingReservations] = useState<any[]>([]);
  const [cancelledReservations, setCancelledReservations] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('approved');
  const [newReservationOpen, setNewReservationOpen] = useState(false);

  // Venues this admin can manage: super_admin → all; otherwise → assigned venues only.
  const adminVenues = useMemo(() => {
    if (isSuperAdmin) return venues;
    if (!user?.venues?.length) return venues.filter(v => v.slug === 'quincho');
    return venues.filter(v => user.venues.includes(v.id));
  }, [venues, isSuperAdmin, user]);
  
  useEffect(() => {
    if (!isAdmin) {
      navigate('/login');
      return;
    }

    if (!venueId) return;
    
    fetchReservations();
    fetchCancelledReservations();
    fetchPendingReservations();
    fetchBlockedDates();
    
    // Subscribe to reservation changes
    const reservationsChannel = sb
      .channel('admin_reservations_changes')
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
      .channel('admin_blocked_dates_changes')
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
  }, [isAdmin, navigate, venueId]);

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await sb
        .from('reservations')
        .select('*')
        .eq('venue_id', venueId)
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
        .eq('venue_id', venueId)
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
        .eq('venue_id', venueId)
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
        .eq('venue_id', venueId)
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
              venueSlug: currentVenue?.slug ?? 'quincho',
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
              venueSlug: currentVenue?.slug ?? 'quincho',
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
          <CardDescription>
            Gestione las reservas y bloqueos - {currentVenue?.name ?? 'Cargando...'}
          </CardDescription>
          {/* Venue switcher: only visible when admin manages more than one venue */}
          {adminVenues.length > 1 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {adminVenues.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVenueBySlug(v.slug)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    v.id === venueId
                      ? 'bg-fiuna-red text-white border-fiuna-red'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-fiuna-red hover:text-fiuna-red'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side - Calendar View and Block Controls */}
            <div className="space-y-4 col-span-1">
              <Button
                onClick={() => setNewReservationOpen(true)}
                variant="outline"
                className="w-full gap-2 border-fiuna-red text-fiuna-red hover:bg-fiuna-red hover:text-white"
              >
                <CalendarPlus className="h-4 w-4" />
                Nueva Reserva
              </Button>
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
      <Dialog open={newReservationOpen} onOpenChange={setNewReservationOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Reserva</DialogTitle>
            <DialogDescription>
              Crea una reserva directamente como aprobada. No se enviará confirmación por correo salvo que se ingrese un correo electrónico.
            </DialogDescription>
          </DialogHeader>
          <AdminReservationForm
            onCreated={() => {
              setNewReservationOpen(false);
              fetchReservations();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;


import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, Edit, Search, Trash, Users } from 'lucide-react';
import { useReservations, Reservation } from '@/context/ReservationContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import CalendarView from './CalendarView';

// Generate time options from 7:00 to 22:00
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 7; hour <= 22; hour++) {
    const hourString = hour.toString().padStart(2, '0');
    options.push(`${hourString}:00`);
    if (hour < 22) {
      options.push(`${hourString}:30`);
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

const AdminPanel: React.FC = () => {
  const { reservations, deleteReservation, updateReservation } = useReservations();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [editMode, setEditMode] = useState(false);
  
  // Form fields for editing
  const [editData, setEditData] = useState({
    responsable: '',
    email: '',
    motivo: '',
    fecha: new Date(),
    inicio: '',
    fin: '',
    personas: 0
  });
  
  // Effect to redirect if not admin
  React.useEffect(() => {
    if (!isAdmin) {
      navigate('/login');
    }
  }, [isAdmin, navigate]);
  
  if (!isAdmin) {
    return null;
  }
  
  // Filter reservations based on search term
  const filteredReservations = searchTerm 
    ? reservations.filter(r => 
        r.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.motivo.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [...reservations];
  
  // Sort reservations by date (newest first)
  const sortedReservations = [...filteredReservations].sort(
    (a, b) => b.fecha.getTime() - a.fecha.getTime()
  );
  
  const handleEditClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setEditData({
      responsable: reservation.responsable,
      email: reservation.email,
      motivo: reservation.motivo,
      fecha: reservation.fecha,
      inicio: reservation.inicio,
      fin: reservation.fin,
      personas: reservation.personas
    });
    setEditMode(true);
  };
  
  const handleDeleteClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
  };
  
  const confirmDelete = () => {
    if (selectedReservation) {
      deleteReservation(selectedReservation.id);
      setSelectedReservation(null);
    }
  };
  
  const handleSaveEdit = () => {
    if (selectedReservation) {
      updateReservation(selectedReservation.id, {
        responsable: editData.responsable,
        email: editData.email,
        motivo: editData.motivo,
        fecha: editData.fecha,
        inicio: editData.inicio,
        fin: editData.fin,
        personas: editData.personas
      });
      setEditMode(false);
      setSelectedReservation(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in">
      <Card className="shadow-md border-gray-200">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-2xl font-bold text-fiuna-gray">Panel de Administración</CardTitle>
          <CardDescription>Gestione las reservas del Quincho FIUNA</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="list">Listado de Reservas</TabsTrigger>
              <TabsTrigger value="calendar">Calendario</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="animate-fade-in">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    placeholder="Buscar reservas..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="space-y-3">
                    {sortedReservations.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No se encontraron reservas</p>
                    ) : (
                      sortedReservations.map(reservation => (
                        <Card key={reservation.id} className="overflow-hidden shadow-sm border border-gray-200">
                          <CardHeader className="p-3 bg-gray-50 border-b">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-base font-medium">{reservation.motivo}</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {format(reservation.fecha, 'EEEE d MMMM, yyyy', { locale: es })}
                                </CardDescription>
                              </div>
                              <div className="flex space-x-2">
                                <Dialog open={editMode && selectedReservation?.id === reservation.id} onOpenChange={(open) => !open && setEditMode(false)}>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleEditClick(reservation)}
                                    >
                                      <Edit className="h-4 w-4" />
                                      <span className="sr-only">Editar</span>
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Editar Reserva</DialogTitle>
                                      <DialogDescription>
                                        Modifique los detalles de la reserva
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-responsable" className="text-right">Responsable</Label>
                                        <Input
                                          id="edit-responsable"
                                          value={editData.responsable}
                                          onChange={(e) => setEditData({...editData, responsable: e.target.value})}
                                          className="col-span-3"
                                        />
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-email" className="text-right">Email</Label>
                                        <Input
                                          id="edit-email"
                                          type="email"
                                          value={editData.email}
                                          onChange={(e) => setEditData({...editData, email: e.target.value})}
                                          className="col-span-3"
                                        />
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-motivo" className="text-right">Motivo</Label>
                                        <Textarea
                                          id="edit-motivo"
                                          value={editData.motivo}
                                          onChange={(e) => setEditData({...editData, motivo: e.target.value})}
                                          className="col-span-3"
                                        />
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">Fecha</Label>
                                        <div className="col-span-3">
                                          <Calendar
                                            mode="single"
                                            selected={editData.fecha}
                                            onSelect={(date) => date && setEditData({...editData, fecha: date})}
                                            className="rounded-md border pointer-events-auto"
                                            locale={es}
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-inicio" className="text-right">Inicio</Label>
                                        <Select
                                          value={editData.inicio}
                                          onValueChange={(value) => setEditData({...editData, inicio: value})}
                                        >
                                          <SelectTrigger id="edit-inicio" className="col-span-3">
                                            <SelectValue>
                                              {editData.inicio ? (
                                                <div className="flex items-center">
                                                  <Clock className="mr-2 h-4 w-4" />
                                                  {editData.inicio}
                                                </div>
                                              ) : (
                                                "Seleccione hora"
                                              )}
                                            </SelectValue>
                                          </SelectTrigger>
                                          <SelectContent>
                                            {timeOptions.map((time) => (
                                              <SelectItem key={`start-edit-${time}`} value={time}>
                                                {time}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-fin" className="text-right">Fin</Label>
                                        <Select
                                          value={editData.fin}
                                          onValueChange={(value) => setEditData({...editData, fin: value})}
                                        >
                                          <SelectTrigger id="edit-fin" className="col-span-3">
                                            <SelectValue>
                                              {editData.fin ? (
                                                <div className="flex items-center">
                                                  <Clock className="mr-2 h-4 w-4" />
                                                  {editData.fin}
                                                </div>
                                              ) : (
                                                "Seleccione hora"
                                              )}
                                            </SelectValue>
                                          </SelectTrigger>
                                          <SelectContent>
                                            {timeOptions
                                              .filter(time => time > editData.inicio)
                                              .map((time) => (
                                                <SelectItem key={`end-edit-${time}`} value={time}>
                                                  {time}
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-personas" className="text-right">Personas</Label>
                                        <Input
                                          id="edit-personas"
                                          type="number"
                                          min={1}
                                          value={editData.personas}
                                          onChange={(e) => setEditData({...editData, personas: parseInt(e.target.value) || 0})}
                                          className="col-span-3"
                                        />
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button
                                        variant="outline"
                                        onClick={() => setEditMode(false)}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        className="bg-fiuna-red hover:bg-fiuna-darkred"
                                        onClick={handleSaveEdit}
                                      >
                                        Guardar cambios
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 border-red-200 hover:bg-red-50 hover:text-red-600"
                                      onClick={() => handleDeleteClick(reservation)}
                                    >
                                      <Trash className="h-4 w-4" />
                                      <span className="sr-only">Eliminar</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Eliminará permanentemente la reserva
                                        de {reservation.responsable} del {format(reservation.fecha, 'dd/MM/yyyy', { locale: es })}.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-500 hover:bg-red-600"
                                        onClick={confirmDelete}
                                      >
                                        Eliminar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 pt-3">
                            <div className="text-sm space-y-1">
                              <p><span className="font-medium">Horario:</span> {reservation.inicio} - {reservation.fin}</p>
                              <p><span className="font-medium">Responsable:</span> {reservation.responsable}</p>
                              <p><span className="font-medium">Email:</span> {reservation.email}</p>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1 text-gray-500" />
                                <span>{reservation.personas} personas</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="calendar" className="animate-fade-in">
              <CalendarView />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;

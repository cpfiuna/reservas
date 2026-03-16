
import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, 
  AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BlockedDate {
  id: string;
  fecha: string;
  motivo: string | null;
  start_time?: string;
  end_time?: string;
}

interface BlockedDatesListProps {
  blockedDates: BlockedDate[];
  onDelete: () => void;
}

const BlockedDatesList: React.FC<BlockedDatesListProps> = ({ blockedDates, onDelete }) => {
  const formatBlockDateInfo = (block: BlockedDate) => {
    const dateStr = format(block.fecha, 'dd/MM/yyyy');
    let blockInfo = dateStr;
    
    // Include time information if available
    if (block.start_time && block.end_time) {
      blockInfo += ` de ${block.start_time} a ${block.end_time}`;
    } else {
      // Extract time information from motivo if it contains it
      const timeMatch = block.motivo && block.motivo.match(/\((\d{2}:\d{2}) - (\d{2}:\d{2})\)/);
      if (timeMatch) {
        blockInfo += ` de ${timeMatch[1]} a ${timeMatch[2]}`;
      }
    }
    
    return blockInfo;
  };

  const deleteBlockedDate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Bloqueo eliminado exitosamente');
      onDelete();
    } catch (error) {

      toast.error('Error al eliminar el bloqueo');
    }
  };

  if (blockedDates.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="text-md font-medium mb-2 text-red-700 px-3">Fechas Bloqueadas</h3>
      <div className="space-y-2">
        {blockedDates.map(block => (
          <Card key={block.id} className="overflow-hidden shadow-sm border border-red-200 bg-red-50">
            <CardContent className="p-3 flex justify-between items-center">
              <div>
                <p className="font-medium text-red-700">{formatBlockDateInfo(block)}</p>
                <p className="text-sm text-red-600">{block.motivo?.replace(/\(.*\)/, '').trim() || 'No especificado'}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esto eliminará el bloqueo y permitirá que se realicen reservas para este período.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteBlockedDate(block.id)}>
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BlockedDatesList;

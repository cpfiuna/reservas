import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';

const ReservationLegend: React.FC = () => {
  const { isAdmin } = useAuth();

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Leyenda
          {isAdmin && <span className="text-sm font-normal text-blue-600 ml-2">ADMIN: Haz click en cualquier reserva para ver sus detalles</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Badge className="bg-fiuna-red hover:bg-fiuna-red text-white">
              Aprobada
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white">
              Pendiente
            </Badge>
          </div>
          {/* Only show past reservations legend to admins */}
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <Badge className="bg-gray-400 hover:bg-gray-400 text-white opacity-75">
                Pasada
              </Badge>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Badge className="bg-gray-500 hover:bg-gray-500 text-white">
              Sin estado
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReservationLegend;

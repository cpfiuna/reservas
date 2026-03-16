
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="text-fiuna-red mb-6 text-[120px] font-bold leading-none">404</div>
        <h1 className="text-3xl font-bold mb-4 text-fiuna-gray">Página no encontrada</h1>
        <p className="text-gray-600 mb-8">Lo sentimos, la página que estás buscando no existe o ha sido movida.</p>
        <Button asChild className="bg-fiuna-red hover:bg-fiuna-darkred text-white">
          <Link to="/calendario">Volver al Calendario</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;

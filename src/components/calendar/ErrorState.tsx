
import React from 'react';

const ErrorState: React.FC = () => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 animate-fade-in">
      <div className="p-4 bg-white rounded-lg shadow text-center">
        <h2 className="text-xl font-medium text-red-600 mb-2">Error de carga</h2>
        <p className="text-gray-600">No se pudieron cargar las reservas. Intente refrescar la página.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-fiuna-red text-white rounded hover:bg-fiuna-darkred transition-colors"
        >
          Refrescar
        </button>
      </div>
    </div>
  );
};

export default ErrorState;

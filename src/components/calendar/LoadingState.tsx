
import React from 'react';

const LoadingState: React.FC = () => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 animate-fade-in">
      <div className="flex justify-center items-center h-64 flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fiuna-red mb-4"></div>
        <p className="text-gray-500">Cargando calendario...</p>
      </div>
    </div>
  );
};

export default LoadingState;

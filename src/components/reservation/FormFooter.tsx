
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface FormFooterProps {
  onSubmit: (e?: React.FormEvent) => void;
}

const FormFooter: React.FC<FormFooterProps> = ({ onSubmit }) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center space-x-4">
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => navigate('/calendario')}
      >
        Cancelar
      </Button>
      <Button 
        type="button" 
        onClick={(e) => onSubmit(e)}
      >
        Crear Reserva
      </Button>
    </div>
  );
};

export default FormFooter;

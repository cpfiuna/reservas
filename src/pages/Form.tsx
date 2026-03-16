
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import ReservationForm from '@/components/ReservationForm';
import Footer from '@/components/Footer';

const Form = () => {
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date');
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center mb-6">
            <Link to="/">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Formulario de Reserva</h1>
          </div>
          
          <ReservationForm initialDate={date} initialStartTime={startTime} initialEndTime={endTime} />
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Form;

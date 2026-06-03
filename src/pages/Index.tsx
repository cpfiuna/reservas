
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '@/components/SplashScreen';
import { useVenue } from '@/context/VenueContext';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { Building2, UtensilsCrossed } from 'lucide-react';

const venueIcons: Record<string, React.ReactNode> = {
  quincho: <UtensilsCrossed className="h-10 w-10 text-fiuna-red" />,
  polideportivo: <Building2 className="h-10 w-10 text-fiuna-red" />,
};

const venueDescriptions: Record<string, string> = {
  quincho: 'Espacio al aire libre ideal para reuniones, asados y eventos sociales.',
  polideportivo: 'Cancha cubierta para actividades deportivas y eventos deportivos.',
};

const VenueHome: React.FC = () => {
  const navigate = useNavigate();
  const { venues, setVenueBySlug } = useVenue();
  const activeVenues = venues.filter(v => v.active);

  const handleSelect = (slug: string) => {
    setVenueBySlug(slug);
    navigate('/calendario');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <p className="text-gray-600 mb-8 text-center font-medium text-lg">¿Qué espacio querés reservar?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {activeVenues.map(venue => (
            <button
              key={venue.id}
              onClick={() => handleSelect(venue.slug)}
              className="flex flex-col items-center gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-8 hover:shadow-md hover:border-fiuna-red transition-all group text-left"
            >
              <div className="p-4 bg-red-50 rounded-full group-hover:bg-red-100 transition-colors">
                {venueIcons[venue.slug] ?? <Building2 className="h-10 w-10 text-fiuna-red" />}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900">{venue.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {venueDescriptions[venue.slug] ?? 'Consulte disponibilidad y reserve su turno.'}
                </p>
              </div>
              <span className="mt-2 inline-flex items-center gap-1 text-fiuna-red text-sm font-medium group-hover:underline">
                Ver disponibilidad →
              </span>
            </button>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Index = () => {
  const [showSplash, setShowSplash] = useState(() => {
    if (sessionStorage.getItem('splash_shown')) return false;
    sessionStorage.setItem('splash_shown', '1');
    return true;
  });

  return (
    <>
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : (
        <VenueHome />
      )}
    </>
  );
};

export default Index;

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Venue } from '@/types/venue';

// The venue every existing booking + admin belongs to today. Until the
// polideportivo is launched and venue-prefixed routes exist, the app resolves
// to this venue so current behavior is unchanged.
const DEFAULT_VENUE_SLUG = 'quincho';
const STORAGE_KEY = 'cpfiuna_venue';

interface VenueContextType {
  venues: Venue[];
  currentVenue: Venue | null;
  venueId: string | null;
  isLoading: boolean;
  setVenueBySlug: (slug: string) => void;
}

const VenueContext = createContext<VenueContextType | undefined>(undefined);

export const VenueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [currentSlug, setCurrentSlug] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_VENUE_SLUG
  );
  const [isLoading, setIsLoading] = useState(true);

  // Persist venue selection across page refreshes.
  const setVenueBySlug = (slug: string) => {
    localStorage.setItem(STORAGE_KEY, slug);
    setCurrentSlug(slug);
  };

  useEffect(() => {
    let mounted = true;

    const fetchVenues = async () => {
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('id, slug, name, hours_start, hours_end, active')
          .order('name', { ascending: true });

        if (!mounted) return;

        if (!error && data) {
          setVenues(data as Venue[]);
          // If stored slug no longer exists/is inactive, fall back to default.
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored && !data.some((v: Venue) => v.slug === stored && v.active)) {
            localStorage.removeItem(STORAGE_KEY);
            setCurrentSlug(DEFAULT_VENUE_SLUG);
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchVenues();
    return () => {
      mounted = false;
    };
  }, []);

  const currentVenue = useMemo(
    () => venues.find((v) => v.slug === currentSlug) ?? null,
    [venues, currentSlug]
  );

  const value: VenueContextType = useMemo(
    () => ({
      venues,
      currentVenue,
      venueId: currentVenue?.id ?? null,
      isLoading,
      setVenueBySlug,
    }),
    [venues, currentVenue, isLoading]
  );

  return <VenueContext.Provider value={value}>{children}</VenueContext.Provider>;
};

export const useVenue = () => {
  const context = useContext(VenueContext);
  if (context === undefined) {
    throw new Error('useVenue must be used within a VenueProvider');
  }
  return context;
};

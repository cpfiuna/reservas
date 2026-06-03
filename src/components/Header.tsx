
import React, { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useVenue } from '@/context/VenueContext';
import { LogOut, Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin, isSuperAdmin, user, logout } = useAuth();
  const { venues, currentVenue, setVenueBySlug } = useVenue();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeVenues = venues.filter(v => v.active);

  // For admins, only show the venue switcher if they manage more than one venue.
  // Regular users always see it (so they can pick which space to book).
  const adminVenues = useMemo(() => {
    if (!isAdmin) return activeVenues;
    if (isSuperAdmin) return activeVenues;
    return activeVenues.filter(v => user?.venues?.includes(v.id));
  }, [isAdmin, isSuperAdmin, user, activeVenues]);

  const isHomePage = location.pathname === '/';
  const showVenueTabs = !isHomePage && adminVenues.length > 1;

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleVenueSwitch = (slug: string) => {
    setVenueBySlug(slug);
    closeMobileMenu();
    // Only redirect to calendar from the home picker; stay on every other page.
    if (location.pathname === '/') {
      navigate('/calendario');
    }
  };

  const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link 
      to={to} 
      onClick={closeMobileMenu}
      className={`text-gray-600 hover:text-fiuna-red transition-colors ${location.pathname === to ? 'font-semibold text-fiuna-red' : ''}`}
    >
      {children}
    </Link>
  );

  return (
    <header className="bg-white shadow-sm px-4 md:px-6 relative">
      {/* Main nav row */}
      <div className="container mx-auto flex justify-between items-center py-3">
        {/* Logo */}
        <div className="flex items-center">
          <Link to="/" className="font-bold text-xl text-fiuna-red" onClick={closeMobileMenu}>
            {(!isHomePage && currentVenue) ? currentVenue.name : 'Reservas FIUNA'}
          </Link>
        </div>

        {/* Desktop: venue tabs + nav */}
        <div className="hidden md:flex items-center gap-6">
          {/* Venue switcher tabs */}
          {showVenueTabs && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
              {adminVenues.map(v => (
                <button
                  key={v.id}
                  onClick={() => handleVenueSwitch(v.slug)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    v.id === currentVenue?.id
                      ? 'bg-white text-fiuna-red shadow-sm'
                      : 'text-gray-600 hover:text-fiuna-red'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            <NavLink to="/calendario">Calendario</NavLink>
            <NavLink to="/nueva-reserva">Reservar</NavLink>
            
            {isLoggedIn && isAdmin ? (
              <>
                <Link to="/admin">
                  <Button size="sm" variant="outline" className="mr-2">
                    Panel Admin
                  </Button>
                </Link>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={logout}
                  className="flex items-center gap-1"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button size="sm" variant="outline">
                  Admin
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          className="md:hidden p-2 text-gray-600 hover:text-fiuna-red transition-colors"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile venue switcher - always visible below the nav row */}
      {showVenueTabs && (
        <div className="md:hidden border-t border-gray-100 py-2 px-1">
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {adminVenues.map(v => (
              <button
                key={v.id}
                onClick={() => handleVenueSwitch(v.slug)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  v.id === currentVenue?.id
                    ? 'bg-fiuna-red text-white'
                    : 'bg-white text-gray-700 active:bg-gray-50'
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t z-50">
          <div className="flex flex-col p-4 space-y-4">
            <NavLink to="/calendario">Calendario</NavLink>
            <NavLink to="/nueva-reserva">Reservar</NavLink>
            
            <div className="border-t pt-4">
              {isLoggedIn && isAdmin ? (
                <div className="flex flex-col space-y-3">
                  <Link to="/admin" onClick={closeMobileMenu}>
                    <Button size="sm" variant="outline" className="w-full">
                      Panel Admin
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => { logout(); closeMobileMenu(); }}
                    className="flex items-center justify-center gap-1 w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    Salir
                  </Button>
                </div>
              ) : (
                <Link to="/login" onClick={closeMobileMenu}>
                  <Button size="sm" variant="outline" className="w-full">
                    Admin
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

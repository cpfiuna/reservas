
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const location = useLocation();
  const { isLoggedIn, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

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
    <header className="bg-white shadow-sm py-4 px-4 md:px-6 relative">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <Link to="/" className="font-bold text-xl text-fiuna-red" onClick={closeMobileMenu}>
            Quincho FIUNA
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
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

        {/* Mobile Hamburger Button */}
        <button 
          className="md:hidden p-2 text-gray-600 hover:text-fiuna-red transition-colors"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
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


import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAdmin } from '@/lib/supabase';
import { toast } from 'sonner';

interface AdminLoginProps {
  onClose: () => void;
}

const AdminLogin = ({ onClose }: AdminLoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {

      const result = await loginAdmin(email, password);
      
      if (result?.user) {
        // Store auth state in localStorage for persistence
        try {

          localStorage.setItem('adminLoggedIn', 'true');
          localStorage.setItem('adminEmail', email);
          
          // Store the session token if available
          if (result.session && result.session.access_token) {
            localStorage.setItem('adminToken', result.session.access_token);
            
            // If expiry is available, store it
            if (result.session.expires_at) {
              localStorage.setItem('adminTokenExpiry', result.session.expires_at.toString());
            }
          }
          
          toast.success('Inicio de sesión exitoso');
          // Use replace: true to prevent back navigation issues
          navigate('/admin', { replace: true });
          onClose();
        } catch (storageError) {

          toast.error('Error guardando el estado de la sesión');
        }
      } else {

        toast.error('Credenciales incorrectas');
      }
    } catch (error) {
      // Extract meaningful error message if available
      let errorMessage = 'Error de inicio de sesión';
      if (error instanceof Error) {
        errorMessage = error.message === 'Unauthorized' 
          ? 'Usuario no autorizado' 
          : (error.message === 'Invalid credentials' ? 'Credenciales incorrectas' : error.message);
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Acceso Administrativo</DialogTitle>
          <DialogDescription className="text-center">
            Ingrese sus credenciales para acceder al panel de administración
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleLogin} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-fiuna-red hover:bg-fiuna-red/90 text-white"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] mr-2" />
                  Iniciando...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminLogin;

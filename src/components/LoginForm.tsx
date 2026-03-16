
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Por favor complete todos los campos');
      return;
    }
    
    setLoading(true);
    
    try {
      const success = await login(email, password);
      
      if (success) {
        navigate('/admin');
      }
    } catch (error) {
      toast.error('Ocurrió un error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-md border border-gray-200 transform transition-all duration-300 hover:shadow-lg animate-fade-in">
      <CardHeader className="bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <CardTitle className="text-2xl font-bold text-fiuna-gray">Acceso Administrativo</CardTitle>
        <CardDescription>Ingrese sus credenciales para continuar</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2 text-sm text-center">
            <Button 
              variant="link" 
              className="text-fiuna-red p-0"
              onClick={() => navigate('/auth/reset-password')}
            >
              ¿Olvidaste tu contraseña?
            </Button>
            
          </div>
        </form>
      </CardContent>
      <CardFooter className="bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => navigate('/calendario')}
          className="hover:bg-gray-100 transition-colors"
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={loading}
          className="bg-fiuna-red hover:bg-fiuna-darkred text-white transition-colors gap-2"
        >
          {loading ? 'Iniciando sesión...' : (
            <>
              <LogIn className="h-4 w-4" />
              <span>Iniciar Sesión</span>
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;


import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

const ResetPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're in a password recovery flow
  useEffect(() => {
    const checkRecoveryMode = async () => {
      if (location.hash && location.hash.includes('type=recovery')) {
        setIsRecoveryMode(true);
        
        // Prevent automatic redirect by checking session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {

        }
      }
    };
    
    checkRecoveryMode();
  }, [location]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isRecoveryMode) {
      // This is for setting a new password after clicking the recovery link
      if (!password) {
        toast.error('Por favor ingrese una nueva contraseña');
        setLoading(false);
        return;
      }
      
      if (password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        setLoading(false);
        return;
      }

      try {
        // Update password using token that's already in the URL hash
        const { error } = await supabase.auth.updateUser({ 
          password 
        });

        if (error) {
          // Handle specific error cases
          if (error.message?.includes('same') || error.message?.includes('different') || error.message?.includes('old password')) {
            toast.error('La nueva contraseña debe ser diferente a la anterior');
          } else if (error.message?.includes('weak') || error.message?.includes('short')) {
            toast.error('La contraseña es muy débil o corta');
          } else {
            toast.error('Error al actualizar la contraseña');
          }

          setLoading(false);
        } else {

          toast.success('Contraseña actualizada con éxito');
          
          // Wait a moment for the auth state to update, then redirect
          setTimeout(() => {
            setLoading(false);
            // Clear the hash to prevent recovery mode detection
            window.location.hash = '';
            navigate('/admin');
          }, 2000);
        }
      } catch (error) {

        toast.error('Error al procesar la solicitud');
        setLoading(false);
      }
    } else {
      // This is for requesting a password reset email
      if (!email) {
        toast.error('Por favor ingrese su correo electrónico');
        setLoading(false);
        return;
      }

      try {
        // Note: We intentionally do NOT check if the email exists to prevent
        // username enumeration attacks. We always send a generic success message.

        // Send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });

        if (error) {
          // Handle rate limiting
          if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
            // Try to extract wait time from error message, default to 30 seconds
            const match = error.message.match(/(\d+)\s*second/i);
            const waitTime = match ? parseInt(match[1]) : 30;
            toast.error(`Por favor, espera ${waitTime} segundos para realizar esto`);
          } else {
            toast.error('Error al enviar el correo de recuperación');
          }

          setLoading(false);
        } else {
          toast.success('Se ha enviado un correo de recuperación');
          setLoading(false);
          navigate('/login');
        }
      } catch (error) {

        toast.error('Error al procesar la solicitud');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {isRecoveryMode ? 'Establecer Nueva Contraseña' : 'Recuperar Contraseña'}
        </CardTitle>
        <CardDescription>
          {isRecoveryMode 
            ? 'Ingrese su nueva contraseña' 
            : 'Ingrese su correo electrónico para recuperar su contraseña'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleResetPassword} className="space-y-4">
          {!isRecoveryMode && (
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
          )}

          {isRecoveryMode && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <Button 
            type="submit" 
            className="w-full mt-4"
            disabled={loading}
          >
            {loading 
              ? 'Procesando...' 
              : (isRecoveryMode ? 'Actualizar contraseña' : 'Enviar correo de recuperación')
            }
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex flex-col space-y-1 mt-2 w-full items-center">
          <Button
            variant="link"
            className="text-sm"
            onClick={() => navigate('/login')}
            type="button"
          >
            Volver al inicio de sesión
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ResetPasswordForm;

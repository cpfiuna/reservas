
import React from 'react';
import { useLocation } from 'react-router-dom';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';
import ResetPasswordForm from './ResetPasswordForm';

interface AuthFormContainerProps {
  isResetPassword?: boolean;
  isSignUp?: boolean;
}

const AuthFormContainer: React.FC<AuthFormContainerProps> = ({ 
  isResetPassword = false, 
  isSignUp = false 
}) => {
  const location = useLocation();
  const isRecoveryMode = location.hash && location.hash.includes('type=recovery');

  if (isResetPassword) {
    return <ResetPasswordForm />;
  }

  if (isSignUp) {
    return <SignUpForm />;
  }

  return <LoginForm />;
};

export default AuthFormContainer;

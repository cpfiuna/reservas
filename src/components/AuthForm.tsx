
import React from 'react';
import { useLocation } from 'react-router-dom';
import AuthFormContainer from './auth/AuthFormContainer';

interface AuthFormProps {
  isResetPassword?: boolean;
  isSignUp?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({ 
  isResetPassword = false, 
  isSignUp = false 
}) => {
  return (
    <AuthFormContainer
      isResetPassword={isResetPassword}
      isSignUp={isSignUp}
    />
  );
};

export default AuthForm;

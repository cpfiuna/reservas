
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import SplashScreen from '@/components/SplashScreen';

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : (
        <Navigate to="/calendario" replace />
      )}
    </>
  );
};

export default Index;

import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, verifyToken } = useAuth();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (isAuthenticated) {
        const valid = await verifyToken();
        setIsValid(valid);
      }
      setIsVerifying(false);
    };

    verify();
  }, [isAuthenticated, verifyToken]);

  // Show loading state while verifying token
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated or token is invalid
  if (!isAuthenticated || !isValid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

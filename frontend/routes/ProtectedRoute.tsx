import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-background">
                <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-primary"></div>
            </div>
        );
    }

    // No logged-in user
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Logged-in user has the wrong role
    if (!allowedRoles.includes(user.role)) {
        // Send the user to their actual dashboard route
        return <Navigate to={`/${user.role}/dashboard`} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
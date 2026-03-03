import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return null; // Or a loading spinner

    if (!user?.isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

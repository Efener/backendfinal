import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const AdminRoute = () => {
    const { user } = useContext(AuthContext);

    // If the user is an admin, render the child routes.
    // Otherwise, navigate them to the home page.
    return user && user.role === 'admin' ? <Outlet /> : <Navigate to="/" />;
};

export default AdminRoute; 
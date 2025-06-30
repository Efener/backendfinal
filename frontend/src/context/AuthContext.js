import React, { createContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Here you could also verify the token with a backend endpoint
            // For simplicity, we'll just decode it. A real app should verify.
            try {
                const userData = JSON.parse(atob(token.split('.')[1]));
                setUser({ token, ...userData });
                API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } catch (e) {
                console.error("Failed to parse token", e);
                setUser(null);
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const response = await API.post('/admin/auth/login', { email, password });
        const { token } = response.data;
        const userData = JSON.parse(atob(token.split('.')[1]));
        setUser({ token, ...userData });
        localStorage.setItem('token', token);
        API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return response.data;
    };

    const register = async (name, email, password) => {
        await API.post('/admin/auth/register', { name, email, password });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
        delete API.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext; 
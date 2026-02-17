import { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser]       = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { setLoading(false); return; }

        client.get('/me')
            .then(res => setUser(res.data))
            .catch(() => localStorage.removeItem('token'))
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const res = await client.post('/login', { email, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
    };

    const register = async (name, email, password, password_confirmation) => {
        const res = await client.post('/register', { name, email, password, password_confirmation });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
    };

    const logout = async () => {
        await client.post('/logout').catch(() => {});
        localStorage.removeItem('token');
        sessionStorage.clear(); // clear all ECDH key pairs
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

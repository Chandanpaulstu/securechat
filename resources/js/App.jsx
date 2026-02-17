import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AcceptInvite from './pages/AcceptInvite';

function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-950 text-gray-400">Loading...</div>;
    return user ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                    <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
                    <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/invite/:token" element={<AcceptInvite />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

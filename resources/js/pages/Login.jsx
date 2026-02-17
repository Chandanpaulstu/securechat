import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const { login }               = useAuth();
    const navigate                = useNavigate();
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-xl w-full max-w-md space-y-5 shadow-xl">
                <h1 className="text-2xl font-bold text-white">🔐 SecureChat</h1>
                <p className="text-gray-400 text-sm">End-to-end encrypted messaging</p>

                {error && <div className="bg-red-900/40 text-red-400 text-sm p-3 rounded">{error}</div>}

                <input
                    type="email" placeholder="Email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                />
                <input
                    type="password" placeholder="Password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                />
                <button
                    type="submit" disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
                <p className="text-gray-500 text-sm text-center">
                    No account? <Link to="/register" className="text-indigo-400 hover:underline">Register</Link>
                </p>
            </form>
        </div>
    );
}

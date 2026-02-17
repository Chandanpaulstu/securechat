import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
    const { register }                              = useAuth();
    const navigate                                  = useNavigate();
    const [name, setName]                           = useState('');
    const [email, setEmail]                         = useState('');
    const [password, setPassword]                   = useState('');
    const [passwordConfirm, setPasswordConfirm]     = useState('');
    const [error, setError]                         = useState('');
    const [loading, setLoading]                     = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== passwordConfirm) { setError('Passwords do not match.'); return; }
        setLoading(true);
        try {
            await register(name, email, password, passwordConfirm);
            navigate('/');
        } catch (err) {
            const errors = err.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(' ') : 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-xl w-full max-w-md space-y-5 shadow-xl">
                <h1 className="text-2xl font-bold text-white">🔐 SecureChat</h1>
                <p className="text-gray-400 text-sm">Create your account</p>

                {error && <div className="bg-red-900/40 text-red-400 text-sm p-3 rounded">{error}</div>}

                <input type="text" placeholder="Full Name" value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    required />
                <input type="email" placeholder="Email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    required />
                <input type="password" placeholder="Password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    required />
                <input type="password" placeholder="Confirm Password" value={passwordConfirm}
                    onChange={e => setPasswordConfirm(e.target.value)}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    required />
                <button type="submit" disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
                    {loading ? 'Creating...' : 'Create Account'}
                </button>
                <p className="text-gray-500 text-sm text-center">
                    Have an account? <Link to="/login" className="text-indigo-400 hover:underline">Login</Link>
                </p>
            </form>
        </div>
    );
}

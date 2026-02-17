import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AcceptInvite() {
    const { token }             = useParams();
    const { user, loading }     = useAuth();
    const navigate              = useNavigate();
    const [status, setStatus]   = useState('Verifying invite...');
    const [error, setError]     = useState(false);

    useEffect(() => {
        if (loading) return;

        if (!user) {
            // Save token in sessionStorage, redirect to login, come back after
            sessionStorage.setItem('pending_invite', token);
            navigate('/login');
            return;
        }

        acceptInvite();
    }, [loading, user]);

    const acceptInvite = async () => {
        try {
            await client.post(`/invites/${token}/accept`);
            setStatus('You have joined the room! Redirecting...');
            setTimeout(() => navigate('/'), 1500);
        } catch (err) {
            setError(true);
            setStatus(err.response?.data?.message || 'Invalid or expired invite.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <div className="bg-gray-900 rounded-xl p-8 max-w-sm w-full text-center space-y-4 shadow-xl">
                <h1 className="text-2xl font-bold text-white">🔐 SecureChat</h1>
                <p className={`text-sm ${error ? 'text-red-400' : 'text-gray-400'}`}>{status}</p>
                {error && (
                    <button onClick={() => navigate('/')}
                        className="text-indigo-400 text-sm hover:underline">
                        Go to Dashboard
                    </button>
                )}
            </div>
        </div>
    );
}

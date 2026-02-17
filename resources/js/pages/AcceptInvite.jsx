import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AcceptInvite() {
    const { token }             = useParams();
    const { user, loading, logout } = useAuth();
    const navigate              = useNavigate();
    const [status, setStatus]   = useState('Verifying invite...');
    const [error, setError]     = useState(false);
    const [wrongAccount, setWrongAccount] = useState(false);

    useEffect(() => {
        if (loading) return;

        if (!user) {
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
            const data = err.response?.data;
            setError(true);

            if (data?.wrong_account) {
                setWrongAccount(true);
                setStatus(data.message);
            } else {
                setStatus(data?.message || 'Invalid or expired invite.');
            }
        }
    };

    const handleSwitchAccount = async () => {
        await logout();
        sessionStorage.setItem('pending_invite', token);
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <div className="bg-gray-900 rounded-xl p-8 max-w-sm w-full text-center space-y-4 shadow-xl">
                <h1 className="text-2xl font-bold text-white">🔐 SecureChat</h1>

                <p className={`text-sm ${error ? 'text-red-400' : 'text-gray-400'}`}>
                    {status}
                </p>

                {wrongAccount && (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-500">
                            Currently logged in as <span className="text-white">{user?.email}</span>
                        </p>
                        <button
                            onClick={handleSwitchAccount}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium transition"
                        >
                            Switch Account & Accept Invite
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm transition"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                )}

                {error && !wrongAccount && (
                    <button
                        onClick={() => navigate('/')}
                        className="text-indigo-400 text-sm hover:underline"
                    >
                        Go to Dashboard
                    </button>
                )}
            </div>
        </div>
    );
}

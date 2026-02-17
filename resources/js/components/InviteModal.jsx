import { useState } from 'react';
import client from '../api/client';

export default function InviteModal({ room, onClose }) {
    const [email, setEmail]     = useState('');
    const [status, setStatus]   = useState('');
    const [loading, setLoading] = useState(false);

    const handleInvite = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus('');
        try {
            await client.post(`/rooms/${room.id}/invite`, { email });
            setStatus('Invite sent successfully.');
            setEmail('');
        } catch (err) {
            setStatus(err.response?.data?.message || 'Failed to send invite.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                <h3 className="text-white font-semibold text-lg">Invite to #{room.name}</h3>
                <form onSubmit={handleInvite} className="space-y-3">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        required />
                    {status && <p className="text-sm text-indigo-400">{status}</p>}
                    <div className="flex gap-3">
                        <button type="submit" disabled={loading}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                            {loading ? 'Sending...' : 'Send Invite'}
                        </button>
                        <button type="button" onClick={onClose}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm transition">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

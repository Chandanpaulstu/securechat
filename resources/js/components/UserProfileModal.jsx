import { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { timeAgo } from '../utils/timeAgo';
import client from '../api/client';

export default function UserProfileModal({ userId, onClose }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserProfile();
    }, [userId]);

    const fetchUserProfile = async () => {
        try {
            const res = await client.get(`/users/${userId}`);
            setUser(res.data);
        } catch (err) {
            console.error('[Profile fetch failed]', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm">
                    <div className="text-center text-gray-400">Loading...</div>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-4 mb-6">
                    <Avatar user={user} size="xl" online={user.is_online} />
                    <div className="flex-1">
                        <h3 className="text-white font-semibold text-xl">{user.name}</h3>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                    </div>
                </div>

                <div className="space-y-3 border-t border-gray-800 pt-4">
                    <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Status</span>
                        <span className={`text-sm font-medium ${user.is_online ? 'text-green-400' : 'text-gray-500'}`}>
                            {user.is_online ? '🟢 Online' : '⚫ Offline'}
                        </span>
                    </div>

                    {!user.is_online && user.last_seen_at && (
                        <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Last Seen</span>
                            <span className="text-gray-300 text-sm">{timeAgo(user.last_seen_at)}</span>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Joined</span>
                        <span className="text-gray-300 text-sm">
                            {new Date(user.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-6 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-lg transition"
                >
                    Close
                </button>
            </div>
        </div>
    );
}

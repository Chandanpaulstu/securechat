import { useEffect, useState } from 'react';
import client from '../api/client';

export default function RoomList({ selectedRoom, onSelect }) {
    const [rooms, setRooms]         = useState([]);
    const [newRoom, setNewRoom]     = useState('');
    const [creating, setCreating]   = useState(false);
    const [error, setError]         = useState('');
    const [unread, setUnread]       = useState({}); // roomId => count

    useEffect(() => {
        client.get('/rooms')
            .then(res => setRooms(res.data))
            .catch(err => console.error('Failed to load rooms:', err));
    }, []);

    // Listen for new messages from parent via window event
    useEffect(() => {
        const handler = (e) => {
            const { roomId } = e.detail;
            if (selectedRoom?.id === roomId) return; // already viewing
            setUnread(prev => ({ ...prev, [roomId]: (prev[roomId] || 0) + 1 }));
        };
        window.addEventListener('new-message', handler);
        return () => window.removeEventListener('new-message', handler);
    }, [selectedRoom?.id]);

    const handleSelect = (room) => {
        setUnread(prev => ({ ...prev, [room.id]: 0 }));
        onSelect(room);
    };

    const createRoom = async (e) => {
        e.preventDefault();
        if (!newRoom.trim()) return;
        setCreating(true);
        setError('');
        try {
            const res = await client.post('/rooms', { name: newRoom, is_private: true });
            setRooms(prev => [res.data, ...prev]);
            setNewRoom('');
            handleSelect({ ...res.data, role: 'admin' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create room.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="w-64 bg-gray-900 flex flex-col border-r border-gray-800">
            <div className="p-4 border-b border-gray-800">
                <h2 className="text-white font-bold text-lg">🔐 SecureChat</h2>
            </div>

            <form onSubmit={createRoom} className="p-3 flex gap-2">
                <input value={newRoom} onChange={e => setNewRoom(e.target.value)}
                    placeholder="New room..."
                    className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
                />
                <button type="submit" disabled={creating || !newRoom.trim()}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50">
                    +
                </button>
            </form>

            {error && <p className="text-red-400 text-xs px-3 pb-2">{error}</p>}

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {rooms.length === 0 && (
                    <p className="text-gray-600 text-xs px-3 py-4">No rooms yet. Create one!</p>
                )}
                {rooms.map(room => (
                    <button key={room.id} onClick={() => handleSelect(room)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center justify-between ${
                            selectedRoom?.id === room.id
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}>
                        <span># {room.name}</span>
                        {unread[room.id] > 0 && (
                            <span className="bg-indigo-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                                {unread[room.id] > 99 ? '99+' : unread[room.id]}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import client from '../api/client';

export default function RoomList({ selectedRoom, onSelect }) {
    const [rooms, setRooms]           = useState([]);
    const [newRoom, setNewRoom]       = useState('');
    const [creating, setCreating]     = useState(false);

    useEffect(() => {
        client.get('/rooms').then(res => setRooms(res.data));
    }, []);

    const createRoom = async (e) => {
        e.preventDefault();
        if (!newRoom.trim()) return;
        setCreating(true);
        try {
            const res = await client.post('/rooms', { name: newRoom, is_private: true });
            setRooms(prev => [res.data, ...prev]);
            setNewRoom('');
            onSelect(res.data);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="w-64 bg-gray-900 flex flex-col border-r border-gray-800">
            <div className="p-4 border-b border-gray-800">
                <h2 className="text-white font-bold text-lg">🔐 SecureChat</h2>
            </div>

            {/* Create Room */}
            <form onSubmit={createRoom} className="p-3 flex gap-2">
                <input value={newRoom} onChange={e => setNewRoom(e.target.value)}
                    placeholder="New room..."
                    className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
                />
                <button type="submit" disabled={creating}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50">
                    +
                </button>
            </form>

            {/* Room List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {rooms.map(room => (
                    <button key={room.id} onClick={() => onSelect(room)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${
                            selectedRoom?.id === room.id
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}>
                        # {room.name}
                    </button>
                ))}
            </div>
        </div>
    );
}

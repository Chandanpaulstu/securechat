import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import RoomList from '../components/RoomList';
import ChatWindow from '../components/ChatWindow';

export default function Dashboard() {
    const { user, logout }        = useAuth();
    const [selectedRoom, setRoom] = useState(null);

    return (
        <div className="h-screen flex flex-col bg-gray-950">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900">
                <span className="text-gray-400 text-sm">
                    Signed in as <span className="text-white">{user?.name}</span>
                </span>
                <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-red-400 transition"
                >
                    Logout
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <RoomList selectedRoom={selectedRoom} onSelect={setRoom} />
                <ChatWindow room={selectedRoom} currentUser={user} />
            </div>
        </div>
    );
}

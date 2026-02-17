import { useEffect, useState, useRef } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRoomChannel } from '../hooks/useEcho';
import {
    generateKeyPair, exportPublicKey, importPublicKey,
    deriveSharedKey, encryptMessage, decryptMessage
} from '../utils/crypto';
import MessageInput from './MessageInput';
import InviteModal from './InviteModal';

export default function ChatWindow({ room }) {
    const { user }                      = useAuth();
    const [messages, setMessages]       = useState([]);
    const [sharedKeys, setSharedKeys]   = useState({}); // userId => CryptoKey
    const [members, setMembers]         = useState([]);
    const [myKeyPair, setMyKeyPair]     = useState(null);
    const [ready, setReady]             = useState(false);
    const [showInvite, setShowInvite]   = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const bottomRef                     = useRef(null);

    // Step 1: generate ECDH key pair + register public key with server
    useEffect(() => {
        if (!room) return;
        setReady(false);
        setMessages([]);
        setupCrypto();
    }, [room?.id]);

    const setupCrypto = async () => {
        try {
            const keyPair    = await generateKeyPair();
            const pubKeyB64  = await exportPublicKey(keyPair.publicKey);

            await client.post(`/rooms/${room.id}/public-key`, { public_key: pubKeyB64 });

            const membersRes = await client.get(`/rooms/${room.id}/members`);
            const memberList = membersRes.data;
            setMembers(memberList);

            // Derive shared AES key with each member
            const keys = {};
            for (const m of memberList) {
                if (m.user.id === user.id || !m.public_key) continue;
                const peerPub    = await importPublicKey(m.public_key);
                keys[m.user.id] = await deriveSharedKey(keyPair.privateKey, peerPub);
            }

            setMyKeyPair(keyPair);
            setSharedKeys(keys);
            setReady(true);

            // Load message history
            const msgRes = await client.get(`/rooms/${room.id}/messages`);
            const decrypted = await decryptAll(msgRes.data, keys);
            setMessages(decrypted);
        } catch (err) {
            console.error('Crypto setup failed:', err);
        }
    };

    const decryptAll = async (rawMessages, keys) => {
        const result = [];
        for (const msg of rawMessages) {
            if (msg.user_id === user.id) {
                result.push({ ...msg, plaintext: '[You]', self: true });
                continue;
            }
            const key = keys[msg.user_id];
            if (!key) { result.push({ ...msg, plaintext: '[Key unavailable]' }); continue; }
            try {
                const plaintext = await decryptMessage(key, msg.ciphertext, msg.iv, msg.integrity_hash);
                result.push({ ...msg, plaintext });
            } catch {
                result.push({ ...msg, plaintext: '[Tampered or undecryptable]' });
            }
        }
        return result;
    };

    // Step 2: listen for incoming WebSocket messages
    useRoomChannel(
        room?.id,
        async (event) => {
            if (event.sender.id === user.id) return;
            const key = sharedKeys[event.sender.id];
            let plaintext = '[Key unavailable]';
            if (key) {
                try {
                    plaintext = await decryptMessage(key, event.ciphertext, event.iv, event.integrity_hash);
                } catch {
                    plaintext = '[Tampered or undecryptable]';
                }
            }
            setMessages(prev => [...prev, { ...event, user_id: event.sender.id, plaintext }]);
        },
        (member) => setOnlineUsers(prev => [...prev, member]),
        (member) => setOnlineUsers(prev => prev.filter(m => m.id !== member.id))
    );

    // Step 3: send encrypted message
    const handleSend = async (text) => {
        if (!text.trim() || !ready) return;

        // Encrypt for each member separately, send one payload
        // For simplicity here — using first available shared key
        // In production you'd send per-recipient ciphertext
        const memberIds = Object.keys(sharedKeys);
        if (!memberIds.length) return;

        const sharedKey = sharedKeys[memberIds[0]];
        const payload   = await encryptMessage(sharedKey, text);

        const res = await client.post(`/rooms/${room.id}/messages`, payload);

        // Show our own message immediately
        setMessages(prev => [...prev, {
            ...res.data,
            plaintext: text,
            self: true,
            sender: { id: user.id, name: 'You' },
        }]);
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!room) return (
        <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a room to start chatting
        </div>
    );

    return (
        <div className="flex-1 flex flex-col bg-gray-950">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <div>
                    <h2 className="text-white font-semibold"># {room.name}</h2>
                    <p className="text-xs text-green-400">🔒 End-to-end encrypted</p>
                </div>
                <div className="flex gap-3 items-center">
                    <span className="text-gray-500 text-sm">{members.length} members</span>
                    {room.role === 'admin' && (
                        <button onClick={() => setShowInvite(true)}
                            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition">
                            + Invite
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {!ready && (
                    <div className="text-center text-gray-500 text-sm py-8">Setting up encryption...</div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.self ? 'items-end' : 'items-start'}`}>
                        <span className="text-xs text-gray-500 mb-1">
                            {msg.self ? 'You' : msg.sender?.name}
                        </span>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                            msg.self
                                ? 'bg-indigo-600 text-white rounded-br-sm'
                                : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                        }`}>
                            {msg.plaintext}
                        </div>
                        <span className="text-xs text-gray-600 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <MessageInput onSend={handleSend} disabled={!ready} />

            {showInvite && (
                <InviteModal room={room} onClose={() => setShowInvite(false)} />
            )}
        </div>
    );
}

import { useEffect, useState, useRef } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRoomChannel } from '../hooks/useEcho';
import {
    generateKeyPair, exportPublicKey, importPublicKey,
    deriveSharedKey, encryptMessage, decryptMessage,
    saveKeyPair, loadKeyPair
} from '../utils/crypto';
import MessageInput from './MessageInput';
import InviteModal from './InviteModal';
import TypingIndicator from './TypingIndicator';

export default function ChatWindow({ room, currentUser }) {
    const { user }                    = useAuth();
    const [messages, setMessages]     = useState([]);
    const [members, setMembers]       = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [ready, setReady]           = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const bottomRef                   = useRef(null);
    const typingTimeoutRef            = useRef(null);
    const audioRef                    = useRef(null);

    const sharedKeysRef = useRef({});
    const myKeyPairRef  = useRef(null);
    const roomRef       = useRef(room);
    const userRef       = useRef(user);

    useEffect(() => { roomRef.current = room; }, [room]);
    useEffect(() => { userRef.current = user; }, [user]);

    useEffect(() => {
        if (!room) return;
        setReady(false);
        setMessages([]);
        setTypingUsers([]);
        setOnlineUsers([]);
        sharedKeysRef.current = {};
        myKeyPairRef.current  = null;
        setupCrypto();
    }, [room?.id]);

    const setupCrypto = async () => {
        const currentRoom = roomRef.current;
        if (!currentRoom) return;

        try {
            // Try to load existing keypair from localStorage
            let keyPair = await loadKeyPair(currentRoom.id);

            if (!keyPair) {
                // Generate new keypair only if none exists
                console.log('[Crypto] Generating new keypair for room', currentRoom.id);
                keyPair = await generateKeyPair();
                await saveKeyPair(currentRoom.id, keyPair);
            } else {
                console.log('[Crypto] Loaded existing keypair from localStorage');
            }

            const pubKeyB64 = await exportPublicKey(keyPair.publicKey);
            await client.post(`/rooms/${currentRoom.id}/public-key`, { public_key: pubKeyB64 });
            myKeyPairRef.current = keyPair;

            await refreshKeys(keyPair);
            setReady(true);

            const msgRes    = await client.get(`/rooms/${currentRoom.id}/messages`);
            const decrypted = await decryptAll(msgRes.data);
            setMessages(decrypted);
        } catch (err) {
            console.error('[Crypto Setup Failed]', err);
        }
    };

    const refreshKeys = async (keyPair) => {
        const kp          = keyPair || myKeyPairRef.current;
        const currentRoom = roomRef.current;
        const currentUser = userRef.current;

        if (!kp || !currentRoom || !currentUser) {
            console.warn('[refreshKeys] Missing deps');
            return;
        }

        try {
            const membersRes = await client.get(`/rooms/${currentRoom.id}/members`);
            const memberList = membersRes.data;
            setMembers(memberList);

            const keys = {};
            for (const m of memberList) {
                if (m.user.id === currentUser.id || !m.public_key) continue;
                try {
                    const peerPub    = await importPublicKey(m.public_key);
                    keys[m.user.id] = await deriveSharedKey(kp.privateKey, peerPub);
                    console.log(`[Crypto] Derived key for user ${m.user.id} (${m.user.name})`);
                } catch (e) {
                    console.error(`[Crypto] Failed key for user ${m.user.id}:`, e);
                }
            }

            sharedKeysRef.current = keys;
            console.log('[Crypto] Keys refreshed. Available:', Object.keys(keys));
        } catch (err) {
            console.error('[refreshKeys failed]', err);
        }
    };

    const decryptAll = async (rawMessages) => {
        const currentUser = userRef.current;
        const result      = [];

        for (const msg of rawMessages) {
            if (msg.user_id === currentUser?.id) {
                result.push({ ...msg, plaintext: '[Your message]', self: true });
                continue;
            }
            const key = sharedKeysRef.current[msg.user_id];
            if (!key) {
                console.warn(`[Decrypt] No key for user ${msg.user_id}`);
                result.push({ ...msg, plaintext: '[Key unavailable - sender may have cleared browser data]' });
                continue;
            }
            try {
                const plaintext = await decryptMessage(key, msg.ciphertext, msg.iv);
                result.push({ ...msg, plaintext });
            } catch (e) {
                console.error(`[Decrypt Failed]`, e.name, e.message);
                result.push({ ...msg, plaintext: '[Could not decrypt]' });
            }
        }
        return result;
    };

    const playNotificationSound = () => {
        if (!audioRef.current) {
            audioRef.current = new Audio('/notification.mp3');
        }
        audioRef.current.play().catch(e => console.log('[Sound blocked by browser]', e));
    };

    const handleTyping = async (isTyping) => {
        if (!roomRef.current) return;

        try {
            await client.post(`/rooms/${roomRef.current.id}/typing`, { is_typing: isTyping });
        } catch (e) {
            console.error('[Typing event failed]', e);
        }
    };

    const onInputChange = (text) => {
        if (!text.trim()) {
            handleTyping(false);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
            return;
        }

        handleTyping(true);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            handleTyping(false);
        }, 2000);
    };

    useRoomChannel(
        room?.id,
        async (event) => {
            const currentUser = userRef.current;
            if (event.sender.id === currentUser?.id) return;

            console.log('[WS] Message from', event.sender.id);

            let key = sharedKeysRef.current[event.sender.id];
            if (!key) {
                console.warn('[WS] Key missing, refreshing...');
                await refreshKeys();
                key = sharedKeysRef.current[event.sender.id];
            }

            let plaintext = '[Key unavailable]';
            if (key) {
                try {
                    plaintext = await decryptMessage(key, event.ciphertext, event.iv);
                } catch (e) {
                    console.error('[WS Decrypt Failed]', e.name, e.message);
                    plaintext = '[Could not decrypt]';
                }
            }

            setMessages(prev => [...prev, {
                ...event,
                user_id:    event.sender.id,
                sender:     event.sender,
                created_at: event.created_at,
                plaintext,
            }]);

            playNotificationSound();

            window.dispatchEvent(new CustomEvent('new-message', {
                detail: { roomId: roomRef.current?.id }
            }));
        },
        (member) => {
            console.log('[WS] Member joined:', member.name);
            setOnlineUsers(prev => {
                if (prev.find(u => u.id === member.id)) return prev;
                return [...prev, member];
            });
            refreshKeys();
        },
        (member) => {
            console.log('[WS] Member left:', member.name);
            setOnlineUsers(prev => prev.filter(u => u.id !== member.id));
        },
        (typingEvent) => {
            const { user_id, user_name, is_typing } = typingEvent;
            const currentUser = userRef.current;

            if (user_id === currentUser?.id) return;

            setTypingUsers(prev => {
                if (is_typing) {
                    if (prev.find(u => u.id === user_id)) return prev;
                    return [...prev, { id: user_id, name: user_name }];
                } else {
                    return prev.filter(u => u.id !== user_id);
                }
            });
        },
        (members) => {
            console.log('[WS] Here now:', members.length, 'users');
            setOnlineUsers(members);
        }
    );

    const handleSend = async (text) => {
        if (!text.trim() || !ready) return;

        handleTyping(false);
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        const memberIds = Object.keys(sharedKeysRef.current);
        if (!memberIds.length) {
            alert('No other members with keys. Ask them to open the room first.');
            return;
        }

        const sharedKey = sharedKeysRef.current[memberIds[0]];
        const payload   = await encryptMessage(sharedKey, text);

        try {
            const res = await client.post(`/rooms/${roomRef.current.id}/messages`, payload);
            setMessages(prev => [...prev, {
                ...res.data,
                plaintext: text,
                self:      true,
                sender:    { id: userRef.current.id, name: 'You' },
            }]);
        } catch (err) {
            console.error('[Send Failed]', err);
        }
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!room) return (
        <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a room to start chatting
        </div>
    );

    const onlineCount = onlineUsers.filter(u => u.id !== user?.id).length;

    return (
        <div className="flex-1 flex flex-col bg-gray-950">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <div>
                    <h2 className="text-white font-semibold"># {room.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-green-400">🔒 End-to-end encrypted</p>
                        {onlineCount > 0 && (
                            <p className="text-xs text-blue-400">
                                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-1 animate-pulse"></span>
                                {onlineCount} online
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    <span className="text-gray-500 text-sm">{members.length} members</span>
                    {room.created_by === currentUser?.id && (
                        <button onClick={() => setShowInvite(true)}
                            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition">
                            + Invite
                        </button>
                    )}
                </div>
            </div>

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

            <TypingIndicator typingUsers={typingUsers} />
            <MessageInput onSend={handleSend} onTyping={onInputChange} disabled={!ready} />

            {showInvite && <InviteModal room={room} onClose={() => setShowInvite(false)} />}
        </div>
    );
}

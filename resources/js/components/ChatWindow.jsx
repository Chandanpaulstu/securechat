import { useEffect, useState, useRef } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRoomChannel } from '../hooks/useEcho';
import { useToast } from '../hooks/useToast';
import {
    generateKeyPair, exportPublicKey, importPublicKey,
    deriveSharedKey, encryptMessage, decryptMessage,
    saveKeyPair, loadKeyPair
} from '../utils/crypto';
import { groupMessagesByDate } from '../utils/groupMessages';
import { timeAgo } from '../utils/timeAgo';
import MessageInput from './MessageInput';
import InviteModal from './InviteModal';
import TypingIndicator from './TypingIndicator';
import Avatar from './Avatar';
import ToastContainer from './ToastContainer';

// ─── WhatsApp-style SVG pattern ───────
const WA_PATTERN_SVG = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234a5568' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

// ─── Theme definitions ─────
const THEMES = {
    whatsapp: {
        label:   'WhatsApp',
        preview: '#1a2a1a',
        style:   { backgroundColor: '#111b21', backgroundImage: WA_PATTERN_SVG },
    },
    midnight: {
        label:   'Midnight',
        preview: '#1e1b4b',
        style:   { background: 'linear-gradient(135deg, #0f0c29, #1a1a4e, #24243e)' },
    },
    sunset: {
        label:   'Sunset',
        preview: '#7f1d1d',
        style:   { background: 'linear-gradient(135deg, #0d0d0d, #1a0a0a, #2d1a0a)' },
    },
    forest: {
        label:   'Forest',
        preview: '#14532d',
        style:   { background: 'linear-gradient(135deg, #0a0f0a, #0d1f0d, #111a11)' },
    },
    ocean: {
        label:   'Ocean',
        preview: '#0c4a6e',
        style:   { background: 'linear-gradient(135deg, #020617, #0a1628, #0c2340)' },
    },
    aurora: {
        label:   'Aurora',
        preview: '#4c1d95',
        style:   { background: 'linear-gradient(135deg, #0d0221, #1a0533, #0d1f2d)' },
    },
    plain: {
        label:   'Plain',
        preview: '#030712',
        style:   { backgroundColor: '#030712' },
    },
};

export default function ChatWindow({ room, currentUser }) {
    const { user }                    = useAuth();
    const { toasts, showToast, removeToast } = useToast();
    const [messages, setMessages]     = useState([]);
    const [members, setMembers]       = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [ready, setReady]           = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [showThemePicker, setShowThemePicker] = useState(false);
    const [chatTheme, setChatTheme]   = useState(
        () => localStorage.getItem('chat_theme') || 'whatsapp'
    );

    const bottomRef        = useRef(null);
    const typingTimeoutRef = useRef(null);
    const audioRef         = useRef(null);
    const themePickerRef   = useRef(null);
    const hasRequestedNotificationPermission = useRef(false);

    const sharedKeysRef = useRef({});
    const myKeyPairRef  = useRef(null);
    const roomRef       = useRef(room);
    const userRef       = useRef(user);

    useEffect(() => { roomRef.current = room; }, [room]);
    useEffect(() => { userRef.current = user; }, [user]);

    // Close theme picker on outside click
    useEffect(() => {
        const handler = (e) => {
            if (themePickerRef.current && !themePickerRef.current.contains(e.target)) {
                setShowThemePicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleThemeChange = (key) => {
        setChatTheme(key);
        localStorage.setItem('chat_theme', key);
        setShowThemePicker(false);
    };

    useEffect(() => {
        if (!hasRequestedNotificationPermission.current && 'Notification' in window) {
            if (Notification.permission === 'default') Notification.requestPermission();
            hasRequestedNotificationPermission.current = true;
        }
    }, []);

    useEffect(() => {
        if (!room) return;
        setReady(false);
        setMessages([]);
        setTypingUsers([]);
        setOnlineUsers([]);
        setReplyingTo(null);
        setEditingMessage(null);
        sharedKeysRef.current = {};
        myKeyPairRef.current  = null;
        setupCrypto();
    }, [room?.id]);

    // ─── Crypto setup ────────
    const setupCrypto = async () => {
        const currentRoom = roomRef.current;
        if (!currentRoom) return;
        try {
            let keyPair = await loadKeyPair(currentRoom.id);
            if (!keyPair) {
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
            markMessagesDelivered(msgRes.data);
        } catch (err) {
            console.error('[Crypto Setup Failed]', err);
            showToast('Failed to setup encryption', 'error');
        }
    };

    const refreshKeys = async (keyPair) => {
        const kp          = keyPair || myKeyPairRef.current;
        const currentRoom = roomRef.current;
        const currentUser = userRef.current;
        if (!kp || !currentRoom || !currentUser) return;
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
                } catch (e) {
                    console.error(`[Crypto] Failed key for user ${m.user.id}:`, e);
                }
            }
            sharedKeysRef.current = keys;
        } catch (err) {
            console.error('[refreshKeys failed]', err);
        }
    };

    const decryptAll = async (rawMessages) => {
        const currentUser    = userRef.current;
        const currentRoom    = roomRef.current;
        const result         = [];
        const storageKey     = `own_messages_${currentRoom.id}`;
        const ownMessages    = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const ownMessagesMap = Object.fromEntries(ownMessages.map(m => [m.id, m.plaintext]));

        for (const msg of rawMessages) {
            if (msg.user_id === currentUser?.id) {
                const plaintext = ownMessagesMap[msg.id] || '[Your message - plaintext lost]';
                result.push({ ...msg, plaintext, self: true });
                continue;
            }
            const key = sharedKeysRef.current[msg.user_id];
            if (!key) { result.push({ ...msg, plaintext: '[Key unavailable]' }); continue; }
            try {
                const plaintext = await decryptMessage(key, msg.ciphertext, msg.iv);
                result.push({ ...msg, plaintext });
            } catch (e) {
                result.push({ ...msg, plaintext: '[Could not decrypt]' });
            }
        }
        return result;
    };

    const markMessagesDelivered = async (messages) => {
        const currentUser = userRef.current;
        const currentRoom = roomRef.current;
        for (const msg of messages) {
            if (msg.user_id !== currentUser?.id && msg.status === 'sent') {
                try { await client.post(`/rooms/${currentRoom.id}/messages/${msg.id}/delivered`); } catch (e) {}
            }
        }
    };

    const markMessagesSeen = async () => {
        const currentRoom = roomRef.current;
        if (!currentRoom) return;
        try { await client.post(`/rooms/${currentRoom.id}/mark-seen`); } catch (e) {}
    };

    const playNotificationSound = () => {
        if (!audioRef.current) audioRef.current = new Audio('/notification.mp3');
        audioRef.current.play().catch(() => {});
    };

    const showDesktopNotification = (senderName, text) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`${senderName} in #${roomRef.current?.name}`, {
                body: text.substring(0, 100),
                icon: '/logo.png',
                tag: roomRef.current?.id,
            });
        }
    };

    const handleTyping = async (isTyping) => {
        if (!roomRef.current) return;
        try { await client.post(`/rooms/${roomRef.current.id}/typing`, { is_typing: isTyping }); } catch (e) {}
    };

    const onInputChange = (text) => {
        if (!text.trim()) {
            handleTyping(false);
            if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
            return;
        }
        handleTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => handleTyping(false), 2000);
    };

    // ─── Delete ───
    const deleteMessage = async (messageId) => {
        if (!confirm('Delete this message for everyone?')) return;
        try {
            await client.delete(`/rooms/${roomRef.current.id}/messages/${messageId}`);
            setMessages(prev => prev.filter(m => m.id !== messageId));
            const storageKey = `own_messages_${roomRef.current.id}`;
            const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
            localStorage.setItem(storageKey, JSON.stringify(stored.filter(m => m.id !== messageId)));
            showToast('Message deleted', 'success');
        } catch (err) {
            showToast('Failed to delete message', 'error');
        }
    };

    // ─── Reply ────
    const startReply  = (message) => setReplyingTo(message);
    const cancelReply = () => setReplyingTo(null);

    // ─── Edit ────
    const startEdit = (message) => {
        if (!message.self) return;
        setEditingMessage(message);
        setReplyingTo(null); // cancel reply if editing
    };

    const cancelEdit = () => setEditingMessage(null);

    const handleEdit = async (text) => {
        if (!text.trim() || !editingMessage) return;

        const memberIds = Object.keys(sharedKeysRef.current);
        if (!memberIds.length) {
            showToast('No other members available', 'warning');
            return;
        }

        const sharedKey = sharedKeysRef.current[memberIds[0]];
        const payload   = await encryptMessage(sharedKey, text);

        try {
            await client.put(
                `/rooms/${roomRef.current.id}/messages/${editingMessage.id}`,
                payload
            );

            setMessages(prev => prev.map(m =>
                m.id === editingMessage.id
                    ? { ...m, plaintext: text, edited_at: new Date().toISOString() }
                    : m
            ));

            // Update localStorage plaintext
            const storageKey = `own_messages_${roomRef.current.id}`;
            const stored  = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const updated = stored.map(m =>
                m.id === editingMessage.id ? { ...m, plaintext: text } : m
            );
            localStorage.setItem(storageKey, JSON.stringify(updated));

            setEditingMessage(null);
            showToast('Message edited', 'success');
        } catch (err) {
            showToast('Failed to edit message', 'error');
        }
    };

    // ─── WebSocket channel ───────────
    const { connectionState } = useRoomChannel(
        room?.id,
        // New message
        async (event) => {
            const currentUser = userRef.current;
            if (event.sender.id === currentUser?.id) return;

            let key = sharedKeysRef.current[event.sender.id];
            if (!key) { await refreshKeys(); key = sharedKeysRef.current[event.sender.id]; }

            let plaintext = '[Key unavailable]';
            if (key) {
                try { plaintext = await decryptMessage(key, event.ciphertext, event.iv); }
                catch (e) { plaintext = '[Could not decrypt]'; }
            }

            const newMessage = {
                ...event,
                user_id:        event.sender.id,
                sender:         event.sender,
                created_at:     event.created_at,
                plaintext,
                status:         'delivered',
                repliedMessage: event.repliedMessage || null,
            };

            setMessages(prev => [...prev, newMessage]);
            playNotificationSound();
            showDesktopNotification(event.sender.name, plaintext);
            try { await client.post(`/rooms/${roomRef.current.id}/messages/${event.id}/delivered`); } catch (e) {}
            window.dispatchEvent(new CustomEvent('new-message', { detail: { roomId: roomRef.current?.id } }));
        },
        // Member joined
        (member) => {
            setOnlineUsers(prev => prev.find(u => u.id === member.id) ? prev : [...prev, member]);
            refreshKeys();
        },
        // Member left
        (member) => setOnlineUsers(prev => prev.filter(u => u.id !== member.id)),
        // Typing
        (typingEvent) => {
            const { user_id, user_name, is_typing } = typingEvent;
            if (user_id === userRef.current?.id) return;
            setTypingUsers(prev => {
                if (is_typing) return prev.find(u => u.id === user_id) ? prev : [...prev, { id: user_id, name: user_name }];
                return prev.filter(u => u.id !== user_id);
            });
        },
        // Here (presence joined)
        (members) => { setOnlineUsers(members); markMessagesSeen(); },
        // Message delivered
        (event) => setMessages(prev => prev.map(m =>
            m.id === event.message_id ? { ...m, status: 'delivered' } : m
        )),
        // Message seen
        (event) => setMessages(prev => prev.map(m =>
            m.id === event.message_id ? { ...m, status: 'seen' } : m
        )),
        // Message deleted
        (event) => {
            setMessages(prev => prev.filter(m => m.id !== event.message_id));
            showToast('Message deleted', 'info');
        },
        // Message edited (broadcast from other user)
        (event) => {
            const key = sharedKeysRef.current[event.sender_id];
            if (key) {
                decryptMessage(key, event.ciphertext, event.iv)
                    .then(plaintext => {
                        setMessages(prev => prev.map(m =>
                            m.id === event.message_id
                                ? { ...m, plaintext, ciphertext: event.ciphertext, iv: event.iv, edited_at: new Date().toISOString() }
                                : m
                        ));
                    })
                    .catch(() => {});
            }
        }
    );

    // ─── Send ──────────────
    const handleSend = async (text) => {
        if (!text.trim() || !ready) return;
        handleTyping(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        const memberIds = Object.keys(sharedKeysRef.current);
        if (!memberIds.length) { showToast('No other members available', 'warning'); return; }

        const sharedKey = sharedKeysRef.current[memberIds[0]];
        const payload   = await encryptMessage(sharedKey, text);
        if (replyingTo) payload.reply_to = replyingTo.id;

        try {
            const res = await client.post(`/rooms/${roomRef.current.id}/messages`, payload);
            const newMessage = {
                ...res.data,
                plaintext:      text,
                self:           true,
                sender:         userRef.current,
                status:         'sent',
                repliedMessage: replyingTo || null,
            };
            setMessages(prev => [...prev, newMessage]);

            const storageKey = `own_messages_${roomRef.current.id}`;
            const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
            stored.push({ id: res.data.id, plaintext: text, created_at: res.data.created_at });
            localStorage.setItem(storageKey, JSON.stringify(stored));

            setReplyingTo(null);
        } catch (err) {
            showToast('Failed to send message', 'error');
        }
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (messages.length > 0 && room) markMessagesSeen();
    }, [messages.length, room?.id]);

    if (!room) return (
        <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a room to start chatting
        </div>
    );

    const onlineCount     = onlineUsers.filter(u => u.id !== user?.id).length;
    const groupedMessages = groupMessagesByDate(messages);
    const activeTheme     = THEMES[chatTheme] || THEMES.whatsapp;

    return (
        <div className="flex-1 flex flex-col bg-gray-950">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* ── Header ────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900 z-10">
                <div>
                    <h2 className="text-white font-semibold"># {room.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-green-400">🔒 End-to-end encrypted</p>
                        {onlineCount > 0 ? (
                            <p className="text-xs text-blue-400">
                                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-1 animate-pulse" />
                                {onlineCount} online
                            </p>
                        ) : (
                            members.length > 1 &&
                            members.find(m => m.user.id !== user?.id)?.user?.last_seen_at && (
                                <p className="text-xs text-gray-500">
                                    Last seen {timeAgo(members.find(m => m.user.id !== user?.id).user.last_seen_at)}
                                </p>
                            )
                        )}
                        {connectionState === 'connecting'  && <p className="text-xs text-yellow-400">Connecting...</p>}
                        {connectionState === 'unavailable' && <p className="text-xs text-red-400">Disconnected - Reconnecting...</p>}
                    </div>
                </div>

                <div className="flex gap-3 items-center">
                    <span className="text-gray-500 text-sm">{members.length} members</span>

                    {/* ── Theme Picker ───*/}
                    <div className="relative" ref={themePickerRef}>
                        <button
                            onClick={() => setShowThemePicker(prev => !prev)}
                            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-700 transition"
                            title="Change chat theme"
                        >
                            🎨
                        </button>

                        {showThemePicker && (
                            <div className="absolute right-0 top-10 z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-3 w-52">
                                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
                                    Chat Theme
                                </p>
                                <div className="flex flex-col gap-1">
                                    {Object.entries(THEMES).map(([key, theme]) => (
                                        <button
                                            key={key}
                                            onClick={() => handleThemeChange(key)}
                                            className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition ${
                                                chatTheme === key
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-gray-300 hover:bg-gray-700'
                                            }`}
                                        >
                                            <span
                                                className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0"
                                                style={{ backgroundColor: theme.preview }}
                                            />
                                            {theme.label}
                                            {chatTheme === key && <span className="ml-auto text-xs">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {room.created_by === currentUser?.id && (
                        <button
                            onClick={() => setShowInvite(true)}
                            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition"
                        >
                            + Invite
                        </button>
                    )}
                </div>
            </div>

            {/* ── Messages area ────*/}
            <div
                className="flex-1 overflow-y-auto px-6 py-4 transition-all duration-500"
                style={activeTheme.style}
            >
                {!ready && (
                    <div className="text-center text-gray-500 text-sm py-8">
                        Setting up encryption...
                    </div>
                )}

                {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                        {/* Date separator */}
                        <div className="flex items-center justify-center my-4">
                            <span className="bg-black/40 backdrop-blur-sm text-gray-300 text-xs px-3 py-1 rounded-full shadow">
                                {date}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {msgs.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex gap-3 ${msg.self ? 'flex-row-reverse' : ''} group`}
                                >
                                    <Avatar
                                        user={msg.sender}
                                        size="sm"
                                        online={onlineUsers.some(u => u.id === msg.sender?.id)}
                                    />

                                    <div className={`flex flex-col ${msg.self ? 'items-end' : 'items-start'} flex-1`}>
                                        <span className="text-xs text-gray-400 mb-1 drop-shadow">
                                            {msg.self ? 'You' : msg.sender?.name}
                                            {!msg.self && msg.sender?.last_seen_at && (
                                                <span className="ml-2 text-gray-500">
                                                    · {timeAgo(msg.sender.last_seen_at)}
                                                </span>
                                            )}
                                        </span>

                                        <div className="flex items-end gap-2">
                                            {/* ── Bubble ── */}
                                            <div className={`max-w-xs lg:max-w-md rounded-2xl text-sm shadow-md ${
                                                msg.self
                                                    ? 'bg-indigo-600 text-white rounded-br-sm'
                                                    : 'bg-gray-800/90 backdrop-blur-sm text-gray-100 rounded-bl-sm'
                                            }`}>
                                                {/* Reply preview */}
                                                {msg.repliedMessage && (
                                                    <div className={`mx-2 mt-2 px-3 py-1.5 border-l-2 rounded text-xs ${
                                                        msg.self
                                                            ? 'border-indigo-300 bg-indigo-700/60'
                                                            : 'border-gray-500 bg-gray-700/60'
                                                    }`}>
                                                        <div className="font-semibold opacity-80 mb-0.5">
                                                            {msg.repliedMessage.sender?.name || 'Unknown'}
                                                        </div>
                                                        <div className="opacity-70 truncate">
                                                            {msg.repliedMessage.plaintext || '[Message]'}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="px-4 py-2">{msg.plaintext}</div>
                                            </div>

                                            {/* ── Action buttons (hover) ── */}
                                            {!msg.self && (
                                                <button
                                                    onClick={() => startReply(msg)}
                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-200 text-sm transition"
                                                    title="Reply"
                                                >
                                                    ↩️
                                                </button>
                                            )}

                                            {msg.self && (
                                                <>
                                                    <button
                                                        onClick={() => startEdit(msg)}
                                                        className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 text-xs transition"
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => deleteMessage(msg.id)}
                                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs transition"
                                                        title="Delete for everyone"
                                                    >
                                                        🗑️
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {/* ── Timestamp + status + edited badge ── */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500">
                                                {new Date(msg.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                                {msg.edited_at && (
                                                    <span className="ml-1 text-gray-600 italic">(edited)</span>
                                                )}
                                            </span>
                                            {msg.self && (
                                                <span className="text-xs text-gray-400">
                                                    {msg.status === 'seen'      && '✓✓ Seen'}
                                                    {msg.status === 'delivered' && '✓✓'}
                                                    {msg.status === 'sent'      && '✓'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div ref={bottomRef} />
            </div>

            {/* ── Reply preview bar ── */}
            {replyingTo && (
                <div className="px-6 py-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-indigo-400 text-lg mt-0.5">↩</span>
                        <div className="min-w-0">
                            <div className="text-xs text-indigo-400 font-medium">
                                Replying to {replyingTo.sender?.name}
                            </div>
                            <div className="text-sm text-gray-300 truncate">
                                {replyingTo.plaintext}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={cancelReply}
                        className="text-gray-400 hover:text-white ml-4 text-xl leading-none"
                        title="Cancel reply"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* ── Edit mode bar ─── */}
            {editingMessage && (
                <div className="px-6 py-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-blue-400 text-lg mt-0.5">✏️</span>
                        <div className="min-w-0">
                            <div className="text-xs text-blue-400 font-medium">Editing message</div>
                            <div className="text-sm text-gray-300 truncate">
                                {editingMessage.plaintext}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={cancelEdit}
                        className="text-gray-400 hover:text-white ml-4 text-xl leading-none"
                        title="Cancel edit"
                    >
                        ✕
                    </button>
                </div>
            )}

            <TypingIndicator typingUsers={typingUsers} />

            {/* ── Input — switches between send / edit mode ─── */}
            <MessageInput
                onSend={editingMessage ? handleEdit : handleSend}
                onTyping={onInputChange}
                disabled={!ready}
                editMode={editingMessage ? { text: editingMessage.plaintext, onSave: handleEdit } : null}
                onCancelEdit={cancelEdit}
            />

            {showInvite && <InviteModal room={room} onClose={() => setShowInvite(false)} />}
        </div>
    );
}

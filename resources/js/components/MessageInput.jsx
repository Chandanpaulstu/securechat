import { useState } from 'react';

export default function MessageInput({ onSend, disabled }) {
    const [text, setText] = useState('');

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    };

    const submit = () => {
        if (!text.trim()) return;
        onSend(text);
        setText('');
    };

    return (
        <div className="px-6 py-4 border-t border-gray-800 flex gap-3 items-end">
            <textarea
                rows={1}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={disabled ? 'Setting up encryption...' : 'Type a message... (Enter to send)'}
                className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-xl resize-none outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-sm"
            />
            <button onClick={submit} disabled={disabled || !text.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl transition disabled:opacity-40 text-sm font-medium">
                Send
            </button>
        </div>
    );
}

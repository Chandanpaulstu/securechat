import { useState, useEffect } from 'react';

export default function MessageInput({ onSend, onTyping, disabled, editMode = null, onCancelEdit }) {
    const [text, setText] = useState('');

    useEffect(() => {
        if (editMode) {
            setText(editMode.text);
        }
    }, [editMode]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim() || disabled) return;

        if (editMode) {
            editMode.onSave(text);
        } else {
            onSend(text);
        }

        setText('');
    };

    const handleCancel = () => {
        setText('');
        onCancelEdit?.();
    };

    return (
        <form onSubmit={handleSubmit} className="px-6 py-4 border-t border-gray-800">
            {editMode && (
                <div className="mb-2 text-xs text-yellow-400">
                    ✏️ Editing message
                </div>
            )}
            <div className="flex gap-3">
                <textarea
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        onTyping?.(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                        if (e.key === 'Escape' && editMode) {
                            handleCancel();
                        }
                    }}
                    placeholder={editMode ? "Edit your message..." : "Type a message..."}
                    disabled={disabled}
                    className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={1}
                />
                {editMode ? (
                    <>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-6 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={disabled || !text.trim()}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 rounded-lg transition disabled:opacity-50"
                        >
                            Save
                        </button>
                    </>
                ) : (
                    <button
                        type="submit"
                        disabled={disabled || !text.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg transition disabled:opacity-50"
                    >
                        Send
                    </button>
                )}
            </div>
        </form>
    );
}

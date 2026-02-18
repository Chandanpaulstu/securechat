import { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';

export default function MessageInput({ onSend, onTyping, disabled, editMode = null, onCancelEdit }) {
    const [text, setText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);

    useEffect(() => {
        if (editMode) {
            setText(editMode.text);
        }
    }, [editMode]);

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim() || disabled) return;

        if (editMode) {
            editMode.onSave(text);
        } else {
            onSend(text);
        }

        setText('');
        setShowEmojiPicker(false);
    };

    const handleCancel = () => {
        setText('');
        setShowEmojiPicker(false);
        onCancelEdit?.();
    };

    const onEmojiClick = (emojiData) => {
        setText(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    return (
        <form onSubmit={handleSubmit} className="px-6 py-4 border-t border-gray-800 relative">
            {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-20 left-6 z-50">
                    <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        theme="dark"
                        width={350}
                        height={400}
                    />
                </div>
            )}

            <div className="flex gap-3 items-end">
                <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-2xl hover:scale-110 transition pb-2"
                    title="Add emoji"
                >
                    😊
                </button>

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
                        if (e.key === 'Escape') {
                            if (showEmojiPicker) {
                                setShowEmojiPicker(false);
                            } else if (editMode) {
                                handleCancel();
                            }
                        }
                    }}
                    placeholder={editMode ? "Edit your message..." : "Type a message..."}
                    disabled={disabled}
                    className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32"
                    rows={1}
                    style={{ minHeight: '48px' }}
                    onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                    }}
                />

                {editMode ? (
                    <>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={disabled || !text.trim()}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50"
                        >
                            Save
                        </button>
                    </>
                ) : (
                    <button
                        type="submit"
                        disabled={disabled || !text.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50"
                    >
                        Send
                    </button>
                )}
            </div>
        </form>
    );
}

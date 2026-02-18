export default function TypingIndicator({ typingUsers }) {
    if (!typingUsers || typingUsers.length === 0) return null;

    const names = typingUsers.map(u => u.name).join(', ');
    const text = typingUsers.length === 1
        ? `${names} is typing...`
        : `${names} are typing...`;

    return (
        <div className="px-6 py-2 text-xs text-gray-400 italic">
            {text}
            <span className="typing-dots">
                <span>.</span><span>.</span><span>.</span>
            </span>
        </div>
    );
}

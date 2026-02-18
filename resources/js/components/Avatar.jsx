export default function Avatar({ user, size = 'md', online = false }) {
    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-xl',
    };

    const colors = [
        'bg-red-500',
        'bg-blue-500',
        'bg-green-500',
        'bg-yellow-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-teal-500',
    ];

    // Generate consistent color based on user ID
    const colorClass = user?.avatar_color || colors[user?.id % colors.length];

    return (
        <div className="relative inline-block">
            {user?.avatar ? (
                <img
                    src={user.avatar}
                    alt={user.name}
                    className={`${sizes[size]} rounded-full object-cover`}
                />
            ) : (
                <div
                    className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white ${colorClass}`}
                >
                    {user?.initials || user?.name?.substring(0, 2).toUpperCase() || '??'}
                </div>
            )}
            {online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-gray-900 rounded-full"></span>
            )}
        </div>
    );
}

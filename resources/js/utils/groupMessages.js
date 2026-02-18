export function groupMessagesByDate(messages) {
    const groups = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    messages.forEach(msg => {
        const date = new Date(msg.created_at);
        const dateKey = date.toDateString();

        let label;
        if (dateKey === today.toDateString()) {
            label = 'Today';
        } else if (dateKey === yesterday.toDateString()) {
            label = 'Yesterday';
        } else if (date.getFullYear() === today.getFullYear()) {
            label = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        } else {
            label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }

        if (!groups[label]) {
            groups[label] = [];
        }
        groups[label].push(msg);
    });

    return groups;
}

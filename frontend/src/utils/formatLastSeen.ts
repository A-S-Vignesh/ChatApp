export function formatLastSeen(date?: string | Date) {
  if (!date) return "Last seen recently";

  const lastSeen = new Date(date);
  const now = new Date();

  const isToday = lastSeen.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isYesterday = lastSeen.toDateString() === yesterday.toDateString();

  const time = lastSeen.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) {
    return `Last seen today at ${time}`;
  }

  if (isYesterday) {
    return `Last seen yesterday at ${time}`;
  }

  const datePart = lastSeen.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });

  return `Last seen ${datePart} at ${time}`;
}

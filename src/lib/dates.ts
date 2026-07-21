// Date helpers that work in local time. `played_at` is a calendar date
// (YYYY-MM-DD) with no timezone, so we deliberately avoid `new Date(string)`
// which would parse it as UTC midnight and can shift the day.

export function todayISO(): string {
  const now = new Date();
  return toISODate(now);
}

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parse a YYYY-MM-DD string into a local Date (midnight local time). */
export function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** e.g. "May 25, 3:42 PM" (with the year when it isn't the current one). */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const h12 = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const time = `${h12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
  const year = d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${year}, ${time}`;
}

/** "Today", "Yesterday", or e.g. "Mon, May 25 2026". */
export function formatDateHeading(iso: string): string {
  const date = fromISODate(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  const weekday = WEEKDAYS[date.getDay()].slice(0, 3);
  return `${weekday}, ${MONTHS[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
}

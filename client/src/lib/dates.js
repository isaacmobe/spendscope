/**
 * dates.js
 * --------
 * Small calendar helpers shared by the plan and the bills.
 */
export const DAY_MS = 86400000;

export const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const sameMonth = (d, now) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();

export const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

// Next date a monthly bill falls due. A due day of 31 becomes the last day of shorter months.
export function nextDueDate(dueDay, now = new Date()) {
  const today = startOfDay(now);
  const y = now.getFullYear();
  const m = now.getMonth();
  const thisMonth = new Date(y, m, Math.min(dueDay, daysInMonth(y, m)));
  if (thisMonth >= today) return thisMonth;
  const ny = m === 11 ? y + 1 : y;
  const nm = (m + 1) % 12;
  return new Date(ny, nm, Math.min(dueDay, daysInMonth(ny, nm)));
}

/**
 * How many times a monthly bill has fallen due, counting from the day it was added up to `now`
 * (a bill added on or before its due day in a month is charged for that month).
 */
export function dueCount(dueDay, since, now = new Date()) {
  const from = startOfDay(new Date(since));
  const to = startOfDay(now);
  let count = 0;
  for (let y = from.getFullYear(), m = from.getMonth(); y < to.getFullYear() || (y === to.getFullYear() && m <= to.getMonth()); m++) {
    if (m > 11) {
      m = 0;
      y++;
    }
    const due = new Date(y, m, Math.min(dueDay, daysInMonth(y, m)));
    if (due >= from && due <= to) count++;
    if (y === to.getFullYear() && m === to.getMonth()) break;
  }
  return count;
}

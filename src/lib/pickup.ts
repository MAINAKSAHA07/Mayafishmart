import { addHours, format, startOfDay } from "date-fns";

export function getPickupSlots(count = 6): string[] {
  const now = new Date();
  const slots: string[] = [];
  let cursor = addHours(startOfDay(now), 10);

  if (now.getHours() >= 18) {
    cursor = addHours(startOfDay(now), 34); // tomorrow 10am
  } else if (now.getHours() >= 10) {
    cursor = addHours(now, 2);
    cursor.setMinutes(0, 0, 0);
  }

  while (slots.length < count) {
    const hour = cursor.getHours();
    if (hour >= 10 && hour < 20) {
      const end = addHours(cursor, 2);
      slots.push(
        `${format(cursor, "EEE d MMM")} · ${format(cursor, "h a")} – ${format(end, "h a")}`
      );
    }
    cursor = addHours(cursor, 2);
    if (cursor.getHours() >= 20) {
      cursor = addHours(startOfDay(cursor), 34);
    }
  }
  return slots;
}

export function generatePickupCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

import { BUSINESS_TZ } from "./config";

/**
 * Date helpers that always work in the business timezone.
 * "Day keys" are plain YYYY-MM-DD strings, which compare correctly as strings.
 */

const DAY_MS = 86_400_000;

function parts(date: Date, tz = BUSINESS_TZ) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function dayKey(input: Date | string = new Date()): string {
  const p = parts(typeof input === "string" ? new Date(input) : input);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export const todayKey = () => dayKey(new Date());

function keyToUtc(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const t = new Date(keyToUtc(key) + n * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole calendar days from `a` to `b` (positive when b is later). */
export function diffDays(a: string, b: string): number {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / DAY_MS);
}

/** Converts a wall-clock "YYYY-MM-DDTHH:mm" in the business timezone into an ISO instant. */
export function zonedLocalToIso(local: string, tz = BUSINESS_TZ): string {
  const [datePart, timePart = "00:00"] = local.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Offset of tz at that moment; re-check once to handle DST boundaries.
  const offsetAt = (t: number) => {
    const p = parts(new Date(t), tz);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - t;
  };
  let guess = asUtc - offsetAt(asUtc);
  guess = asUtc - offsetAt(guess);
  return new Date(guess).toISOString();
}

/** ISO instant → "YYYY-MM-DDTHH:mm" for <input type="datetime-local">. */
export function isoToZonedLocal(iso: string): string {
  const p = parts(new Date(iso));
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "Today", "Tomorrow", "Yesterday", "Thu", or "Oct 14". */
export function formatDayKey(key: string, today = todayKey()): string {
  const delta = diffDays(today, key);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  const date = new Date(keyToUtc(key));
  if (Math.abs(delta) < 7) {
    return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

/** formatDayKey for use mid-sentence: "due today", "due Sunday", "due Oct 20". */
export function formatDayInSentence(key: string, today = todayKey()): string {
  return formatDayKey(key, today).replace(/^(Today|Tomorrow|Yesterday)$/, (w) => w.toLowerCase());
}

export function formatDateTime(iso: string): string {
  return `${formatDayKey(dayKey(iso))}, ${formatTime(iso)}`;
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, month: "short", day: "numeric" }).format(
    new Date(iso),
  );
}

/** "just now", "2 hours ago", "yesterday", "4 days ago". */
export function timeAgo(iso: string, now = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  const days = diffDays(dayKey(iso), dayKey(now));
  if (days === 0) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** Full days since an instant (24h periods), used for staleness. */
export function daysSince(iso: string, now = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
}

export function greeting(now = new Date()): string {
  const h = parts(now).hour;
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function formatLongToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
}

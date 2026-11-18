const TZ = "Asia/Kolkata";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const rupees = (n: number) => money.format(Number(n));

export const showTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ });

export const showDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });

export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });

export const duration = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;

/** "2026-11-19" -> { weekday: "Thu", day: "19", month: "Nov" } (no timezone shifting) */
export function dayParts(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return {
    weekday: dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
    day: String(d),
    month: dt.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
  };
}

export const seatTypeName: Record<string, string> = {
  RECLINER: "Recliner",
  PRIME: "Prime",
  CLASSIC: "Classic",
};

export const certificateName: Record<string, string> = {
  U: "U — all ages",
  UA: "UA — parental guidance",
  A: "A — adults only",
};

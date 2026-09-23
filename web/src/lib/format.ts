export const LOCK_RECORD_TYPES: Record<number, string> = {
  1: "App",
  2: "Parking Lock",
  3: "Gateway",
  4: "Passcode",
  5: "Parking Lock Raise",
  6: "Parking Lock Lower",
  7: "IC Card",
  8: "Fingerprint",
  9: "Wristband",
  10: "Mechanical Key",
  11: "Bluetooth",
  12: "Gateway Unlock",
  29: "Unexpected",
  30: "Door Magnet Close",
  31: "Door Magnet Open",
  32: "Open From Inside",
  33: "Lock by Fingerprint",
  34: "Lock by Passcode",
  35: "Lock by IC Card",
  36: "Lock by Mechanical Key",
  37: "Remote Control",
  44: "Tamper Alert",
  45: "Auto Lock",
  46: "Unlock by Key",
  47: "Lock by Key",
  48: "Invalid Passcode",
};

export function formatDate(ts: number | null): string {
  if (!ts) return "-";
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}:${mi}:${ss}`;
}

export function relativeTime(ts: number | null): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function batteryLevel(level: number | null | undefined): {
  icon: string;
  color: string;
  label: string;
} {
  if (level == null) return { icon: "🔋", color: "text-muted-foreground", label: "-" };
  const label = `${level}%`;
  if (level <= 20) return { icon: "🪫", color: "text-red-500", label };
  if (level <= 50) return { icon: "🔋", color: "text-amber-500", label };
  return { icon: "🔋", color: "text-green-500", label };
}

export function rssiInfo(rssi: number | null | undefined): {
  label: string;
  color: string;
} {
  if (rssi == null) return { label: "-", color: "text-muted-foreground" };
  if (rssi > -75) return { label: `${rssi} (Strong)`, color: "text-green-600" };
  if (rssi > -85) return { label: `${rssi} (Medium)`, color: "text-amber-600" };
  return { label: `${rssi} (Weak)`, color: "text-red-600" };
}

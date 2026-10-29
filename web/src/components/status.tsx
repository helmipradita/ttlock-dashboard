import type { LucideIcon } from "lucide-react";
import { WifiOff, WifiZero, Clock } from "lucide-react";
import { relativeTime, isSignalStale, wifiIconForRssi } from "@/lib/format";

type StatusVariant = "online" | "offline" | "success" | "failed" | "warning" | "default";

const VARIANT_STYLES: Record<StatusVariant, { dot: string; bg: string; text: string; border: string }> = {
  online:  { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/30" },
  offline: { dot: "bg-red-500",     bg: "bg-red-500/10",     text: "text-red-700 dark:text-red-400",         border: "border-red-500/30" },
  success: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/30" },
  failed:  { dot: "bg-red-500",     bg: "bg-red-500/10",     text: "text-red-700 dark:text-red-400",         border: "border-red-500/30" },
  warning: { dot: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400",     border: "border-amber-500/30" },
  default: { dot: "bg-zinc-400",    bg: "bg-zinc-500/10",    text: "text-zinc-600 dark:text-zinc-400",       border: "border-border" },
};

export function StatusBadge({
  variant = "default",
  label,
  icon: Icon,
  size = "sm",
}: {
  variant?: StatusVariant;
  label: string;
  icon?: LucideIcon;
  size?: "xs" | "sm";
}) {
  const s = VARIANT_STYLES[variant];
  const sizeClasses = size === "xs"
    ? "px-1.5 py-0.5 text-xs gap-1"
    : "px-2 py-0.5 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-[4px] border ${s.border} ${s.bg} ${s.text} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} shrink-0`} />
      {Icon && <Icon className="w-2.5 h-2.5 shrink-0" />}
      <span>{label}</span>
    </span>
  );
}

export function SignalDot({
  rssi,
  rssiUpdateDate,
  gatewayIsOnline = 1,
  size = "sm",
}: {
  rssi: number | null | undefined;
  rssiUpdateDate?: number | null;
  gatewayIsOnline?: number | null;
  size?: "xs" | "sm";
}) {
  if (gatewayIsOnline === 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap"
        title="Gateway is offline: lockbox remote telemetry disconnected"
      >
        <WifiOff className={`${size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} text-red-500/80 shrink-0`} />
        <span className="text-red-600 dark:text-red-400 font-medium">GW Offline</span>
      </span>
    );
  }

  if (rssi == null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
        <WifiZero className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span>No signal</span>
      </span>
    );
  }

  // Check if signal reading is older than 15 minutes (900,000 ms)
  const isStale = isSignalStale(rssiUpdateDate);
  const timeAgo = rssiUpdateDate ? relativeTime(rssiUpdateDate) : null;

  const { Icon, color } = wifiIconForRssi(rssi);
  const label = rssi > -75 ? "Strong" : rssi > -85 ? "Medium" : "Weak";
  const iconSize = size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5";

  const tooltip = rssiUpdateDate
    ? `Signal: ${rssi} dBm (${label}) • Last scanned: ${timeAgo} (${new Date(rssiUpdateDate).toLocaleTimeString()})${isStale ? " • Stale snapshot" : ""}`
    : `Signal: ${rssi} dBm (${label})`;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-foreground tabular-nums whitespace-nowrap"
      title={tooltip}
    >
      <Icon className={`${iconSize} ${color} shrink-0`} />
      <span>{rssi} dBm</span>
      {isStale ? (
        <span
          className="inline-flex items-center text-amber-500 hover:text-amber-400 cursor-help"
          title={tooltip}
        >
          <Clock className="w-3 h-3" />
        </span>
      ) : (
        <span className="text-muted-foreground/60 text-[11px] hidden sm:inline">({label})</span>
      )}
    </span>
  );
}

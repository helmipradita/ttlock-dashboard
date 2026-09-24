import type { LucideIcon } from "lucide-react";

type StatusVariant = "online" | "offline" | "success" | "failed" | "warning" | "default";

const VARIANT_STYLES: Record<StatusVariant, { dot: string; bg: string; text: string }> = {
  online:   { dot: "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]",  bg: "bg-green-500/10",  text: "text-green-700" },
  offline:  { dot: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]",    bg: "bg-red-500/10",    text: "text-red-700" },
  success:  { dot: "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]",  bg: "bg-green-500/10",  text: "text-green-700" },
  failed:   { dot: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]",    bg: "bg-red-500/10",    text: "text-red-700" },
  warning:  { dot: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]", bg: "bg-amber-500/10",  text: "text-amber-700" },
  default:  { dot: "bg-gray-400",                                         bg: "bg-gray-400/10",   text: "text-gray-600" },
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
    ? "px-1.5 py-0.5 text-[10px] gap-1"
    : "px-2 py-0.5 text-[11px] gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${s.bg} ${s.text} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} shrink-0`} />
      {Icon && <Icon className="w-2.5 h-2.5 shrink-0" />}
      {label}
    </span>
  );
}

export function SignalDot({ rssi, size = "sm" }: { rssi: number | null; size?: "xs" | "sm" }) {
  if (rssi == null) {
    return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">— dB</span>;
  }
  const color = rssi > -75
    ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"
    : rssi > -85
      ? "bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]"
      : "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]";
  const label = rssi > -75 ? "Strong" : rssi > -85 ? "Medium" : "Weak";
  const dotSize = size === "xs" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground/80">
      <span className={`${dotSize} rounded-full ${color} shrink-0`} />
      <span>{rssi}</span>
      <span className="text-muted-foreground">dB</span>
      <span className="text-muted-foreground/60 hidden sm:inline">{label}</span>
    </span>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthStatus, saveTelemetrySnapshot } from "@/api/client";
import type { Lock, GatewayInfo } from "@/api/types";
import { formatDate } from "@/lib/format";
import { User, Cpu, FileDown, Loader2, Database, Activity, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/status";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { generateTtlockPdfReport } from "@/lib/pdf-report";
import { SignalFluctuationModal } from "@/components/SignalFluctuationModal";

export function AppHeader() {
  const [downloading, setDownloading] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotNotice, setSnapshotNotice] = useState<string | null>(null);
  const [fluctuationOpen, setFluctuationOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["auth"],
    queryFn: getAuthStatus,
  });

  async function handleDownloadPdf() {
    if (downloading) return;
    try {
      setDownloading(true);
      setDownloadNotice(null);
      const cachedLocks = queryClient.getQueryData<{ list: Lock[] }>(["locks"])?.list;
      const cachedGateways = queryClient.getQueryData<{ list: GatewayInfo[] }>(["gateways"])?.list;
      const filename = await generateTtlockPdfReport({ locks: cachedLocks, gateways: cachedGateways });
      setDownloadNotice(filename);
      setTimeout(() => setDownloadNotice(null), 6000);
    } catch (err: any) {
      alert(`Failed to generate PDF report: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  }

  async function handleSaveSnapshot() {
    if (savingSnapshot) return;
    try {
      setSavingSnapshot(true);
      setSnapshotNotice(null);
      const res = await saveTelemetrySnapshot();
      setSnapshotNotice(`Saved ${res.savedSignals} lock signals into SQLite`);
      queryClient.invalidateQueries({ queryKey: ["telemetry-fluctuations"] });
      setTimeout(() => setSnapshotNotice(null), 5000);
    } catch (err: any) {
      alert(`Failed to save snapshot: ${err.message}`);
    } finally {
      setSavingSnapshot(false);
    }
  }

  return (
    <header className="bg-card text-card-foreground border-b border-border px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-40 backdrop-blur-md bg-card/95">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-4">
        {/* Top / Left: Brand & Mobile User Identity */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-md bg-muted border border-border flex items-center justify-center text-foreground shrink-0"
              title="TTLOCK IoT Telemetry System"
            >
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-semibold leading-none tracking-tight text-foreground truncate">
                  TTLOCK Console
                </h1>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground hidden sm:inline"
                  title="Industrial telemetry dashboard for smart lockbox fleet"
                >
                  IoT Telemetry
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                Hardware Diagnostics &amp; Operations
              </p>
            </div>
          </div>

          {/* User info & ThemeToggle visible in top row on mobile/tablet */}
          <div className="flex items-center gap-2 lg:hidden shrink-0">
            {data?.authenticated ? (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-muted/30 text-xs text-foreground max-w-[160px] truncate"
                title={`Authenticated user: ${data.username}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate text-[11px]">{data.username}</span>
              </span>
            ) : (
              <StatusBadge variant="offline" label="Offline" size="xs" />
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Action Controls & Desktop User Profile */}
        <div className="flex items-center justify-between lg:justify-end gap-2 sm:gap-2.5 text-xs flex-wrap sm:flex-nowrap">
          {/* Action Buttons Group */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            {/* Save Snapshot to SQLite */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSnapshot}
              disabled={savingSnapshot}
              className="h-8 flex-1 sm:flex-none px-2.5 sm:px-3 gap-1.5 border-border bg-background hover:bg-muted font-medium text-xs text-foreground cursor-pointer shadow-none whitespace-nowrap"
              title="Capture and store current fleet signal readings into persistent SQLite database"
            >
              {savingSnapshot ? (
                <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin text-primary" />
              ) : (
                <Database className="w-3.5 h-3.5 text-foreground" />
              )}
              <span>{savingSnapshot ? "Saving..." : "Save Snapshot"}</span>
            </Button>

            {/* Signal Analytics / Fluctuation Modal */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFluctuationOpen(true)}
              className="h-8 flex-1 sm:flex-none px-2.5 sm:px-3 gap-1.5 border-border bg-background hover:bg-muted font-medium text-xs text-foreground cursor-pointer shadow-none whitespace-nowrap"
              title="Inspect historical signal fluctuations (delta RSSI) and identify volatile lockboxes"
            >
              <Activity className="w-3.5 h-3.5 text-foreground" />
              <span>Analytics</span>
            </Button>

            {/* Download Report PDF Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="h-8 flex-1 sm:flex-none px-2.5 sm:px-3 gap-1.5 border-border bg-background hover:bg-muted font-medium text-xs text-foreground cursor-pointer shadow-none whitespace-nowrap"
              title="Download hardware diagnostics PDF: offline gateways, weak signal ranking (< -85 dBm), unlinked locks, and battery alerts"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin text-primary" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-foreground" />
              )}
              <span>{downloading ? "PDF..." : "Download PDF"}</span>
            </Button>
          </div>

          {/* Desktop User Info & ThemeToggle */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-border shrink-0">
            {data?.authenticated ? (
              <>
                <StatusBadge variant="online" label="Connected" size="xs" />
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-muted/40 text-xs text-foreground"
                  title={`Authenticated user: ${data.username}`}
                >
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span className="truncate max-w-[130px] xl:max-w-none">{data.username}</span>
                </span>
                <span
                  className="text-xs text-muted-foreground hidden xl:inline"
                  title="OAuth token expiration timestamp"
                >
                  Expires <span className="tabular-nums font-medium">{formatDate(data.expiresAt)}</span>
                </span>
              </>
            ) : (
              <StatusBadge variant="offline" label="Not authenticated" size="xs" />
            )}
            <div className="pl-1 border-l border-border" title="Toggle Light / Dark mode">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {downloadNotice && (
        <div className="max-w-6xl mx-auto mt-2.5">
          <div className="px-3 py-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Report downloaded: <strong className="font-medium">{downloadNotice}</strong></span>
            </div>
            <button
              onClick={() => setDownloadNotice(null)}
              className="text-emerald-700 dark:text-emerald-400 hover:underline text-xs shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {snapshotNotice && (
        <div className="max-w-6xl mx-auto mt-2.5">
          <div className="px-3 py-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate"><strong className="font-medium">{snapshotNotice}</strong></span>
            </div>
            <button
              onClick={() => setSnapshotNotice(null)}
              className="text-emerald-700 dark:text-emerald-400 hover:underline text-xs shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <SignalFluctuationModal
        open={fluctuationOpen}
        onClose={() => setFluctuationOpen(false)}
      />
    </header>
  );
}

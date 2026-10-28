import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuthStatus } from "@/api/client";
import { formatDate } from "@/lib/format";
import { User, Cpu, FileDown, Loader2, Info } from "lucide-react";
import { StatusBadge } from "@/components/status";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { generateTtlockPdfReport } from "@/lib/pdf-report";

export function AppHeader() {
  const [downloading, setDownloading] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["auth"],
    queryFn: getAuthStatus,
    refetchInterval: 60_000,
  });

  async function handleDownloadPdf() {
    if (downloading) return;
    try {
      setDownloading(true);
      setDownloadNotice(null);
      const filename = await generateTtlockPdfReport();
      setDownloadNotice(filename);
      setTimeout(() => setDownloadNotice(null), 6000);
    } catch (err: any) {
      alert(`Failed to generate PDF report: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <header className="bg-card text-card-foreground border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-40 backdrop-blur-md bg-card/95">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-md bg-muted border border-border flex items-center justify-center text-foreground shrink-0"
            title="TTLOCK IoT Telemetry System"
          >
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-semibold leading-none tracking-tight text-foreground truncate">
                TTLOCK Console
              </h1>
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground hidden xs:inline"
                title="Industrial telemetry dashboard for ASSA lockbox fleet"
              >
                IoT Telemetry
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Hardware Diagnostics &amp; Operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap ml-auto">
          {/* Download Report PDF Button with rich tooltip */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="h-8 px-2.5 sm:px-3 gap-1.5 border-border bg-background hover:bg-muted font-medium text-xs text-foreground cursor-pointer shadow-none"
            title="Download hardware diagnostics PDF: offline gateways, weak signal ranking (< -85 dBm), unlinked locks, and battery alerts"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-foreground" />
            )}
            <span className="hidden sm:inline">
              {downloading ? "Generating PDF..." : "Download Report (PDF)"}
            </span>
            <span className="sm:hidden">
              {downloading ? "PDF..." : "Report"}
            </span>
          </Button>

          {data?.authenticated ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <StatusBadge variant="online" label="Connected" size="xs" />
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-muted/40 text-xs text-foreground"
                title={`Authenticated user: ${data.username}`}
              >
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="truncate max-w-[100px] sm:max-w-none">{data.username}</span>
              </span>
              <span
                className="text-xs text-muted-foreground hidden lg:inline"
                title="OAuth token expiration timestamp"
              >
                Expires <span className="tabular-nums font-medium">{formatDate(data.expiresAt)}</span>
              </span>
            </div>
          ) : (
            <StatusBadge variant="offline" label="Not authenticated" size="xs" />
          )}

          <div className="pl-1 border-l border-border" title="Toggle Light / Dark mode">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {downloadNotice && (
        <div className="max-w-6xl mx-auto mt-2.5">
          <div className="px-3 py-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <Info className="w-3.5 h-3.5 shrink-0" />
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
    </header>
  );
}

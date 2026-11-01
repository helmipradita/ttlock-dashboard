import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { getTelemetryFluctuations, TELEMETRY_EXPORT_CSV_URL } from "@/api/client";
import { Activity, Download, RefreshCw, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SignalFluctuationModal({ open, onClose }: Props) {
  const query = useQuery({
    queryKey: ["telemetry-fluctuations"],
    queryFn: getTelemetryFluctuations,
    enabled: open,
  });

  const list = query.data?.list ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-3xl max-h-[85vh] overflow-y-auto bg-card border border-border text-card-foreground p-5 space-y-4">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold leading-tight">
                  Signal Fluctuation & Health Analytics
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Historical signal variance from SQLite database to triage unstable lockboxes.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 mr-6">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5 border-border shadow-none"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
                title="Refresh fluctuation statistics"
              >
                <RefreshCw className={`w-3 h-3 ${query.isFetching ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
              <a
                href={TELEMETRY_EXPORT_CSV_URL}
                download
                className="inline-flex items-center h-7 px-2.5 text-xs gap-1.5 rounded-md border border-border bg-background hover:bg-muted font-medium text-foreground transition-colors"
                title="Export all raw signal snapshots to CSV"
              >
                <Download className="w-3 h-3" />
                <span>Export CSV</span>
              </a>
            </div>
          </div>
        </DialogHeader>

        {query.isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Analyzing historical signal snapshots from SQLite...</span>
          </div>
        ) : list.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg space-y-2">
            <p className="font-medium text-foreground">No historical snapshots saved yet.</p>
            <p className="max-w-md mx-auto text-muted-foreground">
              Click <strong>"Save Snapshot to DB"</strong> in the top header or activate <strong>"Live Monitor"</strong> on a gateway to record signal telemetry into SQLite.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Informative baseline notification banner */}
            <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Historical Signal Variance</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Range between lowest and highest signal readings recorded for each lockbox across capture sessions. Locks with 1 sample reflect the initial baseline reading.
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tracked Lockboxes: <strong className="text-foreground">{list.length} units</strong></span>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table containerClassName="overflow-x-auto overflow-y-visible">
                <TableHeader className="bg-muted/50 border-b border-border">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-24 text-xs font-semibold text-foreground">Lock ID</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground">Lockbox Name</TableHead>
                    <TableHead className="text-center w-20 text-xs font-semibold text-foreground">Samples</TableHead>
                    <TableHead className="text-center w-28 text-xs font-semibold text-foreground">Min / Max</TableHead>
                    <TableHead className="text-center w-24 text-xs font-semibold text-foreground">Avg Signal</TableHead>
                    <TableHead className="text-right w-36 text-xs font-semibold text-foreground">Last Recorded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((item) => {
                    const hasMultiSample = item.sample_count >= 2;
                    return (
                      <TableRow key={item.lock_id} className="hover:bg-muted/40">
                        <TableCell className="text-xs font-medium tabular-nums py-2">
                          {item.lock_id}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground py-2 truncate max-w-[160px]">
                          {item.lock_name}
                        </TableCell>
                        <TableCell className="text-center text-xs tabular-nums text-muted-foreground py-2">
                          {item.sample_count}
                        </TableCell>
                        <TableCell className="text-center text-xs tabular-nums text-muted-foreground py-2">
                          {hasMultiSample ? `${item.min_rssi} / ${item.max_rssi} dBm` : `${item.min_rssi} dBm`}
                        </TableCell>
                        <TableCell className="text-center text-xs tabular-nums font-medium py-2">
                          {item.avg_rssi} dBm
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums py-2 whitespace-nowrap">
                          {formatDate(item.last_seen)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

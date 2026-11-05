import { useState, useMemo } from "react";
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
import type { SignalFluctuation } from "@/api/types";
import { Activity, Download, RefreshCw, ShieldCheck, Search, X, Eye } from "lucide-react";
import { formatDate, relativeTime, rssiInfo } from "@/lib/format";

type SortKey =
  | "lock_id"
  | "lock_name"
  | "sample_count"
  | "avg_rssi"
  | "last_seen";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenLock?: (lockId: number) => void;
}

interface SortHeaderProps {
  field: SortKey;
  children: React.ReactNode;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  onToggle: (field: SortKey) => void;
  className?: string;
}

function SortHeader({
  field,
  children,
  sortKey,
  sortDir,
  onToggle,
  className = "",
}: SortHeaderProps) {
  const isActive = sortKey === field;
  return (
    <TableHead
      className={`cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap ${className}`}
      onClick={() => onToggle(field)}
      title={`Sort by ${String(children)}`}
    >
      <span className="inline-flex items-center gap-1">
        <span>{children}</span>
        {isActive && (
          <span className="text-foreground text-xs font-bold">
            {sortDir === "asc" ? "↑" : "↓"}
          </span>
        )}
      </span>
    </TableHead>
  );
}

const EMPTY_LIST: SignalFluctuation[] = [];

export function SignalFluctuationModal({ open, onClose, onOpenLock }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>("avg_rssi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const query = useQuery({
    queryKey: ["telemetry-fluctuations"],
    queryFn: getTelemetryFluctuations,
    enabled: open,
  });

  const list = query.data?.list ?? EMPTY_LIST;

  function toggleSort(field: SortKey) {
    if (sortKey === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(field);
      // String columns default to asc, numeric metrics default to asc (weakest first) or desc
      setSortDir(field === "lock_name" || field === "avg_rssi" ? "asc" : "desc");
    }
  }

  const filteredAndSorted = useMemo(() => {
    let result = list;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (item) =>
          String(item.lock_id).includes(q) ||
          item.lock_name.toLowerCase().includes(q)
      );
    }

    if (!sortKey) return result;

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "lock_name") {
        cmp = a.lock_name.localeCompare(b.lock_name);
      } else {
        cmp = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [list, search, sortKey, sortDir]);

  function handleRowClick(lockId: number) {
    if (onOpenLock) {
      onClose();
      onOpenLock(lockId);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-4xl max-h-[88vh] overflow-y-auto bg-card border border-border text-card-foreground p-3.5 sm:p-5 space-y-4">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8 sm:pr-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-semibold leading-tight truncate">
                  Signal Fluctuation &amp; Health Analytics
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Historical signal variance from SQLite database to triage unstable lockboxes.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:mr-6 self-start sm:self-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5 border-border shadow-none cursor-pointer"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
                title="Refresh fluctuation statistics"
              >
                <RefreshCw className={`w-3 h-3 ${query.isFetching ? "motion-safe:animate-spin" : ""}`} />
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
            <RefreshCw className="w-4 h-4 motion-safe:animate-spin" />
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
                Aggregated average signals across capture sessions from SQLite database. Click any row to inspect historical records.
              </p>
            </div>

            {/* Quick Filter & Count Bar matching Lockboxes style */}
            <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
              <span className="text-muted-foreground">
                Showing <strong className="text-foreground tabular-nums">{filteredAndSorted.length}</strong> of{" "}
                <strong className="text-foreground tabular-nums">{list.length}</strong> units
              </span>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by ID or name..."
                  className="w-full h-7 pl-8 pr-7 text-xs bg-muted/30 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title="Clear filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Fully responsive table fitting 100% on mobile without horizontal scroll */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table className="w-full">
                <TableHeader className="bg-muted/50 border-b border-border">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <SortHeader field="lock_id" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="w-24 hidden sm:table-cell">
                      Lock ID
                    </SortHeader>
                    <SortHeader field="lock_name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>
                      Lockbox Name
                    </SortHeader>
                    <SortHeader field="sample_count" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="text-center w-20 hidden md:table-cell">
                      Samples
                    </SortHeader>
                    <SortHeader field="avg_rssi" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="text-right sm:text-center w-24">
                      Avg Signal
                    </SortHeader>
                    <SortHeader field="last_seen" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="text-right w-24 sm:w-36">
                      Recorded
                    </SortHeader>
                    {onOpenLock && (
                      <TableHead className="w-16 text-right text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                        Action
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSorted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                        No lockboxes match "{search}"
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSorted.map((item: SignalFluctuation) => {
                      const signal = rssiInfo(item.avg_rssi);

                      return (
                        <TableRow
                          key={item.lock_id}
                          className={`transition-colors border-b border-border/60 ${
                            onOpenLock ? "hover:bg-muted/30 cursor-pointer" : "hover:bg-muted/20"
                          }`}
                          onClick={() => handleRowClick(item.lock_id)}
                          title={onOpenLock ? `Click to inspect Lockbox #${item.lock_id}` : undefined}
                        >
                          <TableCell className="text-xs font-medium tabular-nums py-2.5 whitespace-nowrap hidden sm:table-cell">
                            {item.lock_id}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-foreground py-2.5 min-w-0">
                            <span className="block truncate max-w-[150px] sm:max-w-[240px]" title={item.lock_name || undefined}>
                              {item.lock_name}
                            </span>
                            <span className="block sm:hidden text-[10px] text-muted-foreground/80 tabular-nums font-normal mt-0.5">
                              #{item.lock_id} &bull; {item.sample_count} samples
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs tabular-nums text-muted-foreground py-2.5 whitespace-nowrap hidden md:table-cell">
                            {item.sample_count}
                          </TableCell>
                          <TableCell className="text-right sm:text-center text-xs tabular-nums py-2.5 whitespace-nowrap font-medium">
                            <span className={signal.color}>
                              {item.avg_rssi} dBm
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground tabular-nums py-2.5 whitespace-nowrap">
                            <span className="hidden sm:inline">
                              {formatDate(item.last_seen)}
                            </span>
                            <span className="inline sm:hidden">
                              {relativeTime(item.last_seen)}
                            </span>
                          </TableCell>
                          {onOpenLock && (
                            <TableCell className="text-right py-2.5 whitespace-nowrap hidden sm:table-cell">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(item.lock_id);
                                }}
                                title="Inspect lock details"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect</span>
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

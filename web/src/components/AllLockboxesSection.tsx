import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEnrichedLocks } from "@/api/client";
import type { Lock } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useCountdown } from "@/hooks/useCountdown";
import { relativeTime, batteryLevel } from "@/lib/format";
import { UnlockTerminal } from "@/components/UnlockTerminal";
import {
  Lock as LockIcon,
  Pause,
  Play,
  RefreshCw,
  ChevronRight,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  BatteryWarning,
  AlertTriangle,
  Radio,
  Search,
  X,
} from "lucide-react";
import { StatusBadge, SignalDot } from "@/components/status";

type SortKey =
  | "lockId"
  | "lockName"
  | "lockAlias"
  | "lastOpen"
  | "electricQuantity"
  | "hasGateway"
  | "rssi"
  | "gatewayName";

type TriageFilter =
  | "all"
  | "attention"
  | "weak-signal"
  | "no-gateway"
  | "low-battery"
  | "with-gateway";

interface Props {
  onLockSelect: (lockId: number) => void;
  selectedLockId?: number | null;
}

function BatteryIcon({ level }: { level: number | null | undefined }) {
  if (level == null) return <BatteryWarning className="w-3.5 h-3.5 text-muted-foreground" />;
  if (level <= 20) return <BatteryLow className="w-3.5 h-3.5 text-red-500" />;
  if (level <= 50) return <BatteryMedium className="w-3.5 h-3.5 text-amber-500" />;
  return <BatteryFull className="w-3.5 h-3.5 text-emerald-500" />;
}

export function AllLockboxesSection({ onLockSelect, selectedLockId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [paused, setPaused] = useState(true);
  const [filter, setFilter] = useState<TriageFilter>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [unlockTarget, setUnlockTarget] = useState<{ id: number; name: string } | null>(null);

  const query = useQuery({
    queryKey: ["locks"],
    queryFn: getEnrichedLocks,
    refetchInterval: paused ? false : 300_000,
  });

  // Automatically keep auto-refresh paused once initial data loads to conserve TTLock API quotas
  useEffect(() => {
    if (query.data) {
      setPaused(true);
    }
  }, [query.data]);

  const countdown = useCountdown(
    300,
    useCallback(() => {
      query.refetch();
    }, [query]),
    !paused
  );

  const rawList = query.data?.list ?? [];

  const counts = useMemo(() => {
    const unlinked = rawList.filter((l) => l.hasGateway === 0).length;
    const lowBat = rawList.filter(
      (l) => l.electricQuantity != null && l.electricQuantity <= 20
    ).length;
    const weakSignal = rawList.filter(
      (l) => l.rssi != null && l.rssi <= -85
    ).length;
    const attention = rawList.filter(
      (l) =>
        l.hasGateway === 0 ||
        (l.electricQuantity != null && l.electricQuantity <= 20) ||
        (l.rssi != null && l.rssi <= -85)
    ).length;
    const withGw = rawList.filter((l) => l.hasGateway === 1).length;

    return { total: rawList.length, attention, weakSignal, unlinked, lowBat, withGw };
  }, [rawList]);

  const filtered = useMemo(() => {
    let list = rawList;
    switch (filter) {
      case "attention":
        list = rawList.filter(
          (l) =>
            l.hasGateway === 0 ||
            (l.electricQuantity != null && l.electricQuantity <= 20) ||
            (l.rssi != null && l.rssi <= -85)
        );
        break;
      case "weak-signal":
        list = rawList.filter((l) => l.rssi != null && l.rssi <= -85);
        break;
      case "no-gateway":
        list = rawList.filter((l) => l.hasGateway === 0);
        break;
      case "low-battery":
        list = rawList.filter(
          (l) => l.electricQuantity != null && l.electricQuantity <= 20
        );
        break;
      case "with-gateway":
        list = rawList.filter((l) => l.hasGateway === 1);
        break;
      default:
        list = rawList;
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      return list.filter(
        (l) =>
          String(l.lockId).includes(q) ||
          (l.lockName && l.lockName.toLowerCase().includes(q)) ||
          (l.lockAlias && l.lockAlias.toLowerCase().includes(q)) ||
          (l.lockMac && l.lockMac.toLowerCase().includes(q))
      );
    }

    return list;
  }, [rawList, filter, searchFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (!sortKey) {
      copy.sort((a, b) => {
        const g = (b.hasGateway ?? 0) - (a.hasGateway ?? 0);
        if (g !== 0) return g;
        return (b.lastOpen ?? 0) - (a.lastOpen ?? 0);
      });
      return copy;
    }
    copy.sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      switch (sortKey) {
        case "lockId":
        case "lastOpen":
        case "electricQuantity":
        case "hasGateway":
          va = (a[sortKey] as number) ?? 0;
          vb = (b[sortKey] as number) ?? 0;
          return sortDir === "asc" ? va - vb : vb - va;
        case "rssi":
          va = a.rssi ?? -999;
          vb = b.rssi ?? -999;
          return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
        case "gatewayName":
          va = (a.gatewayName ?? "").toLowerCase();
          vb = (b.gatewayName ?? "").toLowerCase();
          break;
        case "lockName":
          va = (a.lockName ?? "").toLowerCase();
          vb = (b.lockName ?? "").toLowerCase();
          break;
        case "lockAlias":
          va = (a.lockAlias ?? "").toLowerCase();
          vb = (b.lockAlias ?? "").toLowerCase();
          break;
        default:
          return 0;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortHeader({ field, children }: { field: SortKey; children: React.ReactNode }) {
    const isActive = sortKey === field;
    return (
      <TableHead
        className="w-auto whitespace-nowrap cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => toggleSort(field)}
        title={`Sort by ${String(children)}`}
      >
        <span className="inline-flex items-center gap-1">
          <span>{children}</span>
          {isActive ? (
            <span className="text-foreground text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
          ) : sortKey === null && (field === "hasGateway" || field === "lastOpen") ? (
            <span className="text-muted-foreground/40 text-xs">{field === "hasGateway" ? "↑" : "↓"}</span>
          ) : null}
        </span>
      </TableHead>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      {/* Console Section Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold tracking-tight">Lockbox Ledger</h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                ({sorted.length} / {counts.total} units)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live registry of deployed lockboxes, battery health, and gateway link states.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5 border-border shadow-none"
              onClick={() => setPaused((p) => !p)}
              title={paused ? "Resume automated polling timer" : "Pause polling timer to prevent data refresh while inspecting"}
            >
              {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              <span>{paused ? "Resume" : "Pause"}</span>
            </Button>
            <span
              className="text-muted-foreground text-xs tabular-nums hidden sm:inline"
              title="Time until next automated data sync from TTLOCK Open Platform"
            >
              {paused ? "Paused (quota safe)" : `Sync ${countdown.display}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5 border-border shadow-none"
              onClick={() => {
                setPaused(false);
                countdown.reset();
                query.refetch();
              }}
              title="Force immediate data refetch from TTLOCK server"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Quick Triage Filter Chips with descriptive tooltips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-muted-foreground mr-1">Filter:</span>
          <button
            onClick={() => setFilter("all")}
            title="Display all lockboxes without filter"
            className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-foreground text-background border-foreground font-medium"
                : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            All ({counts.total})
          </button>
          <button
            onClick={() => setFilter("attention")}
            title="One-click triage: filters lockboxes with no gateway, weak signal (<= -85 dBm), or low battery (<= 20%)"
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              filter === "attention"
                ? "bg-amber-600 text-white border-amber-600 font-medium"
                : "bg-muted/40 text-muted-foreground border-border hover:text-amber-600 dark:hover:text-amber-400"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Needs Attention ({counts.attention})</span>
          </button>
          <button
            onClick={() => setFilter("weak-signal")}
            title="Lockboxes with weak signal (<= -85 dBm) requiring gateway antenna adjustment or repositioning"
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              filter === "weak-signal"
                ? "bg-amber-600 text-white border-amber-600 font-medium"
                : "bg-muted/40 text-muted-foreground border-border hover:text-amber-600 dark:hover:text-amber-400"
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Weak Signal ({counts.weakSignal})</span>
          </button>
          <button
            onClick={() => setFilter("no-gateway")}
            title="Lockboxes not linked to any active WiFi gateway"
            className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              filter === "no-gateway"
                ? "bg-red-600 text-white border-red-600 font-medium"
                : "bg-muted/40 text-muted-foreground border-border hover:text-red-600 dark:hover:text-red-400"
            }`}
          >
            No Gateway ({counts.unlinked})
          </button>
          <button
            onClick={() => setFilter("low-battery")}
            title="Lockboxes with critical battery level (<= 20%) requiring battery swap"
            className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              filter === "low-battery"
                ? "bg-red-600 text-white border-red-600 font-medium"
                : "bg-muted/40 text-muted-foreground border-border hover:text-red-600 dark:hover:text-red-400"
            }`}
          >
            Battery &le; 20% ({counts.lowBat})
          </button>
          <button
            onClick={() => setFilter("with-gateway")}
            title="Lockboxes connected via active WiFi gateway"
            className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              filter === "with-gateway"
                ? "bg-foreground text-background border-foreground font-medium"
                : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            Connected ({counts.withGw})
          </button>

          {/* Quick Inline Filter Input */}
          <div className="relative ml-auto w-full sm:w-56 mt-2 sm:mt-0">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter ledger rows..."
              className="w-full h-7 pl-8 pr-7 text-xs bg-muted/30 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Table Wrapper */}
      <div>
        {query.isError && (
          <p className="px-5 py-3 text-xs text-red-500 bg-red-500/10 border-b border-red-500/20">
            Error: {(query.error as Error).message}
          </p>
        )}

        <Table containerClassName="overflow-visible">
          <TableHeader className="sticky top-[57px] z-20 bg-card shadow-[0_1px_0_0_var(--border)]">
            <TableRow className="bg-muted/40 border-b border-border">
              <TableHead className="w-6 bg-card" />
              <SortHeader field="lockId">Lock ID</SortHeader>
              <SortHeader field="lockName">Name</SortHeader>
              <SortHeader field="lockAlias">Alias</SortHeader>
              <SortHeader field="lastOpen">Last Open</SortHeader>
              <SortHeader field="electricQuantity">Battery</SortHeader>
              <SortHeader field="rssi">Signal</SortHeader>
              <SortHeader field="gatewayName">Gateway / WiFi</SortHeader>
              <SortHeader field="hasGateway">Status</SortHeader>
              <TableHead className="w-24 text-right text-xs font-medium text-muted-foreground bg-card">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((lock: Lock) => {
              const bat = batteryLevel(lock.electricQuantity);
              const isSelected = selectedLockId === lock.lockId;
              return (
                <TableRow
                  key={lock.lockId}
                  data-state={isSelected ? "selected" : undefined}
                  className={`cursor-pointer transition-colors border-b border-border/60 ${
                    isSelected ? "bg-muted/60" : "hover:bg-muted/30"
                  }`}
                  onClick={() => onLockSelect(lock.lockId)}
                  title="Click to view details and unlock history above"
                >
                  <TableCell className="w-6 px-2">
                    {isSelected && <ChevronRight className="w-3.5 h-3.5 text-foreground" />}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground w-28 tabular-nums">
                    {lock.lockId}
                  </TableCell>
                  <TableCell className="text-xs truncate max-w-[180px] font-medium text-foreground">
                    {lock.lockName || "None"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[160px]">
                    {lock.lockAlias || "None"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-xs w-32 tabular-nums">
                    {relativeTime(lock.lastOpen)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap w-24">
                    <span className="inline-flex items-center gap-1.5 text-xs tabular-nums">
                      <BatteryIcon level={lock.electricQuantity} />
                      <span className={bat.color}>{bat.label}</span>
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap w-28">
                    {lock.hasGateway === 1 ? (
                      <SignalDot
                        rssi={lock.rssi ?? null}
                        rssiUpdateDate={lock.rssiUpdateDate}
                        gatewayIsOnline={lock.gatewayIsOnline}
                        size="xs"
                      />
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">Unlinked</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs truncate max-w-[170px]">
                    {lock.hasGateway === 1 ? (
                      <div
                        className="flex flex-col min-w-0"
                        title={`${lock.gatewayName || `GW #${lock.gatewayId || ""}`}${lock.networkName ? ` (${lock.networkName})` : ""}`}
                      >
                        <span className="truncate font-medium text-foreground">
                          {lock.gatewayName || (lock.gatewayId ? `GW-${lock.gatewayId}` : "Linked GW")}
                        </span>
                        {lock.networkName && (
                          <span className="truncate text-[11px] text-muted-foreground">
                            {lock.networkName}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap w-20">
                    {lock.hasGateway === 1 ? (
                      lock.gatewayIsOnline === 0 ? (
                        <StatusBadge variant="failed" label="GW Down" size="xs" />
                      ) : (
                        <StatusBadge variant="online" label="Linked" size="xs" />
                      )
                    ) : (
                      <StatusBadge variant="offline" label="Unlinked" size="xs" />
                    )}
                  </TableCell>
                  <TableCell className="w-24 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1 border-border shadow-none"
                      title="Open remote unlock dialog"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUnlockTarget({
                          id: lock.lockId,
                          name: lock.lockAlias || lock.lockName || String(lock.lockId),
                        });
                      }}
                    >
                      <LockIcon className="w-3 h-3" />
                      <span>Unlock</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {query.isFetching && (
          <div className="px-5 space-y-2 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded" />
            ))}
          </div>
        )}

        {!query.isFetching && sorted.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 py-10 text-muted-foreground">
            <p className="text-xs">No lockboxes found matching the selected filter.</p>
          </div>
        )}
      </div>

      {unlockTarget && (
        <UnlockTerminal
          lockId={unlockTarget.id}
          lockName={unlockTarget.name}
          open={!!unlockTarget}
          onClose={() => setUnlockTarget(null)}
        />
      )}
    </div>
  );
}

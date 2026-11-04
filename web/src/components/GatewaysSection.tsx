import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGateways, getGatewayLive } from "@/api/client";
import type { GatewayInfo, GatewayLock } from "@/api/types";
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
import {
  ChevronRight,
  ChevronDown,
  Network,
  Eye,
  Unplug,
  RefreshCw,
  Radio,
  Square,
  Lock as LockIcon,
} from "lucide-react";
import { StatusBadge, SignalDot } from "@/components/status";
import { wifiIconForOnline, formatDate, relativeTime, isSignalStale } from "@/lib/format";
import { InlineTopology } from "@/components/InlineTopology";
import { UnlockTerminal } from "@/components/UnlockTerminal";

type SortKey = "gatewayId" | "gatewayName" | "gatewayMac" | "networkName" | "lockNum" | "isOnline";

interface Props {
  onOpenLock: (lockId: number) => void;
  gatewaySelect?: { id: number; n: number } | null;
}

interface SortHeaderProps {
  field: SortKey;
  children: React.ReactNode;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  onToggle: (key: SortKey) => void;
}

function GatewaySortHeader({ field, children, sortKey, sortDir, onToggle }: SortHeaderProps) {
  const isActive = sortKey === field;
  return (
    <TableHead
      className="whitespace-nowrap cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => onToggle(field)}
      title={`Sort by ${String(children)}`}
    >
      <span className="inline-flex items-center gap-1">
        <span>{children}</span>
        {isActive && (
          <span className="text-foreground text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
        )}
      </span>
    </TableHead>
  );
}

function normalizeGatewayNameForSort(name: string | null | undefined): string {
  return (name || "")
    .replace(/^G2[\s-_]*SCL[\s-_]*(\d+)/i, (_, num) => `G2-SCL-${num.padStart(3, "0")}`)
    .replace(/^GT[\s-_]*SCL[\s-_]*(\d+)/i, (_, num) => `GT-SCL-${num.padStart(3, "0")}`)
    .trim();
}

export function GatewaysSection({ onOpenLock, gatewaySelect }: Props) {
  const queryClient = useQueryClient();
  const [prevGatewaySelect, setPrevGatewaySelect] = useState<{ id: number; n: number } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("isOnline");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showTopologyFor, setShowTopologyFor] = useState<number | null>(null);
  const [liveMonitoringId, setLiveMonitoringId] = useState<number | null>(null);
  const [liveLocks, setLiveLocks] = useState<Record<number, GatewayLock[]>>({});
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [secondsUntilNext, setSecondsUntilNext] = useState<number>(60);
  const [isLiveFetching, setIsLiveFetching] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [unlockTarget, setUnlockTarget] = useState<{ id: number; name: string } | null>(null);

  if (gatewaySelect && gatewaySelect !== prevGatewaySelect) {
    setPrevGatewaySelect(gatewaySelect);
    setExpandedId(gatewaySelect.id);
  }

  useEffect(() => {
    if (gatewaySelect?.id) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`gateway-row-${gatewaySelect.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [gatewaySelect]);

  const query = useQuery({
    queryKey: ["gateways"],
    queryFn: getGateways,
  });

  const locksQuery = useQuery({
    queryKey: ["topology", expandedId],
    queryFn: async () => {
      const res = await fetch(`/api/gateways/${expandedId}/topology`);
      if (!res.ok) throw new Error("Failed to load gateway topology");
      return res.json() as Promise<{ gateway: any; locks: GatewayLock[] }>;
    },
    enabled: expandedId !== null,
  });

  function toggleLiveMonitoring(gatewayId: number) {
    if (liveMonitoringId === gatewayId) {
      setLiveMonitoringId(null);
      setLastSyncTime(null);
      setIsLiveFetching(false);
      setLiveError(null);
      setSecondsUntilNext(60);
    } else {
      setLiveMonitoringId(gatewayId);
      setLastSyncTime(null);
      setIsLiveFetching(false);
      setLiveError(null);
      setSecondsUntilNext(60);
    }
  }

  useEffect(() => {
    if (!liveMonitoringId) return;

    let isCancelled = false;
    const targetGateway = query.data?.list?.find((g) => g.gatewayId === liveMonitoringId);
    const targetName = targetGateway?.networkName || targetGateway?.gatewayName;

    async function poll() {
      setIsLiveFetching(true);
      setLiveError(null);
      try {
        const res = await getGatewayLive(liveMonitoringId!, targetName);
        if (!isCancelled) {
          if (res.locks) {
            setLiveLocks((prev) => ({ ...prev, [liveMonitoringId!]: res.locks }));
            // Keep base topology query cache synchronized with fresh live data
            queryClient.setQueryData(["topology", liveMonitoringId!], (old: any) => {
              if (!old) return { gateway: targetGateway, locks: res.locks };
              return { ...old, locks: res.locks };
            });
          }
          setLastSyncTime(res.timestamp || Date.now());
          setSecondsUntilNext(60);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setLiveError(err.message || "Failed to fetch live signals");
          setSecondsUntilNext(60);
        }
      } finally {
        if (!isCancelled) {
          setIsLiveFetching(false);
        }
      }
    }

    // Initial immediate poll
    poll();

    // 1-second countdown interval ticker
    const ticker = setInterval(() => {
      setSecondsUntilNext((sec) => {
        if (sec <= 1) {
          poll();
          return 60;
        }
        return sec - 1;
      });
    }, 1000);

    return () => {
      isCancelled = true;
      clearInterval(ticker);
    };
  }, [liveMonitoringId, query.data, queryClient]);

  const sorted = useMemo(() => {
    const list = query.data?.list ?? [];
    const copy = [...list];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "gatewayName") {
        const va = normalizeGatewayNameForSort(a.gatewayName);
        const vb = normalizeGatewayNameForSort(b.gatewayName);
        cmp = sortDir === "asc"
          ? va.localeCompare(vb, undefined, { numeric: true, sensitivity: "base" })
          : vb.localeCompare(va, undefined, { numeric: true, sensitivity: "base" });
      } else if (sortKey === "networkName" || sortKey === "gatewayMac") {
        const va = (a[sortKey] ?? "") as string;
        const vb = (b[sortKey] ?? "") as string;
        cmp = sortDir === "asc"
          ? va.localeCompare(vb, undefined, { numeric: true, sensitivity: "base" })
          : vb.localeCompare(va, undefined, { numeric: true, sensitivity: "base" });
      } else {
        const va = Number(a[sortKey] ?? 0);
        const vb = Number(b[sortKey] ?? 0);
        cmp = sortDir === "asc" ? va - vb : vb - va;
      }
      if (cmp !== 0) return cmp;
      return a.gatewayId - b.gatewayId;
    });
    return copy;
  }, [query.data, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Gateway Directory</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              ({sorted.length} units)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Network stations bridging WiFi for remote lockbox management.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="h-7 px-2.5 text-xs gap-1.5 border-border shadow-none"
          title="Refresh gateway list"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </Button>
      </div>

      <div>
        {query.isError && (
          <p className="px-5 py-3 text-xs text-red-500 bg-red-500/10 border-b border-red-500/20">
            Error: {(query.error as Error).message}
          </p>
        )}

        <Table containerClassName="overflow-x-auto rounded-lg border border-border" className="min-w-[780px]">
          <TableHeader className="bg-muted/50 border-b border-border">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="w-8" />
              <GatewaySortHeader field="gatewayId" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Gateway ID</GatewaySortHeader>
              <GatewaySortHeader field="gatewayName" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Gateway Name</GatewaySortHeader>
              <GatewaySortHeader field="gatewayMac" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>MAC</GatewaySortHeader>
              <GatewaySortHeader field="networkName" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>WiFi Network</GatewaySortHeader>
              <GatewaySortHeader field="lockNum" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Locks</GatewaySortHeader>
              <GatewaySortHeader field="isOnline" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Status</GatewaySortHeader>
              <TableHead className="w-28 text-right text-xs font-medium text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((gw: GatewayInfo) => {
              const isExpanded = expandedId === gw.gatewayId;
              const isTopologyVisible = showTopologyFor === gw.gatewayId;
              const isTargeted = gatewaySelect?.id === gw.gatewayId;
              return (
                <Fragment key={gw.gatewayId}>
                  <TableRow
                    id={`gateway-row-${gw.gatewayId}`}
                    data-state={isExpanded ? "expanded" : undefined}
                    className={`cursor-pointer transition-colors border-b border-border/60 ${
                      isExpanded ? "bg-muted/50" : "hover:bg-muted/30"
                    } ${isTargeted ? "ring-1 ring-primary/60 bg-primary/5" : ""}`}
                    onClick={() => {
                      setExpandedId((prev) => {
                        const next = prev === gw.gatewayId ? null : gw.gatewayId;
                        if (next !== gw.gatewayId && liveMonitoringId === gw.gatewayId) {
                          setLiveMonitoringId(null);
                        }
                        return next;
                      });
                      if (expandedId === gw.gatewayId) {
                        setShowTopologyFor((prev) => (prev === gw.gatewayId ? null : prev));
                      }
                    }}
                    title="Click row to expand connected lockboxes"
                  >
                    <TableCell className="w-8 px-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground w-32 tabular-nums">
                      {gw.gatewayId}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground truncate max-w-[160px]">
                      {gw.gatewayName || "None"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground w-36">
                      {gw.gatewayMac || "None"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {gw.networkName ? (
                        <span className="inline-flex items-center gap-1.5">
                          {(() => {
                            const w = wifiIconForOnline(gw.isOnline);
                            return <w.Icon className={`w-3.5 h-3.5 ${w.color} shrink-0`} />;
                          })()}
                          <span>{gw.networkName}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="w-20">
                      <span
                        className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-xs font-medium bg-muted rounded border border-border text-foreground tabular-nums"
                        title={`${gw.lockNum ?? 0} lockboxes associated`}
                      >
                        {gw.lockNum ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="w-28">
                      {gw.isOnline === 1 ? (
                        <StatusBadge variant="online" label="Online" size="xs" />
                      ) : gw.isOnline === 0 ? (
                        <StatusBadge variant="offline" label="Offline" size="xs" />
                      ) : (
                        <StatusBadge label="Unknown" size="xs" />
                      )}
                    </TableCell>
                    <TableCell className="w-28 text-right">
                      <Button
                        variant={isTopologyVisible ? "secondary" : "outline"}
                        size="sm"
                        className="h-6 px-2 text-xs gap-1 border-border shadow-none"
                        title="Open interactive network topology diagram"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isTopologyVisible) {
                            setShowTopologyFor(null);
                          } else {
                            setExpandedId(gw.gatewayId);
                            setShowTopologyFor(gw.gatewayId);
                          }
                        }}
                      >
                        <Network className="w-3 h-3" />
                        <span>Topology</span>
                      </Button>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (() => {
                    const isLive = liveMonitoringId === gw.gatewayId;
                    const currentLocks = liveLocks[gw.gatewayId] || locksQuery.data?.locks || [];

                    return (
                      <>
                        <TableRow key={`${gw.gatewayId}-expanded`} className="hover:bg-muted/40 bg-muted/20">
                          <TableCell colSpan={8} className="p-0">
                            <div className="px-4 sm:px-5 py-3 border-b border-border/40">
                              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-medium text-foreground">
                                    Connected Lockboxes ({currentLocks.length} units)
                                  </h4>
                                  {isLive && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                                        <span>Next poll: <strong className="tabular-nums font-semibold">{secondsUntilNext}s</strong></span>
                                        {isLiveFetching && <RefreshCw className="w-2.5 h-2.5 motion-safe:animate-spin shrink-0 ml-0.5" />}
                                      </span>
                                      {lastSyncTime && (
                                        <span className="text-[11px] text-muted-foreground tabular-nums">
                                          Last hit: {formatDate(lastSyncTime).split(", ")[1] || "Just now"}
                                        </span>
                                      )}
                                      {liveError && (
                                        <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                                          ({liveError})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <Button
                                  variant={isLive ? "destructive" : "outline"}
                                  size="sm"
                                  className="h-6 px-2 text-xs gap-1.5 shadow-none"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLiveMonitoring(gw.gatewayId);
                                  }}
                                  title="Poll this specific gateway every 60 seconds for real-time signal shifts (auto-saves to DB with deduplication)"
                                >
                                  {isLive ? <Square className="w-3 h-3" /> : <Radio className="w-3 h-3 text-primary" />}
                                  <span>{isLive ? "Stop Live" : "Start Live (60s)"}</span>
                                </Button>
                              </div>

                              {locksQuery.isLoading && !isLive && (
                                <div className="space-y-1.5 py-1">
                                  {Array.from({ length: Math.min(gw.lockNum || 3, 4) }).map((_, i) => (
                                    <Skeleton key={i} className="h-8 w-full rounded" />
                                  ))}
                                </div>
                              )}

                              {locksQuery.isError && !isLive && (
                                <p className="text-xs text-red-500 py-1">Failed to load connected lockboxes</p>
                              )}

                              {currentLocks.length === 0 && !locksQuery.isLoading && (
                                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                  <Unplug className="w-3.5 h-3.5" />
                                  <span>No lockboxes currently connected to this gateway</span>
                                </div>
                              )}

                              {isTopologyVisible && (
                                <div className="mt-3">
                                  <InlineTopology
                                    gatewayId={gw.gatewayId}
                                    gatewayName={gw.networkName || String(gw.gatewayId)}
                                    lockNum={gw.lockNum ?? 0}
                                    onClose={() => setShowTopologyFor(null)}
                                  />
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {currentLocks.map((lock: GatewayLock) => {
                          const scanTs = lock.rssiUpdateDate ?? lock.updateDate;
                          const isStale = isSignalStale(scanTs);

                          return (
                            <TableRow
                              key={lock.lockId}
                              className="hover:bg-muted/40 cursor-pointer bg-muted/10 border-b border-border/40"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenLock(lock.lockId);
                              }}
                              title="Click to view lockbox history"
                            >
                              <TableCell colSpan={8} className="py-2.5 px-4 sm:px-5">
                                <div className="flex items-center gap-4 sm:gap-6 ml-2 sm:ml-4 text-xs flex-wrap sm:flex-nowrap">
                                  <span className="text-xs font-semibold text-foreground w-20 shrink-0 tabular-nums">
                                    {lock.lockId}
                                  </span>
                                  <span className="truncate max-w-[180px] font-medium text-foreground">
                                    {lock.lockAlias || lock.lockName || "None"}
                                  </span>

                                  <div className="w-32 shrink-0">
                                    <SignalDot
                                      rssi={lock.rssi}
                                      rssiUpdateDate={scanTs}
                                      gatewayIsOnline={gw.isOnline}
                                      size="xs"
                                    />
                                  </div>

                                  {/* Real-time Scan Age & Status Indicator */}
                                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap min-w-0">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        !scanTs
                                          ? "bg-zinc-400"
                                          : isStale
                                            ? "bg-amber-500"
                                            : "bg-emerald-500"
                                      }`}
                                    />
                                    <span>
                                      Scanned:{" "}
                                      <strong className="text-foreground font-normal">
                                        {scanTs ? relativeTime(scanTs) : "Never"}
                                      </strong>
                                      {scanTs && (
                                        <span className="text-muted-foreground/60 ml-1 hidden md:inline tabular-nums">
                                          ({new Date(scanTs).toLocaleTimeString()})
                                        </span>
                                      )}
                                    </span>
                                  </div>

                                  {/* Last Open Timestamp */}
                                  <div className="text-[11px] text-muted-foreground whitespace-nowrap min-w-0 inline-flex items-center gap-1">
                                    <span>Last Open: </span>
                                    <strong className="text-foreground font-normal tabular-nums">
                                      {lock.lastOpen ? (
                                        <>
                                          {relativeTime(lock.lastOpen)}{" "}
                                          <span className="text-muted-foreground/60 hidden sm:inline">
                                            ({new Date(lock.lastOpen).toLocaleTimeString()})
                                          </span>
                                        </>
                                      ) : (
                                        "—"
                                      )}
                                    </strong>
                                  </div>

                                  <div className="ml-auto shrink-0 flex items-center gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={gw.isOnline === 0}
                                      className="h-6 px-2 text-xs gap-1 border-border shadow-none text-foreground"
                                      title={
                                        gw.isOnline === 0
                                          ? "Gateway offline: remote unlock unavailable"
                                          : "Send instant remote unlock command over this gateway"
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setUnlockTarget({
                                          id: lock.lockId,
                                          name: lock.lockAlias || lock.lockName || String(lock.lockId),
                                        });
                                      }}
                                    >
                                      <LockIcon className="w-3 h-3 text-primary" />
                                      <span>Unlock</span>
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                      title="Inspect lock details"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenLock(lock.lockId);
                                      }}
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Inspect</span>
                                    </Button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </>
                    );
                  })()}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>

        {query.isFetching && (
          <div className="px-5 space-y-2 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded" />
            ))}
          </div>
        )}

        {!query.isFetching && sorted.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 py-10 text-muted-foreground">
            <p className="text-xs">No gateways registered.</p>
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

import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGateways } from "@/api/client";
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
} from "lucide-react";
import { StatusBadge, SignalDot, wifiIconForOnline } from "@/components/status";
import { InlineTopology } from "@/components/InlineTopology";

type SortKey = "gatewayId" | "gatewayName" | "gatewayMac" | "networkName" | "lockNum" | "isOnline";

interface Props {
  onOpenLock: (lockId: number) => void;
}

export function GatewaysSection({ onOpenLock }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("isOnline");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showTopologyFor, setShowTopologyFor] = useState<number | null>(null);

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

  const sorted = useMemo(() => {
    const list = query.data?.list ?? [];
    const copy = [...list];
    copy.sort((a, b) => {
      let cmp: number;
      if (sortKey === "networkName" || sortKey === "gatewayName" || sortKey === "gatewayMac") {
        const va = (a[sortKey] ?? "") as string;
        const vb = (b[sortKey] ?? "") as string;
        cmp = sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      } else {
        const va = (a[sortKey] ?? 0) as number;
        const vb = (b[sortKey] ?? 0) as number;
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

  function SortHeader({ field, children }: { field: SortKey; children: React.ReactNode }) {
    const isActive = sortKey === field;
    return (
      <TableHead
        className="whitespace-nowrap cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => toggleSort(field)}
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
            Network stations bridging WiFi to BLE for remote lockbox management.
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

        <Table containerClassName="overflow-visible">
          <TableHeader className="sticky top-[57px] z-20 bg-card shadow-[0_1px_0_0_var(--border)]">
            <TableRow className="bg-muted/40 border-b border-border">
              <TableHead className="w-8 bg-card" />
              <SortHeader field="gatewayId">Gateway ID</SortHeader>
              <SortHeader field="gatewayName">Gateway Name</SortHeader>
              <SortHeader field="gatewayMac">MAC</SortHeader>
              <SortHeader field="networkName">WiFi Network</SortHeader>
              <SortHeader field="lockNum">Locks</SortHeader>
              <SortHeader field="isOnline">Status</SortHeader>
              <TableHead className="w-28 text-right text-xs font-medium text-muted-foreground bg-card">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((gw: GatewayInfo) => {
              const isExpanded = expandedId === gw.gatewayId;
              const isTopologyVisible = showTopologyFor === gw.gatewayId;
              return (
                <Fragment key={gw.gatewayId}>
                  <TableRow
                    data-state={isExpanded ? "expanded" : undefined}
                    className={`cursor-pointer transition-colors border-b border-border/60 ${
                      isExpanded ? "bg-muted/50" : "hover:bg-muted/30"
                    }`}
                    onClick={() => {
                      setExpandedId((prev) => (prev === gw.gatewayId ? null : gw.gatewayId));
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
                        title="Open interactive BLE network topology diagram"
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

                  {isExpanded && (
                    <>
                      <TableRow key={`${gw.gatewayId}-expanded`} className="hover:bg-muted/40 bg-muted/20">
                        <TableCell colSpan={8} className="p-0">
                          <div className="px-4 sm:px-5 py-3 border-b border-border/40">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-medium text-foreground">
                                Connected Lockboxes ({locksQuery.data ? locksQuery.data.locks.length : 0} units)
                              </h4>
                            </div>

                            {locksQuery.isLoading && (
                              <div className="space-y-1.5 py-1">
                                {Array.from({ length: Math.min(gw.lockNum || 3, 4) }).map((_, i) => (
                                  <Skeleton key={i} className="h-8 w-full rounded" />
                                ))}
                              </div>
                            )}

                            {locksQuery.isError && (
                              <p className="text-xs text-red-500 py-1">Failed to load connected lockboxes</p>
                            )}

                            {locksQuery.data && locksQuery.data.locks.length === 0 && (
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

                      {locksQuery.data?.locks.map((lock: GatewayLock) => (
                        <TableRow
                          key={lock.lockId}
                          className="hover:bg-muted/40 cursor-pointer bg-muted/10 border-b border-border/40"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenLock(lock.lockId);
                          }}
                          title="Click to view lockbox history"
                        >
                          <TableCell colSpan={8} className="py-2 px-4 sm:px-5">
                            <div className="flex items-center gap-4 sm:gap-6 ml-2 sm:ml-4 text-xs flex-wrap sm:flex-nowrap">
                              <span className="text-xs font-medium text-foreground w-24 shrink-0 tabular-nums">
                                {lock.lockId}
                              </span>
                              <span className="truncate max-w-[180px] text-foreground">
                                {lock.lockAlias || lock.lockName || "None"}
                              </span>
                              <SignalDot rssi={lock.rssi} size="xs" />
                              <div className="ml-auto">
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
                      ))}
                    </>
                  )}
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
    </div>
  );
}

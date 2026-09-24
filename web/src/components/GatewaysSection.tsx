import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGateways } from "@/api/client";
import type { GatewayInfo, GatewayLock } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronRight,
  ChevronDown,
  Network,
  Eye,
  Wifi,
  WifiOff,
  Unplug,
} from "lucide-react";
import { StatusBadge, SignalDot } from "@/components/status";

type SortKey = "gatewayId" | "gatewayMac" | "lockNum" | "isOnline";

interface Props {
  onOpenTopology: (id: number, name: string, lockNum: number) => void;
  onOpenLock: (lockId: number) => void;
}

export function GatewaysSection({ onOpenTopology, onOpenLock }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("isOnline");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ["gateways"],
    queryFn: getGateways,
  });

  const locksQuery = useQuery({
    queryKey: ["topology", expandedId],
    queryFn: async () => {
      const res = await fetch(`/api/gateways/${expandedId}/topology`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ gateway: any; locks: GatewayLock[] }>;
    },
    enabled: expandedId !== null,
  });

  const sorted = useMemo(() => {
    const list = query.data?.list ?? [];
    const copy = [...list];
    copy.sort((a, b) => {
      const va = (a[sortKey] ?? 0) as number;
      const vb = (b[sortKey] ?? 0) as number;
      const cmp = sortDir === "asc" ? va - vb : vb - va;
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
    return (
      <th
        className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {sortKey === field && (
            <span className="text-primary text-[10px]">
              {sortDir === "asc" ? "↑" : "↓"}
            </span>
          )}
        </span>
      </th>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>All Gateways ({sorted.length})</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {query.isError && (
          <p className="px-4 py-3 text-sm text-red-500">
            Error: {(query.error as Error).message}
          </p>
        )}

        {/* Header row */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto_auto] items-center px-4 py-2.5 border-b bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          <span className="w-8" />
          <SortHeader field="gatewayId">Gateway ID</SortHeader>
          <SortHeader field="gatewayMac">MAC</SortHeader>
          <span className="text-left px-3">WiFi</span>
          <SortHeader field="lockNum">Locks</SortHeader>
          <SortHeader field="isOnline">Status</SortHeader>
          <span className="px-3 text-right">Actions</span>
        </div>

        {/* Rows */}
        <div className="divide-y">
          {sorted.map((gw: GatewayInfo) => {
            const isExpanded = expandedId === gw.gatewayId;
            return (
              <div key={gw.gatewayId}>
                {/* Gateway row */}
                <div
                  className={`grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto_auto] items-center px-4 py-3 cursor-pointer transition-colors group ${
                    isExpanded
                      ? "bg-muted/50"
                      : "hover:bg-muted/30"
                  }`}
                  onClick={() =>
                    setExpandedId((prev) => (prev === gw.gatewayId ? null : gw.gatewayId))
                  }
                >
                  {/* Chevron */}
                  <div className="w-8 flex items-center justify-center">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                  </div>

                  {/* Gateway ID */}
                  <div className="font-mono font-semibold text-sm">{gw.gatewayId}</div>

                  {/* MAC */}
                  <div className="font-mono text-xs text-muted-foreground">{gw.gatewayMac || "-"}</div>

                  {/* WiFi */}
                  <div className="flex items-center gap-1.5 px-3">
                    {gw.networkName ? (
                      <>
                        <Wifi className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-sm">{gw.networkName}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Lock count */}
                  <div className="px-3">
                    <span className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-xs font-medium bg-muted rounded-full text-muted-foreground">
                      {gw.lockNum ?? 0}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="px-3">
                    {gw.isOnline === 1 ? (
                      <StatusBadge variant="online" label="Online" size="xs" />
                    ) : gw.isOnline === 0 ? (
                      <StatusBadge variant="offline" label="Offline" size="xs" />
                    ) : (
                      <StatusBadge label="Unknown" size="xs" />
                    )}
                  </div>

                  {/* Action */}
                  <div className="px-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTopology(
                          gw.gatewayId,
                          gw.networkName || String(gw.gatewayId),
                          gw.lockNum ?? 0
                        );
                      }}
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>Topology</span>
                    </Button>
                  </div>
                </div>

                {/* Expanded lock list */}
                {isExpanded && (
                  <div className="bg-muted/20 border-t border-dashed">
                    <div className="px-4 py-3 ml-8">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Connected Lockboxes
                        </h4>
                        {locksQuery.data && (
                          <span className="text-xs text-muted-foreground">
                            {locksQuery.data.locks.length} lock{locksQuery.data.locks.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {locksQuery.isLoading && (
                        <div className="space-y-2">
                          {Array.from({ length: Math.min(gw.lockNum || 3, 5) }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full rounded-lg" />
                          ))}
                        </div>
                      )}

                      {locksQuery.isError && (
                        <p className="text-xs text-red-500 py-2">
                          Failed to load lockboxes
                        </p>
                      )}

                      {locksQuery.data && locksQuery.data.locks.length === 0 && (
                        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                          <Unplug className="w-3.5 h-3.5" />
                          No lockboxes connected to this gateway
                        </div>
                      )}

                      {locksQuery.data && locksQuery.data.locks.length > 0 && (
                        <div className="rounded-lg border bg-background overflow-hidden">
                          {/* Sub-header */}
                          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center px-3 py-1.5 bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                            <span>Lock ID</span>
                            <span>Name</span>
                            <span>Signal</span>
                            <span className="w-20" />
                          </div>
                          {/* Lock rows */}
                          <div className="divide-y">
                            {locksQuery.data.locks.map((lock: GatewayLock) => (
                              <div
                                key={lock.lockId}
                                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center px-3 py-2.5 hover:bg-accent/50 cursor-pointer transition-colors group/lock"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenLock(lock.lockId);
                                }}
                              >
                                <div className="font-mono text-xs font-medium">{lock.lockId}</div>
                                <div className="text-sm truncate">{lock.lockName || lock.lockAlias || "-"}</div>
                                <div className="px-2">
                                  <SignalDot rssi={lock.rssi} size="xs" />
                                </div>
                                <div className="w-20 flex justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 gap-1 text-xs opacity-60 group-hover/lock:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenLock(lock.lockId);
                                    }}
                                  >
                                    <Eye className="w-3 h-3" />
                                    Detail
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {query.isFetching && (
          <div className="px-4 space-y-2 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!query.isFetching && sorted.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <WifiOff className="w-5 h-5" />
            <p className="text-sm">No gateways found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

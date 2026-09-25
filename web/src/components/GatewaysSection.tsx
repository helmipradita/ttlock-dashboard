import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGateways } from "@/api/client";
import type { GatewayInfo, GatewayLock } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  WifiOff,
  Unplug,
} from "lucide-react";
import { StatusBadge, SignalDot, wifiIconForOnline } from "@/components/status";
import { InlineTopology } from "@/components/InlineTopology";

type SortKey = "gatewayId" | "gatewayMac" | "networkName" | "lockNum" | "isOnline";

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
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ gateway: any; locks: GatewayLock[] }>;
    },
    enabled: expandedId !== null,
  });

  const sorted = useMemo(() => {
    const list = query.data?.list ?? [];
    const copy = [...list];
    copy.sort((a, b) => {
      let cmp: number;
      if (sortKey === "networkName") {
        const va = (a.networkName ?? "") as string;
        const vb = (b.networkName ?? "") as string;
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
      <TableHead className="whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort(field)}>
        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground transition-colors">
          {children}
          {isActive && (
            <span className="text-primary text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>
          )}
        </span>
      </TableHead>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>All Gateways ({sorted.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {query.isError && (
          <p className="px-4 py-3 text-sm text-red-500">Error: {(query.error as Error).message}</p>
        )}

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-8" />
              <SortHeader field="gatewayId">Gateway ID</SortHeader>
              <SortHeader field="gatewayMac">MAC</SortHeader>
              <SortHeader field="networkName">WiFi</SortHeader>
              <SortHeader field="lockNum">Locks</SortHeader>
              <SortHeader field="isOnline">Status</SortHeader>
              <TableHead className="w-28 text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Actions</TableHead>
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
                    className={`cursor-pointer hover:bg-muted/80 ${isExpanded ? "bg-muted/50" : ""}`}
                    onClick={() => {
                      setExpandedId((prev) => (prev === gw.gatewayId ? null : gw.gatewayId));
                      if (expandedId === gw.gatewayId) {
                        setShowTopologyFor((prev) => (prev === gw.gatewayId ? null : prev));
                      }
                    }}
                  >
                    <TableCell className="w-8 px-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-sm w-32">{gw.gatewayId}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground w-40">{gw.gatewayMac || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {gw.networkName ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          {(() => { const w = wifiIconForOnline(gw.isOnline); return <w.Icon className={`w-3.5 h-3.5 ${w.color} shrink-0`} />; })()}
                          {gw.networkName}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="w-20">
                      <span className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-xs font-medium bg-muted rounded-full text-muted-foreground">
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
                        className="h-7 gap-1.5"
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
                        <Network className="w-3.5 h-3.5" />
                        Topology
                      </Button>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <>
                      <TableRow key={`${gw.gatewayId}-expanded`} className="hover:bg-muted/50">
                        <TableCell colSpan={7} className="bg-muted/20 p-0">
                          <div className="px-4 py-3 ml-6">
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
                              <p className="text-xs text-red-500 py-2">Failed to load lockboxes</p>
                            )}

                            {locksQuery.data && locksQuery.data.locks.length === 0 && (
                              <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                                <Unplug className="w-3.5 h-3.5" />
                                No lockboxes connected to this gateway
                              </div>
                            )}

                            {isTopologyVisible && (
                              <InlineTopology
                                gatewayId={gw.gatewayId}
                                gatewayName={gw.networkName || String(gw.gatewayId)}
                                lockNum={gw.lockNum ?? 0}
                                onClose={() => setShowTopologyFor(null)}
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {locksQuery.data?.locks.map((lock: GatewayLock) => (
                        <TableRow
                          key={lock.lockId}
                          className="hover:!bg-muted/70 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); onOpenLock(lock.lockId); }}
                        >
                          <TableCell colSpan={7} className="py-2 px-4 ml-6">
                            <div className="flex items-center gap-6 ml-4">
                              <span className="font-mono text-xs font-medium w-24 shrink-0">{lock.lockId}</span>
                              <span className="truncate max-w-[180px] text-sm">{lock.lockAlias || lock.lockName || "-"}</span>
                              <SignalDot rssi={lock.rssi} size="xs" />
                              <div className="ml-auto">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
                                  onClick={(e) => { e.stopPropagation(); onOpenLock(lock.lockId); }}
                                >
                                  <Eye className="w-3 h-3" />
                                  Detail
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

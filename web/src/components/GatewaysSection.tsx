import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGateways } from "@/api/client";
import type { GatewayInfo, GatewayLock } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { rssiInfo } from "@/lib/format";

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
        className="text-left px-3 py-2 font-semibold text-sm cursor-pointer select-none hover:bg-muted/80 transition-colors"
        onClick={() => toggleSort(field)}
      >
        {children}
        {sortKey === field && (
          <span className="text-primary text-xs ml-1">
            {sortDir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </th>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>
            All Gateways ({sorted.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            🔄 Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {query.isError && (
          <p className="text-sm text-red-500">
            Error: {(query.error as Error).message}
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader field="gatewayId">Gateway ID</SortHeader>
              <SortHeader field="gatewayMac">MAC</SortHeader>
              <TableHead className="text-left px-3 py-2 font-semibold text-sm">WiFi</TableHead>
              <SortHeader field="lockNum">Locks</SortHeader>
              <SortHeader field="isOnline">Status</SortHeader>
              <TableHead className="text-left px-3 py-2 font-semibold text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((gw: GatewayInfo) => {
              const isExpanded = expandedId === gw.gatewayId;
              return (
                <>
                  <TableRow
                    key={gw.gatewayId}
                    className={`cursor-pointer transition-colors ${
                      isExpanded ? "bg-muted/80" : "hover:bg-muted/60"
                    }`}
                    onClick={() =>
                      setExpandedId((prev) => (prev === gw.gatewayId ? null : gw.gatewayId))
                    }
                  >
                    <TableCell className="font-semibold">
                      <span className="mr-1.5 text-muted-foreground text-xs">{isExpanded ? "▼" : "▶"}</span>
                      {gw.gatewayId}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{gw.gatewayMac || "-"}</TableCell>
                    <TableCell>{gw.networkName || "-"}</TableCell>
                    <TableCell>{gw.lockNum ?? 0}</TableCell>
                    <TableCell>
                      {gw.isOnline === 1 ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Online
                        </Badge>
                      ) : gw.isOnline === 0 ? (
                        <Badge variant="destructive">Offline</Badge>
                      ) : (
                        <Badge variant="secondary">Unknown</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTopology(
                            gw.gatewayId,
                            gw.networkName || String(gw.gatewayId),
                            gw.lockNum ?? 0
                          );
                        }}
                      >
                        🎯 Topology
                      </Button>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow key={`${gw.gatewayId}-locks`} className="bg-muted/30">
                      <TableCell colSpan={6} className="p-0">
                        <div className="px-4 py-3">
                          {locksQuery.isLoading && (
                            <div className="space-y-2 py-2">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-8 w-full" />
                              ))}
                            </div>
                          )}

                          {locksQuery.isError && (
                            <p className="text-xs text-red-500 py-2">
                              Failed to load lockboxes
                            </p>
                          )}

                          {locksQuery.data && locksQuery.data.locks.length === 0 && (
                            <p className="text-xs text-muted-foreground py-2 italic">
                              No lockboxes connected to this gateway
                            </p>
                          )}

                          {locksQuery.data && locksQuery.data.locks.length > 0 && (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-muted-foreground text-xs">
                                  <th className="text-left py-1 px-2">Lock ID</th>
                                  <th className="text-left py-1 px-2">Name</th>
                                  <th className="text-left py-1 px-2">Signal</th>
                                  <th className="text-left py-1 px-2 w-20">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {locksQuery.data.locks.map((lock: GatewayLock) => (
                                  <tr
                                    key={lock.lockId}
                                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenLock(lock.lockId);
                                    }}
                                  >
                                    <td className="py-1.5 px-2 font-mono text-xs">{lock.lockId}</td>
                                    <td className="py-1.5 px-2">{lock.lockName || lock.lockAlias || "-"}</td>
                                    <td className="py-1.5 px-2">
                                      <span className={rssiInfo(lock.rssi).color}>
                                        {rssiInfo(lock.rssi).label}
                                      </span>
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-1.5 text-xs font-mono"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenLock(lock.lockId);
                                        }}
                                      >
                                        🔓 View
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>

        {query.isFetching && (
          <div className="space-y-2 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {!query.isFetching && sorted.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No gateways found
          </p>
        )}
      </CardContent>
    </Card>
  );
}

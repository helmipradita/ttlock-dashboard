import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGateways } from "@/api/client";
import type { GatewayInfo } from "@/api/types";
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

type SortKey = "gatewayId" | "gatewayMac" | "lockNum" | "isOnline";

interface Props {
  onOpenTopology: (id: number, name: string, lockNum: number) => void;
}

export function GatewaysSection({ onOpenTopology }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("gatewayId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const query = useQuery({
    queryKey: ["gateways"],
    queryFn: getGateways,
  });

  const sorted = useMemo(() => {
    const list = query.data?.list ?? [];
    const copy = [...list];
    copy.sort((a, b) => {
      const va = (a[sortKey] ?? 0) as number;
      const vb = (b[sortKey] ?? 0) as number;
      return sortDir === "asc" ? va - vb : vb - va;
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
            {sorted.map((gw: GatewayInfo) => (
              <TableRow key={gw.gatewayId}>
                <TableCell className="font-semibold">{gw.gatewayId}</TableCell>
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
                    size="sm"
                    onClick={() =>
                      onOpenTopology(
                        gw.gatewayId,
                        gw.networkName || String(gw.gatewayId),
                        gw.lockNum ?? 0
                      )
                    }
                  >
                    Topology ({gw.lockNum ?? 0})
                  </Button>
                </TableCell>
              </TableRow>
            ))}
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

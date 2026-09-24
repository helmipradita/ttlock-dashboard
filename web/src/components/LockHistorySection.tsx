import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLock, getLockRecords, getLockGateway } from "@/api/client";
import type { LockRecord } from "@/api/types";
import { Input } from "@/components/ui/input";
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
import {
  formatDate,
  batteryLevel,
  rssiInfo,
  LOCK_RECORD_TYPES,
} from "@/lib/format";

interface Props {
  lockSelect?: { id: number; n: number } | null;
}

export function LockHistorySection({ lockSelect }: Props) {
  const [searchId, setSearchId] = useState("");
  const [activeId, setActiveId] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!lockSelect) return;
    const id = String(lockSelect.id);
    setSearchId(id);
    setActiveId(id);
    setPage(1);
  }, [lockSelect?.n]);

  const lockQuery = useQuery({
    queryKey: ["lock", activeId],
    queryFn: () => getLock(activeId),
    enabled: !!activeId,
  });

  const recordsQuery = useQuery({
    queryKey: ["records", activeId, page],
    queryFn: () => getLockRecords(activeId, page),
    enabled: !!activeId,
  });

  const gatewayQuery = useQuery({
    queryKey: ["gateway", activeId],
    queryFn: () => getLockGateway(activeId),
    enabled: !!activeId,
  });

  function handleSearch() {
    const id = searchId.trim();
    if (!id) return;
    setActiveId(id);
    setPage(1);
  }

  const lock = lockQuery.data;
  const records = recordsQuery.data;
  const gateway = gatewayQuery.data?.list?.[0];
  const battery = batteryLevel(lock?.electricQuantity);
  const gw = lock?.hasGateway === 1 ? gateway : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lock History by ID</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            id="lock-search"
            placeholder="Enter Lock ID (e.g. 35057430)"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={lockQuery.isFetching}>
            {lockQuery.isFetching ? "Loading..." : "Search"}
          </Button>
        </div>

        {lockQuery.isError && (
          <p className="text-sm text-red-500">
            Failed to fetch lock: {(lockQuery.error as Error).message}
          </p>
        )}

        {lock && (
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold mb-2">Lock Info</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/50 rounded-lg p-4 text-sm">
                <InfoItem label="Name" value={lock.lockName} />
                <InfoItem label="Alias" value={lock.lockAlias} />
                <InfoItem
                  label="Battery"
                  value={
                    <span className={battery.color}>
                      {battery.icon} {battery.label}
                    </span>
                  }
                />
                <InfoItem label="MAC" value={lock.lockMac} />
                <InfoItem label="Lock ID" value={String(lock.lockId)} />
                <InfoItem label="Model" value={lock.modelNum} />
                <InfoItem label="Firmware" value={lock.firmwareRevision} />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Gateway
              </h4>
              {gw ? (
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>
                    <strong>ID:</strong> {gw.gatewayId}
                  </span>
                  <span>
                    <strong>MAC:</strong> {gw.gatewayMac || "-"}
                  </span>
                  <span>
                    <strong>WiFi:</strong> {gw.networkName || "-"}
                  </span>
                  <span>
                    <strong>Status:</strong>{" "}
                    {gw.isOnline === 1 ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Offline</Badge>
                    )}
                  </span>
                  {gw.rssi != null && (
                    <span>
                      <strong>Signal:</strong>{" "}
                      <span className={rssiInfo(gw.rssi).color}>
                        {rssiInfo(gw.rssi).label}
                      </span>
                    </span>
                  )}
                </div>
              ) : lock.hasGateway === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No Gateway Connected
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Gateway info unavailable
                </p>
              )}
            </div>
          </div>
        )}

        {records && records.list.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">
              Unlock History{" "}
              <span className="text-muted-foreground font-normal">
                ({records.total} records)
              </span>
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.list.map((r: LockRecord, i: number) => (
                  <TableRow key={r.recordId}>
                    <TableCell>
                      {(records.pageNo - 1) * records.pageSize + i + 1}
                    </TableCell>
                    <TableCell>{formatDate(r.lockDate)}</TableCell>
                    <TableCell>
                      {LOCK_RECORD_TYPES[r.recordType] || `Type ${r.recordType}`}
                    </TableCell>
                    <TableCell>{r.username || "-"}</TableCell>
                    <TableCell>
                      {r.success === 1 ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {records.pages > 1 && (
              <div className="flex gap-1 justify-center flex-wrap mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹ Prev
                </Button>
                {Array.from({ length: Math.min(records.pages, 9) }, (_, i) => {
                  let pageNum: number;
                  if (records.pages <= 9) {
                    pageNum = i + 1;
                  } else {
                    const start = Math.max(3, page - 1);
                    const end = Math.min(records.pages - 2, page + 1);
                    const pages = new Set([
                      1,
                      2,
                      ...Array.from({ length: end - start + 1 }, (_, j) => start + j),
                      records.pages - 1,
                      records.pages,
                    ]);
                    const sorted = [...pages].sort((a, b) => a - b);
                    pageNum = sorted[i];
                    if (pageNum === undefined) return null;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= records.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next ›
                </Button>
              </div>
            )}
          </div>
        )}

        {records && records.list.length === 0 && activeId && !recordsQuery.isFetching && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No records found
          </p>
        )}

        {lockQuery.isFetching && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </dt>
      <dd className="text-sm font-medium">{value || "-"}</dd>
    </div>
  );
}

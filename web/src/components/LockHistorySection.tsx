import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLock, getLockRecords, getLockGateway } from "@/api/client";
import type { LockRecord } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDate,
  batteryLevel,
  LOCK_RECORD_TYPES,
} from "@/lib/format";
import { UnlockTerminal } from "@/components/UnlockTerminal";
import {
  Search,
  Lock as LockIcon,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  BatteryWarning,
  Wifi,
  WifiOff,
  History,
} from "lucide-react";
import { StatusBadge, SignalDot } from "@/components/status";

interface Props {
  lockSelect?: { id: number; n: number } | null;
}

function BatteryIcon({ level }: { level: number | null | undefined }) {
  if (level == null) return <BatteryWarning className="w-4 h-4 text-muted-foreground" />;
  if (level <= 20) return <BatteryLow className="w-4 h-4 text-red-500" />;
  if (level <= 50) return <BatteryMedium className="w-4 h-4 text-amber-500" />;
  return <BatteryFull className="w-4 h-4 text-green-500" />;
}

export function LockHistorySection({ lockSelect }: Props) {
  const [searchId, setSearchId] = useState("");
  const [activeId, setActiveId] = useState("");
  const [page, setPage] = useState(1);
  const [unlockOpen, setUnlockOpen] = useState(false);

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
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="lock-search"
            placeholder="Enter Lock ID (e.g. 35057430)"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              onClick={handleSearch}
              disabled={lockQuery.isFetching}
              size="sm"
              className="h-7"
            >
              {lockQuery.isFetching ? "Loading..." : "Search"}
            </Button>
          </div>
        </div>

        {lockQuery.isError && (
          <p className="text-sm text-red-500">
            Failed to fetch lock: {(lockQuery.error as Error).message}
          </p>
        )}

        {/* Lock detail */}
        {lock && (
          <div className="space-y-4">
            {/* Status row */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <LockIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{lock.lockName || lock.lockAlias}</p>
                  <p className="text-xs text-muted-foreground font-mono">ID: {lock.lockId}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  variant={lock.hasGateway === 1 ? "online" : "offline"}
                  label={lock.hasGateway === 1 ? "With Gateway" : "No Gateway"}
                  size="xs"
                  icon={lock.hasGateway === 1 ? Wifi : WifiOff}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setUnlockOpen(true)}
                >
                  <LockIcon className="w-3.5 h-3.5" />
                  Unlock
                </Button>
              </div>
            </div>

            {/* Lock Info */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Lock Info
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 rounded-lg p-4 text-sm">
                <InfoItem label="Name" value={lock.lockName} />
                <InfoItem label="Alias" value={lock.lockAlias} />
                <InfoItem
                  label="Battery"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <BatteryIcon level={lock.electricQuantity} />
                      <span className={battery.color}>{battery.label}</span>
                    </span>
                  }
                />
                <InfoItem label="MAC" value={lock.lockMac} />
                <InfoItem label="Lock ID" value={String(lock.lockId)} />
                <InfoItem label="Model" value={lock.modelNum} />
                <InfoItem label="Firmware" value={lock.firmwareRevision} />
              </div>
            </div>

            {/* Gateway */}
            <div className="rounded-lg p-4 border-l-4 border-l-primary bg-muted/30">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Gateway
              </h4>
              {gw ? (
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span>
                    <strong>ID:</strong> {gw.gatewayId}
                  </span>
                  <span>
                    <strong>MAC:</strong> {gw.gatewayMac || "-"}
                  </span>
                  <span>
                    <strong>WiFi:</strong> {gw.networkName || "-"}
                  </span>
                  <StatusBadge
                    variant={gw.isOnline === 1 ? "online" : "offline"}
                    label={gw.isOnline === 1 ? "Online" : "Offline"}
                    size="xs"
                  />
                  {gw.rssi != null && (
                    <SignalDot rssi={gw.rssi} />
                  )}
                </div>
              ) : lock.hasGateway === 0 ? (
                <p className="text-sm text-muted-foreground italic">No Gateway Connected</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Gateway info unavailable</p>
              )}
            </div>

            {/* Unlock History */}
            {records && records.list.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <History className="w-4 h-4 text-muted-foreground" />
                  Unlock History
                  <span className="text-muted-foreground font-normal text-xs">
                    ({records.total} records)
                  </span>
                </h4>
                <div className="rounded-lg border overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center px-3 py-2 bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b">
                    <span className="w-10 text-center">#</span>
                    <span>Time</span>
                    <span>Method</span>
                    <span>Operator</span>
                    <span className="w-20 text-right">Status</span>
                  </div>
                  {/* Rows */}
                  <div className="divide-y">
                    {records.list.map((r: LockRecord, i: number) => (
                      <div
                        key={r.recordId}
                        className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center px-3 py-2.5 text-sm hover:bg-muted/30 transition-colors"
                      >
                        <span className="w-10 text-center text-xs text-muted-foreground">
                          {(records.pageNo - 1) * records.pageSize + i + 1}
                        </span>
                        <span className="text-xs whitespace-nowrap">{formatDate(r.lockDate)}</span>
                        <span className="text-xs">{LOCK_RECORD_TYPES[r.recordType] || `Type ${r.recordType}`}</span>
                        <span className="text-xs truncate">{r.username || "-"}</span>
                        <div className="w-20 flex justify-end">
                          {r.success === 1 ? (
                            <StatusBadge variant="success" label="Success" size="xs" />
                          ) : (
                            <StatusBadge variant="failed" label="Failed" size="xs" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

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
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <History className="w-5 h-5" />
                <p className="text-sm">No records found</p>
              </div>
            )}
          </div>
        )}

        {lockQuery.isFetching && (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        )}
      </CardContent>

      {lock && (
        <UnlockTerminal
          lockId={lock.lockId}
          lockName={lock.lockAlias || lock.lockName || String(lock.lockId)}
          open={unlockOpen}
          onClose={() => setUnlockOpen(false)}
        />
      )}
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

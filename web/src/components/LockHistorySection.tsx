import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLock, getLockRecords, getLockGateway, getEnrichedLocks } from "@/api/client";
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
import { PasscodeModal } from "@/components/PasscodeModal";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Search,
  Lock as LockIcon,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  BatteryWarning,
  WifiOff,
  History,
  KeyRound,
  X,
  Radio,
} from "lucide-react";
import { StatusBadge, SignalDot, wifiIconForRssi } from "@/components/status";

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
  const [passcodeOpen, setPasscodeOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lockSelect) return;
    const id = String(lockSelect.id);
    setSearchId(id);
    setActiveId(id);
    setPage(1);
  }, [lockSelect?.n]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allLocksQuery = useQuery({
    queryKey: ["locks"],
    queryFn: getEnrichedLocks,
    staleTime: 60_000,
  });

  const filteredLocks = useMemo(() => {
    const q = searchId.trim().toLowerCase();
    if (!q) return [];
    return (allLocksQuery.data?.list ?? [])
      .filter((l) =>
        String(l.lockId).includes(q) ||
        (l.lockName && l.lockName.toLowerCase().includes(q)) ||
        (l.lockAlias && l.lockAlias.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [allLocksQuery.data, searchId]);

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

  function handleSearch(targetId?: string) {
    const id = (targetId ?? searchId).trim();
    if (!id) return;
    setActiveId(id);
    setPage(1);
    setShowDropdown(false);
  }

  function handleSelectLock(id: number) {
    const strId = String(id);
    setSearchId(strId);
    handleSearch(strId);
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
        {/* Search Bar - Separated Input + Clear + Button with Autocomplete */}
        <div ref={searchContainerRef} className="relative">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="lock-search"
                placeholder="Search Lock ID, Name, or Alias (e.g. 35057430, Lockbox-01)..."
                value={searchId}
                onChange={(e) => {
                  setSearchId(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  } else if (e.key === "Escape") {
                    setShowDropdown(false);
                  }
                }}
                className="pl-9 pr-9"
              />
              {searchId && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchId("");
                    setShowDropdown(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/80 transition-colors"
                  title="Clear"
                  aria-label="Clear search input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button
              onClick={() => handleSearch()}
              disabled={lockQuery.isFetching}
              className="gap-1.5 shrink-0 px-4"
            >
              <Search className="w-4 h-4" />
              {lockQuery.isFetching ? "Loading..." : "Search"}
            </Button>
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && filteredLocks.length > 0 && (
            <div className="absolute z-50 left-0 right-0 sm:right-auto sm:w-[480px] top-full mt-1.5 bg-popover text-popover-foreground border rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b">
                Suggested Lockboxes
              </div>
              <div className="p-1 space-y-0.5">
                {filteredLocks.map((item) => (
                  <div
                    key={item.lockId}
                    className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectLock(item.lockId)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <LockIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {item.lockAlias || item.lockName || `Lock #${item.lockId}`}
                        </p>
                        {item.lockAlias && item.lockName && item.lockAlias !== item.lockName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.lockName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.hasGateway === 1 && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                          <Radio className="w-2.5 h-2.5" />
                          Gateway
                        </span>
                      )}
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {item.lockId}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge
                  variant={lock.hasGateway === 1 ? "online" : "offline"}
                  label={lock.hasGateway === 1 ? "With Gateway" : "No Gateway"}
                  size="xs"
                  icon={lock.hasGateway === 1 ? wifiIconForRssi(gw?.rssi).Icon : WifiOff}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => setPasscodeOpen(true)}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Get PIN
                </Button>
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-12 text-center text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">#</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Time</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Method</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Operator</TableHead>
                      <TableHead className="w-24 text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.list.map((r: LockRecord, i: number) => (
                      <TableRow key={r.recordId}>
                        <TableCell className="w-12 text-center text-xs text-muted-foreground">
                          {(records.pageNo - 1) * records.pageSize + i + 1}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(r.lockDate)}</TableCell>
                        <TableCell className="text-xs">{LOCK_RECORD_TYPES[r.recordType] || `Type ${r.recordType}`}</TableCell>
                        <TableCell className="truncate max-w-[160px] text-xs">{r.username || "-"}</TableCell>
                        <TableCell className="w-24 text-right">
                          {r.success === 1 ? (
                            <StatusBadge variant="success" label="Success" size="xs" />
                          ) : (
                            <StatusBadge variant="failed" label="Failed" size="xs" />
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
        <>
          <UnlockTerminal
            lockId={lock.lockId}
            lockName={lock.lockAlias || lock.lockName || String(lock.lockId)}
            open={unlockOpen}
            onClose={() => setUnlockOpen(false)}
          />
          <PasscodeModal
            lockId={lock.lockId}
            lockName={lock.lockAlias || lock.lockName || String(lock.lockId)}
            open={passcodeOpen}
            onClose={() => setPasscodeOpen(false)}
          />
        </>
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

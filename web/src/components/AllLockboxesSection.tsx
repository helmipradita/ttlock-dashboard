import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEnrichedLocks } from "@/api/client";
import type { Lock } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Wifi,
  WifiOff,
} from "lucide-react";
import { StatusBadge } from "@/components/status";

type SortKey =
  | "lockId"
  | "lockName"
  | "lockAlias"
  | "lastOpen"
  | "electricQuantity"
  | "hasGateway";

interface Props {
  onLockSelect: (lockId: number) => void;
  selectedLockId?: number | null;
}

function BatteryIcon({ level }: { level: number | null | undefined }) {
  if (level == null) return <BatteryWarning className="w-4 h-4 text-muted-foreground" />;
  if (level <= 20) return <BatteryLow className="w-4 h-4 text-red-500" />;
  if (level <= 50) return <BatteryMedium className="w-4 h-4 text-amber-500" />;
  return <BatteryFull className="w-4 h-4 text-green-500" />;
}

export function AllLockboxesSection({ onLockSelect, selectedLockId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [paused, setPaused] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<{ id: number; name: string } | null>(null);

  const query = useQuery({
    queryKey: ["locks"],
    queryFn: getEnrichedLocks,
    refetchInterval: paused ? false : 300_000,
  });

  const countdown = useCountdown(
    300,
    useCallback(() => {
      query.refetch();
    }, [query]),
    !paused
  );

  const sorted = useMemo(() => {
    const list = query.data?.list ?? [];
    const copy = [...list];
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
          {sortKey === null && (field === "hasGateway" || field === "lastOpen") && (
            <span className="text-muted-foreground/50 text-[10px]">
              {field === "hasGateway" ? "↑" : "↓"}
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
          <CardTitle>All Lockboxes ({sorted.length})</CardTitle>
          <div className="flex items-center gap-3 text-sm">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <span className="text-muted-foreground tabular-nums text-xs">
              {paused ? "Paused" : `Next refresh: ${countdown.display}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setPaused(false);
                countdown.reset();
                query.refetch();
              }}
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {query.isError && (
          <p className="px-4 py-3 text-sm text-red-500">
            Error: {(query.error as Error).message}
          </p>
        )}

        {/* Header */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto_auto] items-center px-4 py-2.5 border-b bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          <span className="w-6" />
          <SortHeader field="lockId">Lock ID</SortHeader>
          <SortHeader field="lockName">Name</SortHeader>
          <span className="text-left px-3">Alias</span>
          <SortHeader field="lastOpen">Last Open</SortHeader>
          <SortHeader field="electricQuantity">Battery</SortHeader>
          <SortHeader field="hasGateway">Gateway</SortHeader>
          <span className="px-3 text-right">Action</span>
        </div>

        {/* Rows */}
        <div className="divide-y">
          {sorted.map((lock: Lock) => {
            const bat = batteryLevel(lock.electricQuantity);
            const isSelected = selectedLockId === lock.lockId;
            return (
              <div
                key={lock.lockId}
                className={`grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto_auto] items-center px-4 py-3 cursor-pointer transition-colors group ${
                  isSelected
                    ? "bg-primary/5 border-l-2 border-l-primary"
                    : "hover:bg-muted/30 border-l-2 border-l-transparent"
                }`}
                onClick={() => onLockSelect(lock.lockId)}
              >
                {/* Chevron */}
                <div className="w-6 flex items-center justify-center">
                  {isSelected && (
                    <ChevronRight className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>

                {/* Lock ID */}
                <div className="font-mono font-semibold text-sm">{lock.lockId}</div>

                {/* Name */}
                <div className="text-sm truncate">{lock.lockName || "-"}</div>

                {/* Alias */}
                <div className="text-sm text-muted-foreground truncate px-3">{lock.lockAlias || "-"}</div>

                {/* Last Open */}
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {relativeTime(lock.lastOpen)}
                </div>

                {/* Battery */}
                <div className="flex items-center gap-1.5 px-3">
                  <BatteryIcon level={lock.electricQuantity} />
                  <span className={`text-xs font-medium ${bat.color}`}>{bat.label}</span>
                </div>

                {/* Gateway */}
                <div className="px-3">
                  {lock.hasGateway === 1 ? (
                    <StatusBadge variant="online" label="Yes" size="xs" icon={Wifi} />
                  ) : (
                    <StatusBadge variant="offline" label="No" size="xs" icon={WifiOff} />
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
                      setUnlockTarget({
                        id: lock.lockId,
                        name: lock.lockAlias || lock.lockName || String(lock.lockId),
                      });
                    }}
                  >
                    <LockIcon className="w-3.5 h-3.5" />
                    Unlock
                  </Button>
                </div>
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
            <LockIcon className="w-5 h-5" />
            <p className="text-sm">No lockboxes found</p>
          </div>
        )}
      </CardContent>

      {unlockTarget && (
        <UnlockTerminal
          lockId={unlockTarget.id}
          lockName={unlockTarget.name}
          open
          onClose={() => setUnlockTarget(null)}
        />
      )}
    </Card>
  );
}

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEnrichedLocks } from "@/api/client";
import type { Lock } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountdown } from "@/hooks/useCountdown";
import { relativeTime, batteryLevel } from "@/lib/format";
import { UnlockTerminal } from "@/components/UnlockTerminal";

type SortKey =
  | "lockId"
  | "lockName"
  | "lockAlias"
  | "lastOpen"
  | "electricQuantity"
  | "hasGateway";

interface Props {
  onLockSelect: (lockId: number) => void;
}

export function AllLockboxesSection({ onLockSelect }: Props) {
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
        className="text-left px-3 py-2 font-semibold text-sm cursor-pointer select-none hover:bg-muted/80 transition-colors"
        onClick={() => toggleSort(field)}
      >
        {children}
        {sortKey === field && (
          <span className="text-primary text-xs ml-1">
            {sortDir === "asc" ? "▲" : "▼"}
          </span>
        )}
        {sortKey === null && (field === "hasGateway" || field === "lastOpen") && (
          <span className="text-muted-foreground text-xs ml-1">
            {field === "hasGateway" ? "▲" : "▼"}
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
            All Lockboxes ({sorted.length} locks)
          </CardTitle>
          <div className="flex items-center gap-3 text-sm">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? "▶ Resume" : "⏸ Pause"}
            </Button>
            <span className="text-muted-foreground tabular-nums">
              {paused ? "Paused" : `Next refresh: ${countdown.display}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPaused(false);
                countdown.reset();
                query.refetch();
              }}
            >
              🔄 Refresh Now
            </Button>
          </div>
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
              <SortHeader field="lockId">Lock ID</SortHeader>
              <SortHeader field="lockName">Name</SortHeader>
              <SortHeader field="lockAlias">Alias</SortHeader>
              <SortHeader field="lastOpen">Last Open</SortHeader>
              <SortHeader field="electricQuantity">Battery</SortHeader>
              <SortHeader field="hasGateway">Gateway</SortHeader>
              <th className="text-left px-3 py-2 font-semibold text-sm">Action</th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((lock: Lock) => {
              const bat = batteryLevel(lock.electricQuantity);
              return (
                <TableRow
                  key={lock.lockId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onLockSelect(lock.lockId)}
                >
                  <TableCell className="font-semibold">{lock.lockId}</TableCell>
                  <TableCell>{lock.lockName || "-"}</TableCell>
                  <TableCell>{lock.lockAlias || "-"}</TableCell>
                  <TableCell>{relativeTime(lock.lastOpen)}</TableCell>
                  <TableCell>
                    <span className={bat.color}>
                      {bat.icon} {bat.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={lock.hasGateway === 1 ? "default" : "secondary"}
                    >
                      {lock.hasGateway === 1 ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs font-mono"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUnlockTarget({
                          id: lock.lockId,
                          name: lock.lockAlias || lock.lockName || String(lock.lockId),
                        });
                      }}
                    >
                      🔓 Unlock
                    </Button>
                  </TableCell>
                </TableRow>
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
            No lockboxes found
          </p>
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

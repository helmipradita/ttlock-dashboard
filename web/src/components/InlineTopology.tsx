import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTopology } from "@/api/client";
import type { TopologyData } from "@/topology/topology-canvas";
import { initCanvas } from "@/topology/topology-canvas";
import { Button } from "@/components/ui/button";
import { X, RotateCcw, Network, Unplug, WifiHigh, Wifi, WifiLow } from "lucide-react";

interface Props {
  gatewayId: number;
  gatewayName: string;
  lockNum: number;
  onClose: () => void;
}

export function InlineTopology({
  gatewayId,
  gatewayName,
  lockNum,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<ReturnType<typeof initCanvas> | null>(null);
  const lastDataRef = useRef<TopologyData | null>(null);

  const query = useQuery({
    queryKey: ["topology", gatewayId],
    queryFn: () => getTopology(gatewayId),
    refetchInterval: false,
  });

  const setupCanvas = useCallback(() => {
    if (!canvasRef.current || !wrapperRef.current) return;
    instRef.current?.destroy();

    const rect = wrapperRef.current.getBoundingClientRect();
    const w = Math.max(Math.round(rect.width), 100);
    const h = Math.max(Math.round(rect.height), 100);

    requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      canvasRef.current.style.width = w + "px";
      canvasRef.current.style.height = h + "px";

      const inst = initCanvas(canvasRef.current, gatewayId);
      instRef.current = inst;

      if (lastDataRef.current) {
        inst.applyData(lastDataRef.current);
      }
    });
  }, [gatewayId]);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setupCanvas();
    });
    return () => {
      cancelAnimationFrame(t);
      instRef.current?.destroy();
      instRef.current = null;
    };
  }, [setupCanvas]);

  useEffect(() => {
    if (query.data) {
      lastDataRef.current = query.data;
      instRef.current?.applyData(query.data);
    }
  }, [query.data]);

  useEffect(() => {
    return () => {
      lastDataRef.current = null;
    };
  }, []);

  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-border bg-card text-card-foreground shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <Network className="w-3.5 h-3.5 text-foreground" />
          <span className="font-medium text-foreground">{gatewayName}</span>
          <span className="text-muted-foreground tabular-nums">({lockNum} locks)</span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            BLE link
          </span>
        </div>
        <div className="flex gap-1.5 items-center">
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 text-xs border-border shadow-none"
            onClick={() => instRef.current?.resetLayout()}
            title="Reset topology node positions"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            title="Close topology view"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={wrapperRef}
        className="relative h-80 sm:h-96 flex items-center justify-center overflow-hidden bg-muted/10"
      >
        {query.isLoading && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full motion-safe:animate-spin" />
            <span className="text-xs">Loading topology…</span>
          </div>
        )}

        {query.isError && (
          <div className="flex flex-col items-center gap-2 text-red-500 text-xs">
            <span>Failed to load topology</span>
            <span className="text-muted-foreground text-xs">{(query.error as Error)?.message}</span>
            <Button variant="outline" size="sm" onClick={() => query.refetch()} className="mt-1 h-6 text-xs">
              Retry
            </Button>
          </div>
        )}

        {!query.isLoading && !query.isError && query.data && query.data.locks.length === 0 && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Unplug className="w-4 h-4" />
            <span className="text-xs">No locks connected to this gateway</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          aria-label="Interactive BLE gateway and lockbox topology map"
          className="cursor-grab rounded"
          style={{
            display: query.isLoading || query.isError || (query.data && query.data.locks.length === 0) ? "none" : "block",
            touchAction: "none",
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-4 py-1.5 bg-muted/20 border-t border-border text-xs text-muted-foreground flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <WifiHigh className="w-3.5 h-3.5 text-emerald-500" />
          <span>Strong <span className="tabular-nums">(&gt; -75 dBm)</span></span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-amber-500" />
          <span>Medium <span className="tabular-nums">(-75 to -85 dBm)</span></span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <WifiLow className="w-3.5 h-3.5 text-red-500" />
          <span>Weak <span className="tabular-nums">(&le; -85 dBm)</span></span>
        </span>
      </div>
    </div>
  );
}

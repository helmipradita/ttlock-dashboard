import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTopology } from "@/api/client";
import type { TopologyData } from "@/topology/topology-canvas";
import { initCanvas } from "@/topology/topology-canvas";
import { Button } from "@/components/ui/button";
import { X, RotateCcw, Network, Unplug } from "lucide-react";

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
    refetchInterval: 1000,
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
    <div className="mt-3 rounded-lg overflow-hidden border bg-[#0f172a] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700">
        <div className="flex items-center gap-2 text-sm">
          <Network className="w-4 h-4 text-indigo-400" />
          <span className="font-medium">{gatewayName}</span>
          <span className="text-xs text-muted-foreground">{lockNum} locks</span>
          <span className="text-[10px] font-bold text-green-400 animate-pulse">● LIVE</span>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700"
            onClick={() => instRef.current?.resetLayout()}
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
            onClick={onClose}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={wrapperRef}
        className="relative h-96 flex items-center justify-center overflow-hidden"
      >
        {query.isLoading && (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading topology…</span>
          </div>
        )}

        {query.isError && (
          <div className="flex flex-col items-center gap-2 text-red-400 text-xs">
            <span>Failed to load topology</span>
            <span className="text-gray-500">{(query.error as Error)?.message}</span>
            <Button variant="outline" size="sm" onClick={() => query.refetch()} className="mt-1 h-6 text-xs">
              Retry
            </Button>
          </div>
        )}

        {!query.isLoading && !query.isError && query.data && query.data.locks.length === 0 && (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Unplug className="w-5 h-5" />
            <span className="text-xs">No locks connected</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="cursor-grab rounded"
          style={{
            display: query.isLoading || query.isError || (query.data && query.data.locks.length === 0) ? "none" : "block",
            touchAction: "none",
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-4 py-1.5 bg-gray-800/80 border-t border-gray-700 text-[10px] text-gray-400">
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Strong (&gt;-75)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Medium (-75~-85)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          Weak (&lt;-85)
        </span>
      </div>
    </div>
  );
}

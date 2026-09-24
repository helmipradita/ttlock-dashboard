import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTopology } from "@/api/client";
import type { TopologyData } from "@/topology/topology-canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { initCanvas } from "@/topology/topology-canvas";

interface Props {
  gatewayId: number;
  gatewayName: string;
  lockNum: number;
  open: boolean;
  onClose: () => void;
}

export function TopologyOverlay({
  gatewayId,
  gatewayName,
  lockNum,
  open,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<ReturnType<typeof initCanvas> | null>(null);
  const lastDataRef = useRef<TopologyData | null>(null);
  const [canvasSize, setCanvasSize] = useState(0);

  const query = useQuery({
    queryKey: ["topology", gatewayId],
    queryFn: () => getTopology(gatewayId),
    enabled: open,
    refetchInterval: open ? 1000 : false,
  });

  const setupCanvas = useCallback(() => {
    if (!canvasRef.current || !wrapperRef.current) return;
    instRef.current?.destroy();

    const rect = wrapperRef.current.getBoundingClientRect();
    const side = Math.max(Math.round(Math.min(rect.width, rect.height)), 100);
    setCanvasSize(side);

    requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      canvasRef.current.style.width = side + "px";
      canvasRef.current.style.height = side + "px";

      const inst = initCanvas(canvasRef.current, gatewayId);
      instRef.current = inst;

      if (lastDataRef.current) {
        inst.applyData(lastDataRef.current);
      }
    });
  }, [gatewayId]);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => {
        setupCanvas();
      });
      return () => {
        cancelAnimationFrame(t);
        instRef.current?.destroy();
        instRef.current = null;
      };
    }
  }, [open, setupCanvas]);

  useEffect(() => {
    if (query.data) {
      lastDataRef.current = query.data;
      instRef.current?.applyData(query.data);
    }
  }, [query.data]);

  useEffect(() => {
    if (!open) {
      lastDataRef.current = null;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-none sm:max-w-none w-screen h-screen p-0 m-0 rounded-none border-0 bg-[#0f172a]">
        <div className="flex flex-col h-full">
          <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
            <DialogTitle className="text-gray-100 flex items-center gap-3">
              <span>{gatewayName} — {lockNum} locks</span>
              <span className="text-xs font-bold text-green-400 animate-pulse">
                ● LIVE
              </span>
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => instRef.current?.resetLayout()}
              >
                Reset Layout
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onClose}
              >
                ✕ Close
              </Button>
            </div>
          </DialogHeader>

          <div
            ref={wrapperRef}
            className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-hidden"
          >
            {query.isLoading && (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading topology…</span>
              </div>
            )}

            {query.isError && (
              <div className="flex flex-col items-center gap-3 text-red-400">
                <span className="text-sm font-medium">Failed to load topology</span>
                <span className="text-xs text-gray-500">{(query.error as Error)?.message}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => query.refetch()}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            )}

            {!query.isLoading && !query.isError && query.data && query.data.locks.length === 0 && (
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-600 text-xl">
                  ◆
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">No locks connected</p>
                  <p className="text-xs text-gray-600 mt-1">Gateway is online but has 0 paired lockboxes</p>
                </div>
              </div>
            )}

            <canvas
              ref={canvasRef}
              className="cursor-grab rounded-xl ring-1 ring-white/10 shadow-2xl"
              style={{
                display: canvasSize > 0 ? "block" : "none",
                touchAction: "none",
              }}
            />
          </div>

          <div className="flex gap-5 px-5 py-2.5 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 shrink-0">
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1 align-middle" />
              Strong (&gt;-75)
            </span>
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1 align-middle" />
              Medium (-75~-85)
            </span>
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1 align-middle" />
              Weak (&lt;-85)
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

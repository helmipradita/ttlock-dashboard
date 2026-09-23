import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTopology } from "@/api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  initCanvas,
  applyTopologyData,
} from "@/topology/topology-canvas";
import type { TopoState } from "@/topology/topology-canvas";

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
  const stateRef = useRef<TopoState | null>(null);
  const initRef = useRef<{ destroy: () => void; resetLayout: () => void } | null>(null);

  const query = useQuery({
    queryKey: ["topology", gatewayId],
    queryFn: () => getTopology(gatewayId),
    enabled: open,
    refetchInterval: open ? 1000 : false,
  });

  const setupCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    initRef.current?.destroy();
    const inst = initCanvas(canvasRef.current, gatewayId);
    initRef.current = inst;
    stateRef.current = inst.getState();
  }, [gatewayId]);

  useEffect(() => {
    if (open && canvasRef.current) {
      const t = setTimeout(setupCanvas, 50);
      return () => {
        clearTimeout(t);
        initRef.current?.destroy();
        initRef.current = null;
        stateRef.current = null;
      };
    }
  }, [open, setupCanvas]);

  useEffect(() => {
    if (query.data && stateRef.current) {
      applyTopologyData(stateRef.current, gatewayId, query.data);
    }
  }, [query.data, gatewayId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-none w-screen h-screen p-0 m-0 rounded-none border-0 bg-[#0f172a]">
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
                onClick={() => initRef.current?.resetLayout()}
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

          <canvas
            ref={canvasRef}
            className="flex-1 w-full cursor-grab"
            style={{ minHeight: 0 }}
          />

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

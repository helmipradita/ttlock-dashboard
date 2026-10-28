import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { unlockLock } from "@/api/client";
import type { UnlockResponse } from "@/api/types";
import {
  Unlock,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  lockId: number;
  lockName: string;
  open: boolean;
  onClose: () => void;
}

export function UnlockTerminal({ lockId, lockName, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<UnlockResponse | null>(null);
  const queryClient = useQueryClient();

  async function doUnlock() {
    setLoading(true);
    setLastResult(null);
    const result = await unlockLock(lockId);
    setLastResult(result);
    setLoading(false);

    if (result.ok) {
      queryClient.invalidateQueries({ queryKey: ["locks"] });
      queryClient.invalidateQueries({ queryKey: ["lock", String(lockId)] });
      queryClient.invalidateQueries({ queryKey: ["records", String(lockId)] });
    }
  }

  function handleClose() {
    setLastResult(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="w-full sm:max-w-md bg-card border border-border text-card-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Unlock className="w-4 h-4 text-foreground" />
            <DialogTitle className="text-sm font-semibold">Remote Unlock Console</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground flex items-center justify-between pt-1">
            <span>Target: <strong className="text-foreground font-medium">{lockName}</strong></span>
            <span>ID: <strong className="tabular-nums font-medium text-foreground">{lockId}</strong></span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <RefreshCw className="w-6 h-6 motion-safe:animate-spin text-foreground" />
              <p className="text-xs text-muted-foreground">Transmitting unlock payload via Gateway…</p>
            </div>
          )}

          {!loading && !lastResult && (
            <div className="bg-muted/30 border border-border rounded-lg p-5 text-center space-y-3">
              <div className="w-10 h-10 rounded-md bg-muted border border-border text-foreground flex items-center justify-center mx-auto">
                <Radio className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-xs text-foreground">Confirm Gateway Unlock Command</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Sends an immediate cryptographic unlock packet through the linked WiFi gateway.
                </p>
              </div>
              <Button
                onClick={doUnlock}
                className="gap-2 font-medium w-full sm:w-auto px-5 h-8 text-xs shadow-none cursor-pointer"
                size="sm"
                title="Send remote unlock instruction to gateway"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Execute Remote Unlock</span>
              </Button>
            </div>
          )}

          {!loading && lastResult && lastResult.ok && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center space-y-3">
              <div className="w-9 h-9 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-xs text-emerald-700 dark:text-emerald-400">Lockbox Unlocked Successfully</h4>
                <p className="text-xs text-muted-foreground">
                  Command acknowledged by gateway at {new Date(lastResult.ts).toLocaleTimeString()}.
                </p>
              </div>
              <div className="pt-1 flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-none"
                  onClick={doUnlock}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Unlock Again</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs font-medium shadow-none"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {!loading && lastResult && !lastResult.ok && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-md bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-left flex-1 min-w-0">
                  <h4 className="font-semibold text-xs text-red-500">Unlock Command Failed</h4>
                  <p className="text-xs text-foreground font-medium">{lastResult.human || lastResult.errmsg}</p>
                  {lastResult.description && lastResult.description !== lastResult.errmsg && (
                    <p className="text-xs text-muted-foreground">{lastResult.description}</p>
                  )}
                  {lastResult.errcode !== 0 && (
                    <p className="text-xs text-muted-foreground pt-0.5">
                      Error Code: <span className="tabular-nums font-medium">{lastResult.errcode}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="pt-1 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 shadow-none"
                  onClick={doUnlock}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs shadow-none"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Operational Requirements Notice */}
          <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Remote Unlock Operational Conditions</span>
            </div>
            <ul className="space-y-1 text-muted-foreground pl-4 list-disc text-xs">
              <li>
                <strong className="text-foreground font-medium">Gateway Proximity:</strong> Lockbox must be within BLE radio range of an active, online TTLOCK gateway.
              </li>
              <li>
                <strong className="text-foreground font-medium">Remote Unlock Enabled:</strong> The remote unlock switch must be enabled in the TTLOCK lock configuration.
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

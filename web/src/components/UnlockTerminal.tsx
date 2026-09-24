import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { unlockLock } from "@/api/client";
import type { UnlockResponse } from "@/api/types";

interface Props {
  lockId: number;
  lockName: string;
  open: boolean;
  onClose: () => void;
}

export function UnlockTerminal({ lockId, lockName, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<UnlockResponse[]>([]);
  const queryClient = useQueryClient();

  async function doUnlock() {
    setLoading(true);
    const res = await unlockLock(lockId);
    setHistory((h) => [...h, res]);
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["locks"] });
    }
    setLoading(false);
  }

  function handleClose() {
    setHistory([]);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-[#0c0c0c] border border-green-900/40 font-mono text-sm">
        <DialogHeader>
          <DialogTitle className="text-green-400 font-mono flex items-center gap-2">
            <span className="text-green-500/60">$</span>
            unlock --id {lockId}
            <span className="text-muted-foreground text-xs font-sans ml-auto">{lockName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* History log */}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {history.map((entry, i) => (
            <div
              key={i}
              className={`leading-relaxed ${
                entry.ok ? "text-green-400" : "text-red-400"
              }`}
            >
              <span className="text-muted-foreground text-xs">{new Date(entry.ts).toLocaleTimeString()}</span>
              <span className="mx-1.5">{entry.ok ? "✓" : "✗"}</span>
              <span className={entry.ok ? "text-green-300" : "text-red-300"}>
                {entry.human}
              </span>
              {!entry.ok && (
                <span className="text-muted-foreground ml-2">
                  [errcode:{entry.errcode}] {entry.errmsg}
                </span>
              )}
              {!entry.ok && entry.description && entry.description !== entry.errmsg && (
                <div className="text-muted-foreground/70 ml-6 text-xs">
                  {entry.description}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="text-green-500 animate-pulse">
              <span className="text-muted-foreground text-xs">{new Date().toLocaleTimeString()}</span>
              <span className="mx-1.5">⏵</span>
              sending unlock command...
            </div>
          )}

          {history.length === 0 && !loading && (
            <div className="text-muted-foreground/60 py-2">
              Click confirm below to send unlock command to gateway.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-2 border-t border-green-900/30">
          {history.length === 0 && !loading ? (
            <Button
              onClick={doUnlock}
              className="bg-green-900/40 hover:bg-green-900/70 text-green-300 border border-green-700/50 font-mono"
            >
              ⚠ Confirm Unlock
            </Button>
          ) : !loading ? (
            <Button
              onClick={doUnlock}
              className="bg-green-900/40 hover:bg-green-900/70 text-green-300 border border-green-700/50 font-mono"
            >
              ↻ Retry
            </Button>
          ) : null}
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-muted-foreground ml-auto font-mono"
          >
            [esc] close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

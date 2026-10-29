import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getLockPasscode } from "@/api/client";
import type { PasscodeResponse } from "@/api/types";
import { KeyRound, Copy, Check, RefreshCw, AlertCircle, ShieldCheck } from "lucide-react";

interface Props {
  lockId: number;
  lockName: string;
  open: boolean;
  onClose: () => void;
}

export function PasscodeModal({ lockId, lockName, open, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const { data: rawResult, isLoading: loading, error, refetch } = useQuery({
    queryKey: ["passcode", lockId, open],
    queryFn: () => getLockPasscode(lockId),
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  });

  const fetchPasscode = () => {
    setCopied(false);
    refetch();
  };

  const result: PasscodeResponse | null = useMemo(() => {
    if (!open) return null;
    if (rawResult) return rawResult;
    if (error) {
      return {
        ok: false,
        errcode: -1,
        errmsg: (error as Error)?.message || "Failed to request passcode",
        human: "Failed to reach TTLock API",
        lockId,
        ts: "",
      };
    }
    return null;
  }, [open, rawResult, error, lockId]);

  const resultTs = result?.ts;
  const windowText = useMemo(() => {
    if (!resultTs) return "Active for 6 hours from creation";
    const start = new Date(resultTs);
    const end = new Date(start.getTime() + 6 * 3600 * 1000);
    const sStr = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const eStr = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `Active for 6 hours from creation (${sStr} – ${eStr})`;
  }, [resultTs]);

  function copyToClipboard() {
    if (result?.keyboardPwd) {
      navigator.clipboard.writeText(result.keyboardPwd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border text-card-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <KeyRound className="w-4 h-4 text-foreground" />
            <DialogTitle className="text-sm font-semibold">One-Time Passcode</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground flex items-center justify-between pt-1">
            <span>Lockbox: <strong className="text-foreground font-medium">{lockName}</strong></span>
            <span>ID: <strong className="tabular-nums font-medium text-foreground">{lockId}</strong></span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <RefreshCw className="w-6 h-6 motion-safe:animate-spin text-foreground" />
              <p className="text-xs text-muted-foreground">Generating algorithmic offline PIN…</p>
            </div>
          )}

          {!loading && result && !result.ok && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Failed to generate PIN</span>
              </div>
              <p className="text-xs text-muted-foreground">{result.human || result.errmsg}</p>
              {result.errcode && (
                <p className="text-xs text-muted-foreground">Error Code: <span className="tabular-nums font-medium">{result.errcode}</span></p>
              )}
              <div className="pt-2 flex justify-end">
                <Button size="sm" variant="outline" onClick={fetchPasscode} className="h-7 text-xs gap-1.5">
                  <RefreshCw className="w-3 h-3" /> Retry
                </Button>
              </div>
            </div>
          )}

          {!loading && result && result.ok && result.keyboardPwd && (
            <div className="space-y-4">
              {/* PIN Display Card */}
              <div className="bg-muted/60 border rounded-xl p-5 text-center relative flex flex-col items-center justify-center space-y-2">
                <span className="text-xs text-muted-foreground font-medium">
                  One-Time Passcode (PIN)
                </span>
                <div className="tabular-nums text-2xl sm:text-3xl font-bold tracking-[0.2em] text-foreground select-all py-1">
                  {result.keyboardPwd}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant={copied ? "default" : "secondary"}
                    className="h-8 gap-1.5 text-xs font-medium"
                    onClick={copyToClipboard}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied to Clipboard!" : "Copy PIN"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={fetchPasscode}
                  >
                    <RefreshCw className="w-3 h-3" /> New PIN
                  </Button>
                </div>
              </div>

              {/* Rules / Info */}
              <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Passcode Operating Rules</span>
                </div>
                <ul className="space-y-1 text-muted-foreground pl-4 list-disc text-xs">
                  <li>
                    <strong className="text-foreground font-medium">Single-Use (1x):</strong> The algorithmic PIN expires immediately after the first successful keypad unlock.
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">6-Hour Window:</strong> {windowText}.
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">Offline Architecture:</strong> Evaluated algorithmically by physical lockbox firmware. No gateway or internet link needed.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

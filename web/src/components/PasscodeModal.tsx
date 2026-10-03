import { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PasscodeResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function fetchPasscode() {
    setLoading(true);
    setCopied(false);
    const res = await getLockPasscode(lockId);
    setResult(res);
    setLoading(false);
  }

  useEffect(() => {
    if (open) {
      fetchPasscode();
    } else {
      setResult(null);
      setCopied(false);
    }
  }, [open, lockId]);

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
            <KeyRound className="w-5 h-5" />
            <DialogTitle>One-Time Passcode</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground flex items-center justify-between pt-1">
            <span>Lockbox: <strong className="text-foreground">{lockName}</strong></span>
            <span className="font-mono">ID: {lockId}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Generating algorithmic offline PIN...</p>
            </div>
          )}

          {!loading && result && !result.ok && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm space-y-1">
              <div className="flex items-center gap-2 text-red-400 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Failed to generate PIN</span>
              </div>
              <p className="text-xs text-muted-foreground">{result.human || result.errmsg}</p>
              {result.errcode && (
                <p className="text-[11px] font-mono text-muted-foreground">Error Code: {result.errcode}</p>
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
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  One-Time Passcode (PIN)
                </span>
                <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-[0.25em] text-foreground select-all py-1">
                  {result.keyboardPwd}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant={copied ? "default" : "secondary"}
                    className="h-8 gap-1.5 text-xs font-medium"
                    onClick={copyToClipboard}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
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
              <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  <span>Aturan Penggunaan Passcode</span>
                </div>
                <ul className="space-y-1.5 text-muted-foreground pl-5 list-disc text-[11px]">
                  <li>
                    <strong className="text-foreground">Satu Kali Pakai (1x):</strong> PIN akan langsung hangus setelah sukses digunakan membuka lockbox.
                  </li>
                  <li>
                    <strong className="text-foreground">Valid 6 Jam:</strong> Berlaku selama 6 jam sejak dibuat ({new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} s/d {new Date(Date.now() + 6 * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).
                  </li>
                  <li>
                    <strong className="text-foreground">Offline:</strong> Bekerja secara otomatis di fisik lockbox tanpa memerlukan koneksi gateway internet.
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

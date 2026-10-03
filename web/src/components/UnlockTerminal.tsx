import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { unlockLock } from "@/api/client";
import type { UnlockResponse } from "@/api/types";
import { Unlock, CheckCircle2, AlertCircle, RefreshCw, Radio, Info } from "lucide-react";

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
    const res = await unlockLock(lockId);
    setLastResult(res);
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["locks"] });
    }
    setLoading(false);
  }

  function handleClose() {
    setLastResult(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md bg-card border text-card-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Unlock className="w-5 h-5" />
            <DialogTitle>Remote Unlock</DialogTitle>
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
              <p className="text-xs text-muted-foreground">Sending unlock command via Gateway...</p>
            </div>
          )}

          {!loading && !lastResult && (
            <div className="bg-muted/40 border rounded-xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm text-foreground">Buka Kunci Jarak Jauh</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Perintah unlock akan dikirimkan secara instan melalui gateway yang terhubung.
                </p>
              </div>
              <Button
                onClick={doUnlock}
                className="gap-2 font-medium w-full sm:w-auto px-6"
                size="sm"
              >
                <Unlock className="w-4 h-4" />
                Confirm Unlock
              </Button>
            </div>
          )}

          {!loading && lastResult && lastResult.ok && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm text-green-500">Lock Berhasil Dibuka!</h4>
                <p className="text-xs text-muted-foreground">
                  Perintah sukses dieksekusi oleh gateway pada {new Date(lastResult.ts).toLocaleTimeString()}.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10"
                  onClick={doUnlock}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Unlock Lagi
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs font-medium"
                  onClick={handleClose}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}

          {!loading && lastResult && !lastResult.ok && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-left flex-1">
                  <h4 className="font-semibold text-sm text-red-500">Gagal Membuka Lock</h4>
                  <p className="text-xs text-foreground font-medium">{lastResult.human || lastResult.errmsg}</p>
                  {lastResult.description && lastResult.description !== lastResult.errmsg && (
                    <p className="text-[11px] text-muted-foreground">{lastResult.description}</p>
                  )}
                  {lastResult.errcode !== 0 && (
                    <p className="text-[11px] font-mono text-muted-foreground pt-1">
                      Error Code: {lastResult.errcode}
                    </p>
                  )}
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={doUnlock}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  onClick={handleClose}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}

          {/* Rules / Requirements Card */}
          <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>Syarat Remote Unlock</span>
            </div>
            <ul className="space-y-1 text-muted-foreground pl-5 list-disc text-[11px]">
              <li>
                <strong className="text-foreground">Gateway Aktif:</strong> Lockbox harus berada dalam jangkauan sinyal Bluetooth dari Gateway WiFi TTLOCK yang Online.
              </li>
              <li>
                <strong className="text-foreground">Pengaturan Aplikasi:</strong> Fitur <em>Remote Unlock</em> wajib diaktifkan pada pengaturan lockbox di aplikasi TTLOCK.
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

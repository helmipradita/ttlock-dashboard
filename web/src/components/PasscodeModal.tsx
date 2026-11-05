import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  generateLockPasscode,
  getLockPasscodes,
  deleteLockPasscode,
} from "@/api/client";
import type { PasscodeResponse, PasscodeItem } from "@/api/types";
import {
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Trash2,
  Clock,
  Infinity as InfinityIcon,
  PlusCircle,
  ListFilter,
  WifiOff,
} from "lucide-react";
import { formatDate } from "@/lib/format";

interface Props {
  lockId: number;
  lockName: string;
  hasGateway?: boolean;
  open: boolean;
  onClose: () => void;
}

const TIMED_PRESETS = [
  { label: "1 Day (24h)", hours: 24 },
  { label: "3 Days (72h)", hours: 72 },
  { label: "7 Days (168h)", hours: 168 },
  { label: "30 Days (720h)", hours: 720 },
];

export function PasscodeModal({
  lockId,
  lockName,
  hasGateway = true,
  open,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"generate" | "list">("generate");

  // Generate Tab State
  const [passcodeType, setPasscodeType] = useState<1 | 2 | 3>(1);
  const [passcodeName, setPasscodeName] = useState("");
  const [timedHours, setTimedHours] = useState(24);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<PasscodeResponse | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Active PINs Tab State
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  // Fetch active PINs list when modal is open
  const passcodesQuery = useQuery({
    queryKey: ["lock-passcodes", lockId],
    queryFn: () => getLockPasscodes(lockId),
    enabled: open,
  });

  const rawList = passcodesQuery.data?.list ?? [];
  const currentTimestamp = passcodesQuery.dataUpdatedAt || 0;

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    setGenerateError(null);
    setCopied(false);

    try {
      const now = Date.now();
      let payload: { type: number; name?: string; startDate?: number; endDate?: number } = {
        type: passcodeType,
      };

      if (passcodeName.trim()) {
        payload.name = passcodeName.trim();
      }

      if (passcodeType === 3) {
        // Round to hour as required by TTLock API specification
        const startHour = Math.floor(now / 3600000) * 3600000;
        const endHour = startHour + timedHours * 3600000;
        payload.startDate = startHour;
        payload.endDate = endHour;
      }

      const res = await generateLockPasscode(lockId, payload);
      if (!res.ok) {
        setGenerateError(res.human || res.errmsg || "Failed to generate passcode");
      } else {
        setLastGenerated(res);
        // Refresh active list in background
        queryClient.invalidateQueries({ queryKey: ["lock-passcodes", lockId] });
      }
    } catch (err: any) {
      setGenerateError(err.message || "Network error occurred");
    } finally {
      setGenerating(false);
    }
  }

  function copyToClipboard(text?: string) {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleDeletePasscode(passcodeId: number) {
    if (deletingId) return;
    setDeletingId(passcodeId);
    setDeleteNotice(null);

    try {
      const res = await deleteLockPasscode(lockId, passcodeId, 2);
      if (res.errcode !== 0) {
        setDeleteNotice({
          ok: false,
          msg: res.errmsg || `Failed to delete passcode (Code: ${res.errcode})`,
        });
      } else {
        setDeleteNotice({
          ok: true,
          msg: "Passcode successfully deleted from physical lockbox hardware.",
        });
        setConfirmDeleteId(null);
        queryClient.invalidateQueries({ queryKey: ["lock-passcodes", lockId] });
      }
    } catch (err: any) {
      setDeleteNotice({
        ok: false,
        msg: err.message || "Failed to dispatch delete command over gateway",
      });
    } finally {
      setDeletingId(null);
    }
  }

  function getPasscodeTypeBadge(type: number) {
    switch (type) {
      case 1:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock className="w-2.5 h-2.5" />
            <span>OTP</span>
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <InfinityIcon className="w-2.5 h-2.5" />
            <span>Permanent</span>
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            <Clock className="w-2.5 h-2.5" />
            <span>Timed</span>
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
            Type {type}
          </span>
        );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-xl max-h-[88vh] overflow-y-auto bg-card border border-border text-card-foreground p-4 sm:p-5 space-y-4">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-7 sm:pr-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <KeyRound className="w-4 h-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-semibold leading-tight truncate">
                  PIN Passcode Console
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span className="truncate">
                    Lockbox: <strong className="text-foreground font-medium">{lockName}</strong>
                  </span>
                  <span className="tabular-nums shrink-0">#{lockId}</span>
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Tab Navigation: Generate vs Active PINs */}
          <div className="flex items-center gap-1 border-b border-border pt-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setTab("generate");
                setDeleteNotice(null);
              }}
              className={`pb-2 px-3 font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                tab === "generate"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Generate PIN</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("list");
                passcodesQuery.refetch();
              }}
              className={`pb-2 px-3 font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                tab === "list"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Active PINs ({rawList.length})</span>
            </button>
          </div>
        </DialogHeader>

        {/* ================= TAB 1: GENERATE PIN ================= */}
        {tab === "generate" && (
          <div className="space-y-4 pt-1">
            {/* PIN Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Select Passcode Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Option 1: OTP */}
                <button
                  type="button"
                  onClick={() => setPasscodeType(1)}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                    passcodeType === 1
                      ? "border-amber-500 bg-amber-500/10 text-foreground"
                      : "border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">One-Time (OTP)</span>
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
                    Single-use code valid 6 hours. 100% offline.
                  </p>
                </button>

                {/* Option 2: Permanent */}
                <button
                  type="button"
                  onClick={() => setPasscodeType(2)}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                    passcodeType === 2
                      ? "border-purple-500 bg-purple-500/10 text-foreground"
                      : "border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Permanent</span>
                    <InfinityIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
                    Valid permanently. Must be used once in 24 hours.
                  </p>
                </button>

                {/* Option 3: Timed */}
                <button
                  type="button"
                  onClick={() => setPasscodeType(3)}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                    passcodeType === 3
                      ? "border-cyan-500 bg-cyan-500/10 text-foreground"
                      : "border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Timed (Period)</span>
                    <Clock className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
                    Valid during designated time duration window.
                  </p>
                </button>
              </div>
            </div>

            {/* Optional Timed Duration Presets (Only when Type 3 selected) */}
            {passcodeType === 3 && (
              <div className="space-y-1.5 p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
                <label className="text-xs font-medium text-foreground">
                  Valid Duration Period
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TIMED_PRESETS.map((preset) => (
                    <button
                      key={preset.hours}
                      type="button"
                      onClick={() => setTimedHours(preset.hours)}
                      className={`h-7 px-2.5 text-xs rounded border transition-colors cursor-pointer ${
                        timedHours === preset.hours
                          ? "bg-foreground text-background border-foreground font-medium"
                          : "bg-background text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Starts immediately; expires in {timedHours} hours. (Must be used within first 24h).
                </p>
              </div>
            )}

            {/* Optional Passcode Name / Note */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Passcode Reference Name <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={passcodeName}
                onChange={(e) => setPasscodeName(e.target.value)}
                placeholder="e.g. Vendor Maintenance, Guest PIN"
                maxLength={20}
                className="w-full h-8 px-3 text-xs bg-muted/30 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
              />
            </div>

            {/* Generate Action Button */}
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="w-full h-8 text-xs font-medium gap-1.5 cursor-pointer"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 motion-safe:animate-spin" />
                  <span>Calculating Algorithmic PIN...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Generate {passcodeType === 1 ? "One-Time PIN" : passcodeType === 2 ? "Permanent PIN" : "Timed PIN"}</span>
                </>
              )}
            </Button>

            {/* Error Message */}
            {generateError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>PIN Generation Error</span>
                </div>
                <p className="text-muted-foreground">{generateError}</p>
              </div>
            )}

            {/* Display Generated PIN Card */}
            {lastGenerated?.ok && lastGenerated.keyboardPwd && (
              <div className="space-y-3 pt-1">
                <div className="bg-muted/60 border rounded-xl p-4 text-center relative flex flex-col items-center justify-center space-y-2">
                  <div className="flex items-center gap-1.5">
                    {getPasscodeTypeBadge(lastGenerated.type ?? 1)}
                    <span className="text-xs text-muted-foreground font-medium">
                      Generated Physical Keypad PIN
                    </span>
                  </div>

                  <div className="tabular-nums text-2xl sm:text-3xl font-bold tracking-[0.25em] text-foreground select-all py-1 font-mono">
                    {lastGenerated.keyboardPwd}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant={copied ? "default" : "secondary"}
                      className="h-7 gap-1.5 text-xs font-medium cursor-pointer"
                      onClick={() => copyToClipboard(lastGenerated.keyboardPwd)}
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied!" : "Copy PIN"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-border shadow-none cursor-pointer"
                      onClick={() => {
                        setTab("list");
                        passcodesQuery.refetch();
                      }}
                    >
                      <span>View Active List</span>
                    </Button>
                  </div>
                </div>

                {/* Information Card */}
                <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>How to use this PIN:</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Enter the digits on the physical keypad followed by the <strong>#</strong> key.
                    {lastGenerated.type === 1 && " Expires automatically after 1 use or 6 hours."}
                    {lastGenerated.type === 2 && " Valid permanently once unlocked within the first 24 hours."}
                    {lastGenerated.type === 3 && " Valid during the chosen period window."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: ACTIVE PINS LIST & DELETE ================= */}
        {tab === "list" && (
          <div className="space-y-3 pt-1">
            {/* Header info & Refresh button */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                Registered Passcodes: <strong className="text-foreground tabular-nums">{rawList.length} PINs</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5 border-border shadow-none cursor-pointer"
                onClick={() => passcodesQuery.refetch()}
                disabled={passcodesQuery.isFetching}
              >
                <RefreshCw className={`w-3 h-3 ${passcodesQuery.isFetching ? "motion-safe:animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
            </div>

            {/* Gateway connectivity notice for deletion */}
            {!hasGateway && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span className="text-[11px] leading-tight">
                  This lockbox is standalone (no gateway linked). Passcode delete commands require a connected WiFi Gateway.
                </span>
              </div>
            )}

            {/* Delete result banner */}
            {deleteNotice && (
              <div
                className={`p-2.5 rounded-lg text-xs border ${
                  deleteNotice.ok
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                }`}
              >
                {deleteNotice.msg}
              </div>
            )}

            {/* Table / List View */}
            {passcodesQuery.isLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="w-4 h-4 motion-safe:animate-spin" />
                <span>Loading passcodes from lockbox records...</span>
              </div>
            ) : rawList.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg space-y-1.5">
                <p className="font-medium text-foreground">No passcodes registered</p>
                <p className="text-[11px] text-muted-foreground">
                  Switch to the "Generate PIN" tab to create a new offline passcode.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table className="w-full">
                  <TableHeader className="bg-muted/50 border-b border-border">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-foreground">PIN</TableHead>
                      <TableHead className="text-xs font-semibold text-foreground">Type</TableHead>
                      <TableHead className="text-xs font-semibold text-foreground hidden sm:table-cell">Validity Window</TableHead>
                      <TableHead className="text-xs font-semibold text-foreground text-center">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-foreground w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawList.map((item: PasscodeItem) => {
                      const effectiveExpiry =
                        item.keyboardPwdType === 1
                          ? item.startDate + 6 * 3600 * 1000
                          : item.endDate;

                      const isExpired =
                        effectiveExpiry && currentTimestamp > 0
                          ? effectiveExpiry < currentTimestamp
                          : false;

                      const isConfirming = confirmDeleteId === item.keyboardPwdId;
                      const isDeleting = deletingId === item.keyboardPwdId;

                      return (
                        <TableRow key={item.keyboardPwdId} className="hover:bg-muted/30 border-b border-border/60">
                          {/* PIN Digits */}
                          <TableCell className="py-2.5 font-mono text-xs font-bold tabular-nums text-foreground">
                            <span>{item.keyboardPwd || `#${item.keyboardPwdId}`}</span>
                            {item.keyboardPwdName && (
                              <span className="block text-[10px] text-muted-foreground font-normal truncate max-w-[120px]">
                                {item.keyboardPwdName}
                              </span>
                            )}
                            <span className="block sm:hidden text-[10px] text-muted-foreground/80 font-normal font-sans">
                              {item.keyboardPwdType === 2
                                ? "Permanent"
                                : item.keyboardPwdType === 1
                                  ? formatDate(item.startDate + 6 * 3600 * 1000)
                                  : item.endDate
                                    ? formatDate(item.endDate)
                                    : "—"}
                            </span>
                          </TableCell>

                          {/* Type */}
                          <TableCell className="py-2.5 whitespace-nowrap">
                            {getPasscodeTypeBadge(item.keyboardPwdType)}
                          </TableCell>

                          {/* Validity Window (Desktop) */}
                          <TableCell className="py-2.5 text-xs text-muted-foreground tabular-nums hidden sm:table-cell whitespace-nowrap">
                            {item.keyboardPwdType === 2 ? (
                              <span>Permanent</span>
                            ) : item.keyboardPwdType === 1 ? (
                              <span>Expires: {formatDate(item.startDate + 6 * 3600 * 1000)}</span>
                            ) : item.endDate ? (
                              <span>Expires: {formatDate(item.endDate)}</span>
                            ) : (
                              <span>—</span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-2.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                isExpired ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isExpired ? "bg-zinc-400" : "bg-emerald-500"
                                }`}
                              />
                              <span>{isExpired ? "Expired" : "Active"}</span>
                            </span>
                          </TableCell>

                          {/* Action: Delete */}
                          <TableCell className="py-2.5 text-right whitespace-nowrap">
                            {isConfirming ? (
                              <div className="inline-flex items-center gap-1">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={isDeleting}
                                  className="h-6 px-2 text-[11px] gap-1 cursor-pointer"
                                  onClick={() => handleDeletePasscode(item.keyboardPwdId)}
                                >
                                  {isDeleting ? (
                                    <RefreshCw className="w-3 h-3 motion-safe:animate-spin" />
                                  ) : (
                                    <span>Confirm</span>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isDeleting}
                                  className="h-6 px-1.5 text-[11px] cursor-pointer"
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs gap-1 text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                title="Delete passcode from lockbox via WiFi Gateway"
                                onClick={() => {
                                  setDeleteNotice(null);
                                  setConfirmDeleteId(item.keyboardPwdId);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

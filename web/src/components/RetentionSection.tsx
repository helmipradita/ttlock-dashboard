import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTelemetryTimeline } from "@/api/client";
import type { TelemetrySnapshotItem } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Radio,
  FileDown,
  RefreshCw,
  LineChart,
  Table as TableIcon,
  Eye,
  Battery,
  Loader2,
} from "lucide-react";
import { SignalDot } from "@/components/status";
import { formatDate, relativeTime, isSignalStale } from "@/lib/format";
import { generateRetentionPdfReport } from "@/lib/pdf-retention-report";
import { GatewayMultiSelect } from "@/components/ui/gateway-multi-select";
import { ModernDateSelect } from "@/components/ui/modern-date-select";

interface Props {
  onOpenLock: (lockId: number) => void;
}

const LINE_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
];

export function RetentionSection({ onOpenLock }: Props) {
  const [selectedGatewayIds, setSelectedGatewayIds] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [hoveredPoint, setHoveredPoint] = useState<{
    lockId: number;
    lockName: string;
    gatewayName?: string;
    rssi: number;
    battery: number | null;
    timestamp: number;
    x: number;
    y: number;
  } | null>(null);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // 1. Fetch available gateways and dates metadata (without heavy payload)
  const metaQuery = useQuery({
    queryKey: ["telemetry-meta"],
    queryFn: () => getTelemetryTimeline({ limit: 1 }),
  });

  // 2. Fetch telemetry timeline strictly when both gateway(s) and date are selected
  const isFilterReady = Boolean(selectedGatewayIds.length > 0 && selectedDate);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["telemetry-timeline", selectedGatewayIds, selectedDate],
    queryFn: () =>
      getTelemetryTimeline({
        gatewayIds: selectedGatewayIds,
        date: selectedDate,
        limit: 1000,
      }),
    enabled: isFilterReady,
  });

  const availableGateways = useMemo(() => {
    return metaQuery.data?.gateways ?? data?.gateways ?? [];
  }, [metaQuery.data?.gateways, data?.gateways]);

  const availableDates = useMemo(() => {
    return metaQuery.data?.dates ?? data?.dates ?? [];
  }, [metaQuery.data?.dates, data?.dates]);

  const rawSnapshots = data?.snapshots;

  // Group snapshots by lock_id and sort chronologically (oldest to newest for charting)
  const lockSeries = useMemo(() => {
    if (!isFilterReady || !rawSnapshots) return [];
    const map = new Map<
      number,
      {
        lockId: number;
        lockName: string;
        gatewayName?: string;
        points: { timestamp: number; rssi: number; battery: number | null }[];
      }
    >();

    // Reverse to chronological order (earliest to latest)
    const chrono = [...rawSnapshots].reverse();

    for (const snap of chrono) {
      if (snap.rssi == null) continue;
      const existing = map.get(snap.lock_id) ?? {
        lockId: snap.lock_id,
        lockName: snap.lock_name,
        gatewayName: snap.gateway_name ?? undefined,
        points: [],
      };
      existing.points.push({
        timestamp: snap.recorded_at,
        rssi: snap.rssi,
        battery: snap.battery,
      });
      map.set(snap.lock_id, existing);
    }

    return Array.from(map.values());
  }, [isFilterReady, rawSnapshots]);

  // Distinct sorted timestamps across all points for X-axis scaling
  const allTimestamps = useMemo(() => {
    const set = new Set<number>();
    for (const s of lockSeries) {
      for (const p of s.points) {
        set.add(p.timestamp);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [lockSeries]);

  // Selected gateway names
  const selectedGatewaysInfo = useMemo(() => {
    return selectedGatewayIds.map((id) => {
      const gw = availableGateways.find((g: { gatewayId: number; gatewayName: string | null }) => g.gatewayId === id);
      return {
        gatewayId: id,
        gatewayName: gw?.gatewayName || `Gateway ${id}`,
      };
    });
  }, [availableGateways, selectedGatewayIds]);

  // SVG Chart Dimensions & Scale Math
  const chartWidth = 900;
  const chartHeight = 360;
  const padding = { top: 30, right: 40, bottom: 45, left: 65 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Dynamic RSSI min/max based on data points with safe boundaries
  const { minRssi, maxRssi } = useMemo(() => {
    let min = -100;
    let max = -40;
    for (const s of lockSeries) {
      for (const p of s.points) {
        if (p.rssi < min) min = Math.floor(p.rssi / 10) * 10;
        if (p.rssi > max) max = Math.ceil(p.rssi / 10) * 10;
      }
    }
    return { minRssi: Math.min(-100, min), maxRssi: Math.max(-20, max) };
  }, [lockSeries]);

  function getY(rssi: number): number {
    const clamped = Math.max(minRssi, Math.min(maxRssi, rssi));
    const ratio = (clamped - minRssi) / (maxRssi - minRssi);
    return padding.top + plotHeight * (1 - ratio);
  }

  // Time-proportional X placement with uniform distribution across chronological range
  const { minTime, maxTime } = useMemo(() => {
    if (allTimestamps.length === 0) return { minTime: 0, maxTime: 1 };
    return {
      minTime: allTimestamps[0],
      maxTime: allTimestamps[allTimestamps.length - 1],
    };
  }, [allTimestamps]);

  function getX(timestamp: number): number {
    if (maxTime <= minTime) return padding.left + plotWidth / 2;
    const ratio = (timestamp - minTime) / (maxTime - minTime);
    return padding.left + plotWidth * Math.max(0, Math.min(1, ratio));
  }

  // Generate 5 to 6 evenly spaced time ticks across the chronological day span
  const timeTicks = useMemo(() => {
    if (allTimestamps.length === 0) return [];
    if (allTimestamps.length === 1 || maxTime <= minTime) {
      return [{ timestamp: minTime, x: padding.left + plotWidth / 2 }];
    }
    const count = 6;
    const step = (maxTime - minTime) / (count - 1);
    const ticks: { timestamp: number; x: number }[] = [];
    for (let i = 0; i < count; i++) {
      const ts = Math.round(minTime + i * step);
      ticks.push({
        timestamp: ts,
        x: padding.left + (plotWidth / (count - 1)) * i,
      });
    }
    return ticks;
  }, [allTimestamps, minTime, maxTime, plotWidth, padding.left]);

  // Zone thresholds
  const yStrong = getY(-75); // Strong boundary
  const yMedium = getY(-85); // Medium boundary

  async function handleExportPdf() {
    if (!isFilterReady || selectedGatewayIds.length === 0 || !selectedDate) return;

    try {
      setIsExportingPdf(true);
      await generateRetentionPdfReport({
        gateways: selectedGatewaysInfo,
        date: selectedDate,
        lockSeries,
        snapshots: rawSnapshots || [],
        svgElement: svgRef.current,
      });
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Deck: Mandatory Gateway Selection & Date Filter */}
      <div className="rounded-lg border border-border bg-card text-card-foreground p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <h2 className="text-sm sm:text-base font-semibold tracking-tight">
                Gateway Signal Timeseries Monitor
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a target gateway to chart chronological signal fluctuation across its connected lockboxes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Chart vs Table */}
            <div className="flex items-center border border-border rounded-md p-0.5 bg-muted/30">
              <button
                onClick={() => setViewMode("chart")}
                className={`h-6 px-2.5 text-xs font-medium rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === "chart"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Chart</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`h-6 px-2.5 text-xs font-medium rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Log Table</span>
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              className="h-7 px-2.5 text-xs gap-1.5 border-border shadow-none"
              onClick={() => refetch()}
              title="Refresh database timeseries records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
              <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!isFilterReady || isExportingPdf || lockSeries.length === 0}
              onClick={handleExportPdf}
              className="h-7 px-2.5 text-xs gap-1.5 border-border shadow-none font-medium cursor-pointer"
              title={
                !isFilterReady
                  ? "Select a Target Gateway and Date first to download PDF report"
                  : "Download PDF report containing gateway chart & lockbox telemetry logs"
              }
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-foreground" />
                  <span>Download PDF Report</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Toolbar: Gateway Dropdown (Mandatory Multi-Select) & Date */}
        <div className="flex items-center gap-3.5 flex-wrap text-xs pt-2 border-t border-border/40">
          {/* Gateway Multi-Select */}
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-foreground">Target Gateway(s):</span>
            <GatewayMultiSelect
              gateways={availableGateways}
              selectedIds={selectedGatewayIds}
              onChange={setSelectedGatewayIds}
            />
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground">Date:</span>
            <ModernDateSelect
              dates={availableDates}
              selectedDate={selectedDate}
              onChange={setSelectedDate}
            />
          </div>

          {isFilterReady && (
            <span className="text-xs text-muted-foreground ml-auto hidden sm:inline tabular-nums">
              Showing <strong>{lockSeries.length}</strong> lockbox series ({(rawSnapshots || []).length} data points across {selectedGatewayIds.length} gateway{selectedGatewayIds.length > 1 ? "s" : ""})
            </span>
          )}
        </div>
      </div>

      {/* Main Chart / Table Card */}
      <div className="rounded-lg border border-border bg-card text-card-foreground overflow-hidden p-4 sm:p-5">
        {!isFilterReady ? (
          <div className="py-20 text-center text-xs text-muted-foreground space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-foreground">Select a Gateway & Date to View Signal Chart</p>
            <p className="max-w-md mx-auto text-muted-foreground leading-relaxed">
              Please choose a <strong>Target Gateway</strong> and <strong>Capture Date</strong> from the dropdowns above. Signal telemetry will load specifically for that location.
            </p>
          </div>
        ) : isLoading ? (
          <div className="py-12 space-y-3">
            <Skeleton className="h-64 w-full rounded" />
          </div>
        ) : lockSeries.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">No signal snapshots found for this gateway on the selected date.</p>
            <p className="max-w-md mx-auto text-muted-foreground">
              Run <strong>"Start Live (60s)"</strong> on this gateway or click <strong>"Save Snapshot to DB"</strong> in the top header to capture historical signal telemetry into SQLite.
            </p>
          </div>
        ) : viewMode === "chart" ? (
          <div className="space-y-4">
            {/* Interactive Multi-Line SVG Chart */}
            <div className="relative w-full overflow-x-auto select-none">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto min-w-[700px] text-foreground"
              >
                {/* Background Zone Tints */}
                {/* Strong Zone (-40 to -75) */}
                <rect
                  x={padding.left}
                  y={padding.top}
                  width={plotWidth}
                  height={yStrong - padding.top}
                  fill="rgba(16, 185, 129, 0.05)"
                />
                {/* Medium Zone (-75 to -85) */}
                <rect
                  x={padding.left}
                  y={yStrong}
                  width={plotWidth}
                  height={yMedium - yStrong}
                  fill="rgba(245, 158, 11, 0.05)"
                />
                {/* Weak Zone (-85 to -100) */}
                <rect
                  x={padding.left}
                  y={yMedium}
                  width={plotWidth}
                  height={padding.top + plotHeight - yMedium}
                  fill="rgba(239, 68, 68, 0.05)"
                />

                {/* Horizontal Grid Lines & Y-Axis Labels (Dynamic values) */}
                {[-20, -30, -40, -50, -60, -70, -75, -80, -85, -90, -100]
                  .filter((val) => val >= minRssi && val <= maxRssi)
                  .map((val) => {
                    const y = getY(val);
                    const isZoneLine = val === -75 || val === -85;
                    return (
                      <g key={val}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={padding.left + plotWidth}
                          y2={y}
                          stroke={isZoneLine ? "rgba(150, 150, 150, 0.35)" : "rgba(150, 150, 150, 0.15)"}
                          strokeDasharray={isZoneLine ? "4 4" : undefined}
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 3.5}
                          textAnchor="end"
                          className="text-[10px] fill-muted-foreground font-mono"
                        >
                          {val} dBm
                        </text>
                      </g>
                    );
                  })}

                {/* X-Axis Time Ticks (Evenly spaced chronological intervals) */}
                {timeTicks.map((tick) => {
                  const d = new Date(tick.timestamp);
                  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  return (
                    <g key={tick.timestamp}>
                      <line
                        x1={tick.x}
                        y1={padding.top + plotHeight}
                        x2={tick.x}
                        y2={padding.top + plotHeight + 5}
                        stroke="rgba(150, 150, 150, 0.45)"
                      />
                      <text
                        x={tick.x}
                        y={padding.top + plotHeight + 16}
                        textAnchor="middle"
                        className="text-[10px] fill-muted-foreground font-mono"
                      >
                        {timeStr}
                      </text>
                    </g>
                  );
                })}

                {/* Plot Lines & Dots per Lockbox Series */}
                {lockSeries.map((series, sIdx) => {
                  const color = LINE_COLORS[sIdx % LINE_COLORS.length];
                  const sortedPoints = [...series.points].sort((a, b) => a.timestamp - b.timestamp);
                  if (sortedPoints.length === 0) return null;

                  const pathD = sortedPoints.reduce((acc, pt, i) => {
                    const x = getX(pt.timestamp);
                    const y = getY(pt.rssi);
                    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                  }, "");

                  return (
                    <g key={series.lockId}>
                      {/* Connection Line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all"
                      />

                      {/* Data Point Circles */}
                      {sortedPoints.map((pt, pIdx) => {
                        const cx = getX(pt.timestamp);
                        const cy = getY(pt.rssi);
                        const isHovered =
                          hoveredPoint?.lockId === series.lockId &&
                          hoveredPoint?.timestamp === pt.timestamp;

                        return (
                          <circle
                            key={pIdx}
                            cx={cx}
                            cy={cy}
                            r={isHovered ? 6 : 3.5}
                            fill={color}
                            stroke="var(--background)"
                            strokeWidth="2"
                            className="cursor-pointer transition-transform"
                            onMouseEnter={() =>
                              setHoveredPoint({
                                lockId: series.lockId,
                                lockName: series.lockName,
                                gatewayName: series.gatewayName,
                                rssi: pt.rssi,
                                battery: pt.battery,
                                timestamp: pt.timestamp,
                                x: cx,
                                y: cy,
                              })
                            }
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        );
                      })}
                    </g>
                  );
                })}

                {/* Hover Tooltip inside SVG - pointer-events-none prevents infinite hover flicker */}
                {hoveredPoint && (
                  <g
                    pointerEvents="none"
                    className="pointer-events-none select-none"
                    transform={`translate(${Math.min(chartWidth - 170, Math.max(padding.left, hoveredPoint.x - 75))}, ${Math.max(10, hoveredPoint.y - 75)})`}
                  >
                    <rect
                      width="165"
                      height="64"
                      rx="6"
                      fill="var(--card)"
                      stroke="var(--border)"
                      strokeWidth="1.5"
                      className="shadow-md"
                    />
                    <text x="8" y="16" className="text-[11px] font-semibold fill-foreground">
                      {hoveredPoint.lockName}
                    </text>
                    {hoveredPoint.gatewayName && (
                      <text x="8" y="29" className="text-[9.5px] fill-muted-foreground/80 font-mono">
                        GW: {hoveredPoint.gatewayName}
                      </text>
                    )}
                    <text x="8" y={hoveredPoint.gatewayName ? 43 : 32} className="text-[10px] fill-muted-foreground font-mono">
                      Signal: <tspan className="font-semibold fill-primary">{hoveredPoint.rssi} dBm</tspan>
                      {hoveredPoint.battery != null ? ` • Bat: ${hoveredPoint.battery}%` : ""}
                    </text>
                    <text x="8" y={hoveredPoint.gatewayName ? 56 : 46} className="text-[9px] fill-muted-foreground font-mono">
                      {formatDate(hoveredPoint.timestamp)}
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Lockbox Series Legend & Stats Bar */}
            <div className="pt-4 border-t border-border/40 space-y-2.5">
              <h4 className="text-xs font-semibold text-foreground">Lockboxes in this Gateway:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {lockSeries.map((s, sIdx) => {
                  const color = LINE_COLORS[sIdx % LINE_COLORS.length];
                  const latestPt = s.points[s.points.length - 1];
                  const minP = Math.min(...s.points.map((p) => p.rssi));
                  const maxP = Math.max(...s.points.map((p) => p.rssi));
                  const isStale = isSignalStale(latestPt.timestamp);

                  return (
                    <div
                      key={s.lockId}
                      className="p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col justify-between gap-2.5 text-xs"
                    >
                      {/* Top: Color Indicator + ID + Lock Name */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-semibold text-foreground tabular-nums text-xs">
                              {s.lockId}
                            </span>
                          </div>
                          {s.gatewayName && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground truncate max-w-[110px]" title={s.gatewayName}>
                              {s.gatewayName}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-foreground truncate mt-0.5" title={s.lockName}>
                          {s.lockName}
                        </p>
                      </div>

                      {/* Middle: Signal Icon and Status */}
                      <div className="py-1 border-y border-border/40">
                        <SignalDot
                          rssi={latestPt.rssi}
                          rssiUpdateDate={latestPt.timestamp}
                          gatewayIsOnline={1}
                          size="xs"
                        />
                      </div>

                      {/* Bottom Details: Scanned, Samples & Min/Max */}
                      <div className="space-y-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isStale ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                          <span>
                            Scanned:{" "}
                            <strong className="text-foreground font-normal">
                              {relativeTime(latestPt.timestamp)}
                            </strong>{" "}
                            <span className="text-muted-foreground/60 tabular-nums">
                              ({new Date(latestPt.timestamp).toLocaleTimeString()})
                            </span>
                          </span>
                        </div>

                        <div className="text-[10px] text-muted-foreground/80 tabular-nums flex items-center justify-between pt-0.5">
                          <span>Min/Max: {minP} / {maxP} dBm</span>
                          <span>{s.points.length} samples</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Table View */
          <div>
            <div className="px-4 py-2 bg-muted/20 border-b border-border text-xs text-muted-foreground flex items-center justify-between">
              <span>
                Showing <strong className="text-foreground font-semibold tabular-nums">{(rawSnapshots || []).length}</strong> timeseries logs across <strong>{selectedGatewayIds.length} gateway{selectedGatewayIds.length > 1 ? "s" : ""}</strong>
              </span>
              <span className="text-[11px] text-muted-foreground/80">Sorted newest to oldest</span>
            </div>

            <Table containerClassName="overflow-visible">
              <TableHeader className="bg-muted/40 border-b border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-44 text-xs font-semibold text-foreground">Recorded Time</TableHead>
                  <TableHead className="w-24 text-xs font-semibold text-foreground">Lock ID</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">Lockbox Name / Alias</TableHead>
                  <TableHead className="w-36 text-xs font-semibold text-foreground">Gateway</TableHead>
                  <TableHead className="w-36 text-xs font-semibold text-foreground">Signal (RSSI)</TableHead>
                  <TableHead className="w-20 text-xs font-semibold text-foreground text-center">Battery</TableHead>
                  <TableHead className="w-20 text-xs font-semibold text-foreground text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rawSnapshots || []).map((item: TelemetrySnapshotItem) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 border-b border-border/40">
                    <TableCell className="text-xs py-2.5 whitespace-nowrap">
                      <span className="font-medium text-foreground tabular-nums">
                        {formatDate(item.recorded_at)}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-1.5 tabular-nums">
                        ({relativeTime(item.recorded_at)})
                      </span>
                    </TableCell>

                    <TableCell className="text-xs font-semibold tabular-nums text-foreground py-2.5">
                      {item.lock_id}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-foreground py-2.5 truncate max-w-[200px]">
                      {item.lock_name}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground py-2.5 truncate max-w-[160px]">
                      {item.gateway_name || (item.gateway_id ? `GW ${item.gateway_id}` : "—")}
                    </TableCell>

                    <TableCell className="py-2.5 whitespace-nowrap">
                      <SignalDot
                        rssi={item.rssi}
                        rssiUpdateDate={item.recorded_at}
                        gatewayIsOnline={1}
                        size="xs"
                      />
                    </TableCell>

                    <TableCell className="text-center py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                      {item.battery != null ? (
                        <span className="inline-flex items-center gap-1">
                          <Battery className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{item.battery}%</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell className="text-right py-2.5 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => onOpenLock(item.lock_id)}
                        title="Inspect lockbox specs and unlock history"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

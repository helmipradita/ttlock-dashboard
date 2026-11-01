import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { TelemetrySnapshotItem } from "@/api/types";
import { formatDate } from "@/lib/format";

export interface LockSeriesData {
  lockId: number;
  lockName: string;
  gatewayName?: string;
  points: { timestamp: number; rssi: number; battery?: number | null }[];
}

export interface RetentionPdfParams {
  gateways: {
    gatewayId: number;
    gatewayName: string;
  }[];
  date: string;
  lockSeries: LockSeriesData[];
  snapshots: TelemetrySnapshotItem[];
  svgElement?: SVGSVGElement | null;
}

/**
 * Generate and download an executive-grade Gateway Signal Retention PDF report.
 * Matches the executive HTML preview with KPI tiles, clean signal charts, and color-coded telemetry tables.
 */
export async function generateRetentionPdfReport({
  gateways,
  date,
  lockSeries,
  snapshots,
  svgElement,
}: RetentionPdfParams): Promise<string> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 14;

  // 1. Header Banner (Dark Navy Executive Style)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, currentY, contentWidth, 19, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text("TTLOCK GATEWAY SIGNAL RETENTION REPORT", margin + 6, currentY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `Enterprise Hardware Diagnostics & Telemetry Variance • Generated: ${new Date().toLocaleString()} • Version 1.3.2`,
    margin + 6,
    currentY + 14.5
  );

  // Active Fleet Pill Badge in Header
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(pageWidth - margin - 25, currentY + 4.5, 20, 5.5, 2.5, 2.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.text("ACTIVE FLEET", pageWidth - margin - 22.5, currentY + 8.4);

  currentY += 23;

  // 2. Executive KPI Grid (4 Balanced Cards)
  const strongCount = lockSeries.filter((s) => s.points[s.points.length - 1]?.rssi > -75).length;
  const medCount = lockSeries.filter((s) => {
    const r = s.points[s.points.length - 1]?.rssi;
    return r != null && r <= -75 && r > -85;
  }).length;
  const weakCount = lockSeries.filter((s) => {
    const r = s.points[s.points.length - 1]?.rssi;
    return r != null && r <= -85;
  }).length;
  const healthPct = lockSeries.length > 0 ? Math.round((strongCount / lockSeries.length) * 100) : 0;

  const kpis = [
    {
      label: "TARGET GATEWAYS",
      value: `${gateways.length} Units`,
      sub: "WiFi Bridge Hubs",
      color: [15, 23, 42],
    },
    {
      label: "MONITORED LOCKS",
      value: `${lockSeries.length} Units`,
      sub: `Across ${gateways.length} Stations`,
      color: [15, 23, 42],
    },
    {
      label: "TELEMETRY SAMPLES",
      value: `${snapshots.length} Pts`,
      sub: `Target Date: ${date}`,
      color: [15, 23, 42],
    },
    {
      label: "FLEET HEALTH INDEX",
      value: `${healthPct}% Strong`,
      sub: `${strongCount} Strong • ${medCount} Med • ${weakCount} Weak`,
      color: [22, 163, 74], // emerald-600
    },
  ];

  const cardGap = 3.5;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 16.5;

  kpis.forEach((kpi, idx) => {
    const cx = margin + idx * (cardWidth + cardGap);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(cx, currentY, cardWidth, cardHeight, 1.8, 1.8, "FD");

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(kpi.label, cx + 3.5, currentY + 4.8);

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, cx + 3.5, currentY + 10.5);

    // Subtext
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, cx + 3.5, currentY + 14.5);
  });

  currentY += cardHeight + 4;

  // 3. Selected Gateways Chips Capsule Box (Complete list, Zero Truncation)
  const gwItemsStr = gateways
    .map((g) => `${g.gatewayId} (${g.gatewayName || "GW"})`)
    .join("  •  ");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "normal");
  const gwLines: string[] = doc.splitTextToSize(gwItemsStr, contentWidth - 45);
  const capsuleHeight = Math.max(10, 5 + gwLines.length * 3.8);

  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, currentY, contentWidth, capsuleHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(`Gateways (${gateways.length}):`, margin + 3.5, currentY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59); // slate-800
  gwLines.forEach((line: string, lIdx: number) => {
    doc.text(line, margin + 28, currentY + 5.5 + lIdx * 3.8);
  });

  currentY += capsuleHeight + 5;

  // 4. Chronological Signal Fluctuation Chart Section
  if (svgElement) {
    try {
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute("width", "900");
      clonedSvg.setAttribute("height", "360");
      clonedSvg.style.backgroundColor = "#ffffff";

      // Purge tooltip overlays
      const tooltips = clonedSvg.querySelectorAll("[pointer-events='none'], .shadow-md");
      tooltips.forEach((el) => el.remove());

      // Dark, high-contrast typography and borders
      clonedSvg.querySelectorAll("text").forEach((txt) => {
        txt.setAttribute("fill", "#334155"); // slate-700
        txt.setAttribute("font-family", "Arial, Helvetica, sans-serif");
        txt.setAttribute("font-size", "11px");
      });
      clonedSvg.querySelectorAll("line").forEach((line) => {
        const stroke = line.getAttribute("stroke");
        if (!stroke || stroke.includes("rgba(150, 150, 150")) {
          line.setAttribute("stroke", "#cbd5e1"); // slate-300
          line.setAttribute("stroke-width", "1");
        }
      });

      const xml = new XMLSerializer().serializeToString(clonedSvg);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const image64 = "data:image/svg+xml;base64," + svg64;

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = image64;
      });

      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = 900 * scale;
      canvas.height = 360 * scale;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        const chartImgData = canvas.toDataURL("image/png");
        const pdfChartWidth = contentWidth;
        const pdfChartHeight = 42;

        // Chart Header with Inline Legend
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Chronological Signal Fluctuation (RSSI dBm)", margin, currentY);

        // Chart Legend Dots
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const legX = pageWidth - margin - 75;

        // Strong
        doc.setFillColor(16, 185, 129);
        doc.rect(legX, currentY - 2.5, 2.5, 2.5, "F");
        doc.setTextColor(71, 85, 105);
        doc.text("Strong (> -75)", legX + 3.5, currentY);

        // Medium
        doc.setFillColor(245, 158, 11);
        doc.rect(legX + 24, currentY - 2.5, 2.5, 2.5, "F");
        doc.text("Med (-75..-85)", legX + 27.5, currentY);

        // Weak
        doc.setFillColor(239, 68, 68);
        doc.rect(legX + 50, currentY - 2.5, 2.5, 2.5, "F");
        doc.text("Weak (<-85)", legX + 53.5, currentY);

        currentY += 3.5;

        // Chart Outer Box
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, currentY, pdfChartWidth, pdfChartHeight, 1.8, 1.8, "S");
        doc.addImage(chartImgData, "PNG", margin + 0.8, currentY + 0.8, pdfChartWidth - 1.6, pdfChartHeight - 1.6);

        currentY += pdfChartHeight + 6;
      }
    } catch {
      // ponytail: graceful fallback
    }
  }

  // 5. Connected Lockboxes Summary Table
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Connected Lockboxes Summary (${lockSeries.length} Units)`, margin, currentY);

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Sorted by Signal Strength (Weakest First)", pageWidth - margin, currentY, { align: "right" });
  currentY += 3;

  // Sort by weakest signal first (lowest / most negative RSSI)
  const sortedLockSeries = [...lockSeries].sort((a, b) => {
    const rssiA = a.points[a.points.length - 1]?.rssi ?? 0;
    const rssiB = b.points[b.points.length - 1]?.rssi ?? 0;
    return rssiA - rssiB;
  });

  const summaryRows = sortedLockSeries.map((s) => {
    const latestPt = s.points[s.points.length - 1];
    const minP = Math.min(...s.points.map((p) => p.rssi));
    const maxP = Math.max(...s.points.map((p) => p.rssi));
    const quality =
      latestPt.rssi > -75 ? "Strong" : latestPt.rssi > -85 ? "Medium" : "Weak";
    return [
      String(s.lockId),
      s.lockName,
      s.gatewayName || "-",
      `${latestPt.rssi} dBm`,
      quality,
      `${minP} / ${maxP} dBm`,
      String(s.points.length),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Lock ID", "Lockbox Name / Alias", "Gateway", "Latest RSSI", "Quality", "Min / Max Range", "Samples"]],
    body: summaryRows,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.2,
      cellPadding: 2,
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { fontStyle: "bold" },
      2: { cellWidth: 28 },
      3: { cellWidth: 20 },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: 24 },
      6: { cellWidth: 16, halign: "center" },
    },
    margin: { left: margin, right: margin, bottom: 14 },
    didParseCell: (data) => {
      if (data.section === "body" && summaryRows.length > 0) {
        const item = sortedLockSeries[data.row.index];
        const latestPt = item?.points[item.points.length - 1];

        // Highlight ONLY Column 3 (Latest RSSI) and Column 4 (Quality)
        if (data.column.index === 3 || data.column.index === 4) {
          if (latestPt && latestPt.rssi <= -85) {
            data.cell.styles.textColor = [185, 28, 28]; // red-700
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [254, 226, 226]; // red-100
          } else if (latestPt && latestPt.rssi <= -75) {
            data.cell.styles.textColor = [180, 83, 9]; // amber-700
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [254, 243, 199]; // amber-100
          } else if (latestPt && latestPt.rssi > -75) {
            data.cell.styles.textColor = [21, 128, 61]; // emerald-700
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [220, 252, 231]; // emerald-100
          }
        }
      }
    },
  });

  // 6. Detailed Timeseries Capture Records (Clean Page Break to Page 2+)
  doc.addPage();
  currentY = 14;

  // Header Banner Page 2 (Compact)
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, currentY, contentWidth, 14, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DETAILED TIMESERIES CAPTURE LOGS", margin + 6, currentY + 6.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(148, 163, 184);
  doc.text(`Target Date: ${date} • Chronological Capture Sessions`, margin + 6, currentY + 11);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(7.5);
  doc.text(`${snapshots.length} TOTAL SAMPLES`, pageWidth - margin - 6, currentY + 8.5, { align: "right" });

  currentY += 18;

  // Table Section Title
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Chronological Capture Records", margin, currentY);

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Sorted newest to oldest", pageWidth - margin, currentY, { align: "right" });
  currentY += 3;

  const logRows = snapshots.map((pt, idx) => [
    String(idx + 1),
    formatDate(pt.recorded_at),
    String(pt.lock_id),
    pt.lock_name,
    pt.gateway_name || (pt.gateway_id ? `GW ${pt.gateway_id}` : "-"),
    pt.rssi != null ? `${pt.rssi} dBm` : "-",
    pt.battery != null ? `${pt.battery}%` : "-",
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["#", "Capture Timestamp", "Lock ID", "Lockbox Name / Alias", "Station Gateway", "Signal RSSI", "Battery"]],
    body: logRows,
    theme: "striped",
    headStyles: {
      fillColor: [71, 85, 105], // slate-600
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 32 },
      2: { cellWidth: 20 },
      3: { fontStyle: "bold" },
      4: { cellWidth: 28 },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 18, halign: "center" },
    },
    margin: { left: margin, right: margin, bottom: 14 },
    didParseCell: (data) => {
      if (data.section === "body" && snapshots.length > 0) {
        const item = snapshots[data.row.index];
        // Signal column
        if (data.column.index === 5 && item && item.rssi != null) {
          if (item.rssi <= -85) {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
          } else if (item.rssi <= -75) {
            data.cell.styles.textColor = [180, 83, 9];
          } else {
            data.cell.styles.textColor = [21, 128, 61];
          }
        }
        // Battery alert
        if (data.column.index === 6 && item && item.battery != null) {
          if (item.battery <= 20) {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [254, 226, 226];
          } else if (item.battery >= 80) {
            data.cell.styles.textColor = [21, 128, 61];
            data.cell.styles.fontStyle = "bold";
          }
        }
      }
    },
  });

  // Final Pass: Accurate Footer Numbering across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(148, 163, 184);

    const footerSection = i === 1 ? "Signal Retention Executive Summary" : "Detailed Capture Logs";
    doc.text(
      `TTLOCK IoT Fleet Management System • ${footerSection}`,
      margin,
      pageHeight - 6
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: "right" }
    );
  }

  const gwLabel =
    gateways.length === 1
      ? gateways[0].gatewayName.replace(/[^a-zA-Z0-9_-]/g, "_")
      : `${gateways.length}_gateways`;
  const filename = `ttlock-retention-report-${gwLabel}-${date}.pdf`;
  doc.save(filename);
  return filename;
}

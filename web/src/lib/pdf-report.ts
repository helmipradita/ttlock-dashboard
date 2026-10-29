import { getEnrichedLocks, getGateways, getTopology } from "@/api/client";
import { formatDate } from "@/lib/format";

export interface SignalReportRow {
  lockId: number;
  lockName: string;
  gatewayId: number;
  gatewayName: string;
  rssi: number | null;
  rssiQuality: "Weak" | "Medium" | "Strong" | "No Signal";
}

/**
 * Generate and download a comprehensive TTLOCK hardware telemetry and signal diagnostics PDF report.
 * Dynamically imports jsPDF and jspdf-autotable to prevent initial bundle bloat.
 * Filename is unique: ttlock-signal-report-YYYYMMDD-HHmmss-[uuid].pdf
 */
export async function generateTtlockPdfReport(): Promise<string> {
  const [{ list: locks }, { list: gateways }] = await Promise.all([
    getEnrichedLocks(),
    getGateways(),
  ]);

  // Fetch topology for each gateway in parallel to collect lockbox RSSI signals
  const topologies = await Promise.all(
    gateways.map(async (gw) => {
      try {
        return await getTopology(gw.gatewayId);
      } catch {
        return {
          gateway: { ...gw, rssi: null },
          locks: [],
        };
      }
    })
  );

  // Dynamic import of PDF generator libraries
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stampDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const stampTime = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const stamp = `${stampDate}-${stampTime}`;
  const uuid = (
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 10)
  ).slice(0, 8);
  const reportId = `RPT-${stamp}-${uuid}`;
  const filename = `ttlock-signal-report-${stamp}-${uuid}.pdf`;

  // Filter hardware groups
  const disconnectedGateways = gateways.filter((g) => g.isOnline === 0);
  const unlinkedLocks = locks.filter((l) => l.hasGateway === 0);
  const lowBatteryLocks = locks.filter(
    (l) => l.electricQuantity != null && l.electricQuantity <= 20
  );

  // Map and sort all lockbox signals: WEAKEST signal first at the top
  const signalRows: SignalReportRow[] = [];
  for (const topo of topologies) {
    for (const l of topo.locks) {
      let quality: SignalReportRow["rssiQuality"] = "No Signal";
      if (topo.gateway.isOnline === 0) {
        quality = "No Signal";
      } else if (l.rssi != null) {
        if (l.rssi <= -85) quality = "Weak";
        else if (l.rssi <= -75) quality = "Medium";
        else quality = "Strong";
      }

      signalRows.push({
        lockId: l.lockId,
        lockName: l.lockAlias || l.lockName || String(l.lockId),
        gatewayId: topo.gateway.gatewayId,
        gatewayName: topo.gateway.gatewayName || topo.gateway.networkName || `GW-${topo.gateway.gatewayId}`,
        rssi: l.rssi,
        rssiQuality: quality,
      });
    }
  }

  // Sort: null/no-signal and weakest numeric RSSI (< -85 dBm) prioritized at the top
  signalRows.sort((a, b) => {
    const valA = a.rssi == null ? -999 : a.rssi;
    const valB = b.rssi == null ? -999 : b.rssi;
    return valA - valB;
  });

  const weakSignalCount = signalRows.filter(
    (s) => s.rssi == null || s.rssi <= -85
  ).length;

  // Header Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(24, 24, 27);
  doc.text("TTLOCK Hardware Telemetry & Signal Report", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text(
    `Report ID: ${reportId}   |   Generated: ${formatDate(now.getTime())}   |   Confidential Operations`,
    14,
    22
  );

  // Executive Triage KPI Table
  autoTable(doc, {
    startY: 26,
    head: [
      [
        "Total Gateways",
        "Offline Gateways",
        "Total Lockboxes",
        "No Gateway",
        "Weak Signal (<= -85dBm)",
        "Critical Battery (<= 20%)",
      ],
    ],
    body: [
      [
        String(gateways.length),
        disconnectedGateways.length > 0
          ? `${disconnectedGateways.length} Offline`
          : "0 (All OK)",
        String(locks.length),
        String(unlinkedLocks.length),
        String(weakSignalCount),
        String(lowBatteryLocks.length),
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      halign: "center",
      fontStyle: "bold",
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        if (data.column.index === 1 && disconnectedGateways.length > 0) {
          data.cell.styles.textColor = [220, 38, 38];
        }
        if (data.column.index === 4 && weakSignalCount > 0) {
          data.cell.styles.textColor = [217, 119, 6];
        }
        if (data.column.index === 5 && lowBatteryLocks.length > 0) {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 8;

  // 1. Disconnected Gateways Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(24, 24, 27);
  doc.text(
    `1. Disconnected / Offline Gateways (${disconnectedGateways.length})`,
    14,
    currentY
  );

  const gwOfflineBody =
    disconnectedGateways.length > 0
      ? disconnectedGateways.map((g) => [
          String(g.gatewayId),
          g.networkName || "—",
          g.gatewayMac || "—",
          String(g.lockNum ?? 0),
          "Disconnected",
        ])
      : [["—", "All gateways are connected and operating normally", "—", "—", "Online"]];

  autoTable(doc, {
    startY: currentY + 3,
    head: [["Gateway ID", "Network / SSID", "MAC Address", "Locks Count", "Status"]],
    body: gwOfflineBody,
    theme: "striped",
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    didParseCell: (data) => {
      if (data.section === "body" && disconnectedGateways.length > 0) {
        if (data.column.index === 4) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 2. Lockbox Signal Strength (Weakest First at Top)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(24, 24, 27);
  doc.text(
    `2. Lockbox Signal Strength (Sorted Weakest First, <= -85 dBm Priority)`,
    14,
    currentY
  );

  const signalTableBody =
    signalRows.length > 0
      ? signalRows.map((s) => [
          String(s.lockId),
          s.lockName,
          String(s.gatewayId),
          s.gatewayName,
          s.rssi != null ? `${s.rssi} dBm` : "No Signal",
          s.rssiQuality,
        ])
      : [["—", "No signal data available", "—", "—", "—", "—"]];

  autoTable(doc, {
    startY: currentY + 3,
    head: [
      [
        "Lock ID",
        "Lock Name / Alias",
        "Gateway ID",
        "Gateway SSID",
        "Signal (dBm)",
        "Quality Status",
      ],
    ],
    body: signalTableBody,
    theme: "striped",
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    didParseCell: (data) => {
      if (data.section === "body" && signalRows.length > 0) {
        const item = signalRows[data.row.index];
        if (data.column.index === 4 || data.column.index === 5) {
          if (item && (item.rssi == null || item.rssi <= -85)) {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = "bold";
          } else if (item && item.rssi != null && item.rssi <= -75) {
            data.cell.styles.textColor = [217, 119, 6]; // Amber
          } else if (item && item.rssi != null && item.rssi > -75) {
            data.cell.styles.textColor = [22, 101, 52]; // Green
          }
        }
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check page overflow before starting next section
  if (currentY > 240) {
    doc.addPage();
    currentY = 16;
  }

  // 3. Disconnected Lockboxes (No Gateway Linked)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(24, 24, 27);
  doc.text(
    `3. Disconnected Lockboxes (No Gateway Associated: ${unlinkedLocks.length})`,
    14,
    currentY
  );

  const unlinkedTableBody =
    unlinkedLocks.length > 0
      ? unlinkedLocks.map((l) => [
          String(l.lockId),
          l.lockAlias || l.lockName || "—",
          l.lockMac || "—",
          l.electricQuantity != null ? `${l.electricQuantity}%` : "—",
          l.lastOpen ? formatDate(l.lastOpen) : "Never",
        ])
      : [["—", "All lockboxes are associated with a gateway", "—", "—", "—"]];

  autoTable(doc, {
    startY: currentY + 3,
    head: [["Lock ID", "Lock Name / Alias", "MAC Address", "Battery", "Last Open Record"]],
    body: unlinkedTableBody,
    theme: "striped",
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  if (currentY > 240) {
    doc.addPage();
    currentY = 16;
  }

  // 4. Critical Battery Warnings (<= 20%)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(24, 24, 27);
  doc.text(
    `4. Critical Battery Lockboxes (<= 20%: ${lowBatteryLocks.length})`,
    14,
    currentY
  );

  const lowBatBody =
    lowBatteryLocks.length > 0
      ? lowBatteryLocks.map((l) => [
          String(l.lockId),
          l.lockAlias || l.lockName || "—",
          `${l.electricQuantity}%`,
          l.hasGateway === 1 ? "Yes" : "No",
          l.lastOpen ? formatDate(l.lastOpen) : "Never",
        ])
      : [["—", "All lockbox batteries are above 20%", "—", "—", "—"]];

  autoTable(doc, {
    startY: currentY + 3,
    head: [["Lock ID", "Name / Alias", "Battery Level", "Gateway Linked", "Last Open Record"]],
    body: lowBatBody,
    theme: "striped",
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    didParseCell: (data) => {
      if (data.section === "body" && lowBatteryLocks.length > 0 && data.column.index === 2) {
        data.cell.styles.textColor = [220, 38, 38];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  if (currentY > 240) {
    doc.addPage();
    currentY = 16;
  }

  // 5. Complete Gateway Operational Directory
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(24, 24, 27);
  doc.text(`5. Gateway Operational Directory (${gateways.length})`, 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [["Gateway ID", "Network / SSID", "MAC Address", "Locks Count", "Status"]],
    body: gateways.map((g) => [
      String(g.gatewayId),
      g.networkName || "—",
      g.gatewayMac || "—",
      String(g.lockNum ?? 0),
      g.isOnline === 1 ? "Online" : "Offline",
    ]),
    theme: "striped",
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const gw = gateways[data.row.index];
        if (gw && gw.isOnline === 1) {
          data.cell.styles.textColor = [22, 101, 52];
        } else {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // Footer page numbering across all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(161, 161, 170);
    doc.text(
      `TTLOCK Hardware Report | ${reportId} | Page ${i} of ${pageCount}`,
      14,
      290
    );
  }

  // Save with unique local filename
  doc.save(filename);
  return filename;
}

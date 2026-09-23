let topoCanvas, topoCtx;
let topoAnimFrame = null;
let topoPollInterval = null;
let topoGatewayId = null;
let topoNodes = [];
let topoEdges = [];
let topoDragging = null;
let topoPan = { x: 0, y: 0 };
let topoZoom = 1;
let topoLastMouse = { x: 0, y: 0 };
let topoIsPanning = false;
let topoDashOffset = 0;
let topoPositionsSaved = false;

const TOPO_NODE_W = 110;
const TOPO_NODE_H = 50;
const TOPO_LOCK_W = 90;
const TOPO_LOCK_H = 40;
const TOPO_GW_COLOR = "#6366f1";
const TOPO_LOCK_COLOR = "#334155";
const TOPO_BG = "#0f172a";

function rssiColor(rssi) {
  if (rssi === null || rssi === undefined) return "#475569";
  if (rssi > -75) return "#4ade80";
  if (rssi > -85) return "#f59e0b";
  return "#ef4444";
}

function rssiLabelShort(rssi) {
  if (rssi === null || rssi === undefined) return "?";
  if (rssi > -75) return "Strong";
  if (rssi > -85) return "Medium";
  return "Weak";
}

function positionKey() {
  return `topo_pos_${topoGatewayId}`;
}

function loadPositions() {
  try {
    return JSON.parse(localStorage.getItem(positionKey())) || {};
  } catch { return {}; }
}

function savePositions() {
  const pos = {};
  topoNodes.forEach(n => { pos[n.id] = { x: n.x, y: n.y }; });
  localStorage.setItem(positionKey(), JSON.stringify(pos));
}

function resetTopologyPositions() {
  localStorage.removeItem(positionKey());
  autoLayout();
  savePositions();
}

function autoLayout() {
  const gw = topoNodes.find(n => n.type === "gateway");
  if (!gw) return;
  gw.x = 0;
  gw.y = 0;

  const locks = topoNodes.filter(n => n.type === "lock");
  const count = locks.length;
  if (count === 0) return;

  const radius = Math.max(160, count * 18);
  locks.forEach((lock, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    lock.x = Math.cos(angle) * radius;
    lock.y = Math.sin(angle) * radius;
  });
}

function startTopology(gatewayId) {
  topoGatewayId = gatewayId;
  topoCanvas = document.getElementById("topology-canvas");
  topoCtx = topoCanvas.getContext("2d");

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  topoCanvas.addEventListener("mousedown", onMouseDown);
  topoCanvas.addEventListener("mousemove", onMouseMove);
  topoCanvas.addEventListener("mouseup", onMouseUp);
  topoCanvas.addEventListener("mouseleave", onMouseUp);
  topoCanvas.addEventListener("wheel", onWheel, { passive: false });

  topoPan = { x: topoCanvas.width / 2, y: topoCanvas.height / 2 };
  topoZoom = 1;
  topoDashOffset = 0;

  fetchTopology();
  topoPollInterval = setInterval(fetchTopology, 1000);
  topoAnimFrame = requestAnimationFrame(animateTopo);
}

function stopTopology() {
  if (topoAnimFrame) { cancelAnimationFrame(topoAnimFrame); topoAnimFrame = null; }
  if (topoPollInterval) { clearInterval(topoPollInterval); topoPollInterval = null; }
  window.removeEventListener("resize", resizeCanvas);
  topoCanvas?.removeEventListener("mousedown", onMouseDown);
  topoCanvas?.removeEventListener("mousemove", onMouseMove);
  topoCanvas?.removeEventListener("mouseup", onMouseUp);
  topoCanvas?.removeEventListener("mouseleave", onMouseUp);
  topoCanvas?.removeEventListener("wheel", onWheel);
  topoNodes = [];
  topoEdges = [];
}

function resizeCanvas() {
  if (!topoCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = topoCanvas.getBoundingClientRect();
  topoCanvas.width = rect.width * dpr;
  topoCanvas.height = rect.height * dpr;
  topoCtx.scale(dpr, dpr);
}

async function fetchTopology() {
  if (!topoGatewayId) return;
  try {
    const res = await fetch(`/api/gateways/${topoGatewayId}/topology`);
    if (!res.ok) return;
    const data = await res.json();
    applyTopologyData(data);
  } catch {}
}

function applyTopologyData(data) {
  const gw = data.gateway || {};
  const locks = data.locks || [];
  const savedPos = loadPositions();

  const gwId = `gw_${gw.gatewayId}`;
  const existingGw = topoNodes.find(n => n.id === gwId);

  if (!existingGw) {
    topoNodes.push({
      id: gwId,
      type: "gateway",
      label: gw.networkName || `GW-${gw.gatewayId}`,
      sublabel: gw.gatewayMac || "",
      online: gw.isOnline,
      x: 0,
      y: 0,
    });
  } else {
    existingGw.online = gw.isOnline;
  }

  const existingIds = new Set(topoNodes.filter(n => n.type === "lock").map(n => n.id));
  const newLockIds = new Set(locks.map(l => `lock_${l.lockId}`));

  topoNodes = topoNodes.filter(n => {
    if (n.type === "gateway") return true;
    return newLockIds.has(n.id);
  });

  locks.forEach(l => {
    const lockId = `lock_${l.lockId}`;
    const existing = topoNodes.find(n => n.id === lockId);
    if (existing) {
      existing.rssi = l.rssi;
      existing.lockName = l.lockName || l.lockAlias || `${l.lockId}`;
    } else {
      topoNodes.push({
        id: lockId,
        type: "lock",
        label: l.lockName || l.lockAlias || `${l.lockId}`,
        rssi: l.rssi,
        x: 0,
        y: 0,
      });
    }
  });

  topoEdges = locks.map(l => ({
    source: gwId,
    target: `lock_${l.lockId}`,
    rssi: l.rssi,
  }));

  const hasSaved = Object.keys(savedPos).length > 0;
  if (!hasSaved && topoNodes.length > 0) {
    autoLayout();
  }

  topoNodes.forEach(n => {
    if (savedPos[n.id]) {
      n.x = savedPos[n.id].x;
      n.y = savedPos[n.id].y;
    } else if (!existingGw || (n.type === "lock" && !existingIds.has(n.id))) {
      const gwNode = topoNodes.find(nn => nn.type === "gateway");
      if (gwNode) {
        const angle = Math.random() * Math.PI * 2;
        const r = 120 + Math.random() * 60;
        n.x = gwNode.x + Math.cos(angle) * r;
        n.y = gwNode.y + Math.sin(angle) * r;
      }
    }
  });
}

// ── Rendering ──
function animateTopo() {
  drawTopo();
  topoDashOffset -= 0.6;
  topoAnimFrame = requestAnimationFrame(animateTopo);
}

function drawTopo() {
  if (!topoCtx) return;
  const ctx = topoCtx;
  const rect = topoCanvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  ctx.save();
  ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = TOPO_BG;
  ctx.fillRect(0, 0, w, h);

  drawGrid(ctx, w, h);

  ctx.save();
  ctx.translate(topoPan.x, topoPan.y);
  ctx.scale(topoZoom, topoZoom);

  topoEdges.forEach(edge => {
    const src = topoNodes.find(n => n.id === edge.source);
    const tgt = topoNodes.find(n => n.id === edge.target);
    if (!src || !tgt) return;

    const color = rssiColor(edge.rssi);

    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = topoDashOffset;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    const mx = (src.x + tgt.x) / 2;
    const my = (src.y + tgt.y) / 2;

    ctx.fillStyle = "#0f172a";
    const rssiText = `${edge.rssi ?? "?"}dB`;
    const tw = ctx.measureText(rssiText).width + 10;
    ctx.beginPath();
    ctx.roundRect(mx - tw / 2, my - 10, tw, 20, 4);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(rssiText, mx, my);
  });

  topoNodes.forEach(node => {
    if (node.type === "gateway") {
      drawGatewayNode(ctx, node);
    } else {
      drawLockNode(ctx, node);
    }
  });

  ctx.restore();
  ctx.restore();
}

function drawGrid(ctx, w, h) {
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  const step = 40 * topoZoom;
  const ox = topoPan.x % step;
  const oy = topoPan.y % step;
  for (let x = ox; x < w; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = oy; y < h; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
}

function drawGatewayNode(ctx, node) {
  const w = TOPO_NODE_W;
  const h = TOPO_NODE_H;
  const x = node.x - w / 2;
  const y = node.y - h / 2;

  ctx.shadowColor = node.online === 1 ? "rgba(99,102,241,0.4)" : "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fillStyle = node.online === 1 ? TOPO_GW_COLOR : "#64748b";
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "white";
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(node.label, node.x, node.y - 6);

  ctx.font = "10px -apple-system, sans-serif";
  ctx.globalAlpha = 0.7;
  ctx.fillText(node.sublabel || "Gateway", node.x, node.y + 10);
  ctx.globalAlpha = 1;
}

function drawLockNode(ctx, node) {
  const w = TOPO_LOCK_W;
  const h = TOPO_LOCK_H;
  const x = node.x - w / 2;
  const y = node.y - h / 2;
  const color = rssiColor(node.rssi);

  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fillStyle = TOPO_LOCK_COLOR;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const displayName = node.label.length > 12 ? node.label.slice(0, 11) + "…" : node.label;
  ctx.fillText(displayName, node.x, node.y - 5);

  ctx.font = "9px -apple-system, sans-serif";
  ctx.fillStyle = color;
  ctx.fillText(rssiLabelShort(node.rssi), node.x, node.y + 10);
}

// ── Interaction ──
function screenToWorld(sx, sy) {
  return {
    x: (sx - topoPan.x) / topoZoom,
    y: (sy - topoPan.y) / topoZoom,
  };
}

function hitTest(sx, sy) {
  const { x, y } = screenToWorld(sx, sy);
  for (let i = topoNodes.length - 1; i >= 0; i--) {
    const n = topoNodes[i];
    const w = n.type === "gateway" ? TOPO_NODE_W : TOPO_LOCK_W;
    const h = n.type === "gateway" ? TOPO_NODE_H : TOPO_LOCK_H;
    if (x >= n.x - w / 2 && x <= n.x + w / 2 && y >= n.y - h / 2 && y <= n.y + h / 2) {
      return n;
    }
  }
  return null;
}

function onMouseDown(e) {
  const rect = topoCanvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  const hit = hitTest(sx, sy);
  if (hit) {
    topoDragging = hit;
    topoDragging._offsetX = (sx - topoPan.x) / topoZoom - hit.x;
    topoDragging._offsetY = (sy - topoPan.y) / topoZoom - hit.y;
    topoCanvas.style.cursor = "grabbing";
  } else {
    topoIsPanning = true;
    topoLastMouse = { x: e.clientX, y: e.clientY };
    topoCanvas.style.cursor = "grabbing";
  }
}

function onMouseMove(e) {
  const rect = topoCanvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  if (topoDragging) {
    const { x, y } = screenToWorld(sx, sy);
    topoDragging.x = x - topoDragging._offsetX;
    topoDragging.y = y - topoDragging._offsetY;
    return;
  }

  if (topoIsPanning) {
    topoPan.x += e.clientX - topoLastMouse.x;
    topoPan.y += e.clientY - topoLastMouse.y;
    topoLastMouse = { x: e.clientX, y: e.clientY };
    return;
  }

  const hit = hitTest(sx, sy);
  topoCanvas.style.cursor = hit ? "grab" : "default";
}

function onMouseUp() {
  if (topoDragging) {
    savePositions();
    topoDragging = null;
  }
  topoIsPanning = false;
  topoCanvas.style.cursor = "grab";
}

function onWheel(e) {
  e.preventDefault();
  const rect = topoCanvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  const worldX = (sx - topoPan.x) / topoZoom;
  const worldY = (sy - topoPan.y) / topoZoom;

  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  topoZoom = Math.max(0.2, Math.min(4, topoZoom * delta));

  topoPan.x = sx - worldX * topoZoom;
  topoPan.y = sy - worldY * topoZoom;
}

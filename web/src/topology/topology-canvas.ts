export interface TopoNode {
  id: string;
  type: "gateway" | "lock";
  label: string;
  sublabel?: string;
  online?: number;
  rssi?: number | null;
  x: number;
  y: number;
}

export interface TopoEdge {
  source: string;
  target: string;
  rssi: number | null;
}

export interface TopoState {
  nodes: TopoNode[];
  edges: TopoEdge[];
  pan: { x: number; y: number };
  zoom: number;
  dashOffset: number;
  dragging: TopoNode | null;
  dragOffset: { x: number; y: number };
  isPanning: boolean;
  lastMouse: { x: number; y: number };
}

const NODE_W = 110;
const NODE_H = 50;
const LOCK_W = 90;
const LOCK_H = 40;
const GW_COLOR = "#6366f1";

function isDarkMode(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

function getThemeColors() {
  const dark = isDarkMode();
  return {
    bg: dark ? "#18181b" : "#f8fafc",
    grid: dark ? "#27272a" : "#e2e8f0",
    lockBg: dark ? "#27272a" : "#ffffff",
    lockText: dark ? "#f4f4f5" : "#0f172a",
    edgeBg: dark ? "#18181b" : "#ffffff",
    edgeText: dark ? "#e4e4e7" : "#334155",
  };
}

export type TopologyData = {
  gateway: {
    gatewayId: number;
    gatewayMac?: string;
    networkName?: string;
    isOnline?: number;
    rssi?: number | null;
  };
  locks: {
    lockId: number;
    lockName?: string;
    lockAlias?: string;
    rssi?: number | null;
  }[];
};

export function rssiColor(rssi: number | null | undefined): string {
  if (rssi == null) return "#475569";
  if (rssi > -75) return "#4ade80";
  if (rssi > -85) return "#f59e0b";
  return "#ef4444";
}

function rssiLabelShort(rssi: number | null | undefined): string {
  if (rssi == null) return "?";
  if (rssi > -75) return "Strong";
  if (rssi > -85) return "Medium";
  return "Weak";
}

function loadPositions(gatewayId: number): Record<string, { x: number; y: number }> {
  try {
    return JSON.parse(localStorage.getItem(`topo_pos_${gatewayId}`) ?? "{}");
  } catch {
    return {};
  }
}

function savePositions(gatewayId: number, nodes: TopoNode[]) {
  const pos: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) pos[n.id] = { x: n.x, y: n.y };
  localStorage.setItem(`topo_pos_${gatewayId}`, JSON.stringify(pos));
}

function autoLayout(nodes: TopoNode[]) {
  const gw = nodes.find((n) => n.type === "gateway");
  if (!gw) return;
  gw.x = 0;
  gw.y = 0;
  const locks = nodes.filter((n) => n.type === "lock");
  const count = locks.length;
  if (count === 0) return;
  const radius = Math.max(160, count * 18);
  locks.forEach((lock, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    lock.x = Math.cos(angle) * radius;
    lock.y = Math.sin(angle) * radius;
  });
}

export function createTopologyState(): TopoState {
  return {
    nodes: [],
    edges: [],
    pan: { x: 0, y: 0 },
    zoom: 1,
    dashOffset: 0,
    dragging: null,
    dragOffset: { x: 0, y: 0 },
    isPanning: false,
    lastMouse: { x: 0, y: 0 },
  };
}

export function applyTopologyData(
  s: TopoState,
  gatewayId: number,
  data: TopologyData
): void {
  const gw = data.gateway;
  const gwId = `gw_${gw.gatewayId}`;
  const existingGw = s.nodes.find((n) => n.id === gwId);

  if (!existingGw) {
    s.nodes.push({
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

  const newLockIds = new Set(data.locks.map((l) => `lock_${l.lockId}`));
  const existingLockIds = new Set(
    s.nodes.filter((n) => n.type === "lock").map((n) => n.id)
  );

  s.nodes = s.nodes.filter((n) => n.type === "gateway" || newLockIds.has(n.id));

  for (const l of data.locks) {
    const id = `lock_${l.lockId}`;
    const existing = s.nodes.find((n) => n.id === id);
    const lockLabel = l.lockAlias || l.lockName || String(l.lockId);
    if (existing) {
      existing.rssi = l.rssi;
      existing.label = lockLabel;
    } else {
      s.nodes.push({
        id,
        type: "lock",
        label: lockLabel,
        rssi: l.rssi,
        x: 0,
        y: 0,
      });
    }
  }

  s.edges = data.locks.map((l) => ({
    source: gwId,
    target: `lock_${l.lockId}`,
    rssi: l.rssi ?? null,
  }));

  const savedPos = loadPositions(gatewayId);
  const hasSaved = Object.keys(savedPos).length > 0;
  if (!hasSaved && s.nodes.length > 0) autoLayout(s.nodes);

  for (const n of s.nodes) {
    if (savedPos[n.id]) {
      n.x = savedPos[n.id].x;
      n.y = savedPos[n.id].y;
    } else if (n.type === "lock" && !existingLockIds.has(n.id)) {
      const gwNode = s.nodes.find((nn) => nn.type === "gateway");
      if (gwNode) {
        const angle = Math.random() * Math.PI * 2;
        const r = 120 + Math.random() * 60;
        n.x = gwNode.x + Math.cos(angle) * r;
        n.y = gwNode.y + Math.sin(angle) * r;
      }
    }
  }
}

function screenToWorld(s: TopoState, sx: number, sy: number) {
  return {
    x: (sx - s.pan.x) / s.zoom,
    y: (sy - s.pan.y) / s.zoom,
  };
}

function hitTest(s: TopoState, sx: number, sy: number): TopoNode | null {
  const { x, y } = screenToWorld(s, sx, sy);
  for (let i = s.nodes.length - 1; i >= 0; i--) {
    const n = s.nodes[i];
    const w = n.type === "gateway" ? NODE_W : LOCK_W;
    const h = n.type === "gateway" ? NODE_H : LOCK_H;
    if (x >= n.x - w / 2 && x <= n.x + w / 2 && y >= n.y - h / 2 && y <= n.y + h / 2) {
      return n;
    }
  }
  return null;
}

// ── Drawing ──

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pan: { x: number; y: number },
  zoom: number
) {
  const colors = getThemeColors();
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  const step = 40 * zoom;
  const ox = pan.x % step;
  const oy = pan.y % step;
  for (let x = ox; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = oy; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawGatewayNode(ctx: CanvasRenderingContext2D, node: TopoNode) {
  const x = node.x - NODE_W / 2;
  const y = node.y - NODE_H / 2;
  ctx.shadowColor =
    node.online === 1 ? "rgba(99,102,241,0.4)" : "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(x, y, NODE_W, NODE_H, 10);
  ctx.fillStyle = node.online === 1 ? GW_COLOR : "#64748b";
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

function drawLockNode(ctx: CanvasRenderingContext2D, node: TopoNode) {
  const colors = getThemeColors();
  const x = node.x - LOCK_W / 2;
  const y = node.y - LOCK_H / 2;
  const color = rssiColor(node.rssi);
  ctx.shadowColor = isDarkMode() ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.roundRect(x, y, LOCK_W, LOCK_H, 8);
  ctx.fillStyle = colors.lockBg;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = colors.lockText;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const display =
    node.label.length > 13 ? node.label.slice(0, 12) + "…" : node.label;
  ctx.fillText(display, node.x, node.y - 5);
  ctx.font = "9px -apple-system, sans-serif";
  ctx.fillStyle = color;
  ctx.fillText(rssiLabelShort(node.rssi), node.x, node.y + 10);
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: TopoState
) {
  const colors = getThemeColors();
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, w, h, state.pan, state.zoom);

  ctx.save();
  ctx.translate(state.pan.x, state.pan.y);
  ctx.scale(state.zoom, state.zoom);

  // Edges
  for (const edge of state.edges) {
    const src = state.nodes.find((n) => n.id === edge.source);
    const tgt = state.nodes.find((n) => n.id === edge.target);
    if (!src || !tgt) continue;
    const color = rssiColor(edge.rssi);
    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = state.dashOffset;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    // Label
    const mx = (src.x + tgt.x) / 2;
    const my = (src.y + tgt.y) / 2;
    const text = `${edge.rssi ?? "?"}dB`;
    ctx.font = "11px -apple-system, sans-serif";
    const tw = ctx.measureText(text).width + 10;
    ctx.fillStyle = colors.edgeBg;
    ctx.beginPath();
    ctx.roundRect(mx - tw / 2, my - 10, tw, 20, 4);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = colors.edgeText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, mx, my);
  }

  // Nodes
  for (const node of state.nodes) {
    if (node.type === "gateway") drawGatewayNode(ctx, node);
    else drawLockNode(ctx, node);
  }

  ctx.restore();
  ctx.restore();
}

// ── Event handlers ──

function onMouseDown(s: TopoState, e: MouseEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const hit = hitTest(s, sx, sy);
  if (hit) {
    s.dragging = hit;
    s.dragOffset = {
      x: (sx - s.pan.x) / s.zoom - hit.x,
      y: (sy - s.pan.y) / s.zoom - hit.y,
    };
    canvas.style.cursor = "grabbing";
  } else {
    s.isPanning = true;
    s.lastMouse = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = "grabbing";
  }
}

function onMouseMove(s: TopoState, e: MouseEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  if (s.dragging) {
    const { x, y } = screenToWorld(s, sx, sy);
    s.dragging.x = x - s.dragOffset.x;
    s.dragging.y = y - s.dragOffset.y;
    return;
  }
  if (s.isPanning) {
    s.pan.x += e.clientX - s.lastMouse.x;
    s.pan.y += e.clientY - s.lastMouse.y;
    s.lastMouse = { x: e.clientX, y: e.clientY };
    return;
  }
  const hit = hitTest(s, sx, sy);
  canvas.style.cursor = hit ? "grab" : "default";
}

function onWheel(s: TopoState, e: WheelEvent, canvas: HTMLCanvasElement) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const worldX = (sx - s.pan.x) / s.zoom;
  const worldY = (sy - s.pan.y) / s.zoom;
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  s.zoom = Math.max(0.2, Math.min(4, s.zoom * delta));
  s.pan.x = sx - worldX * s.zoom;
  s.pan.y = sy - worldY * s.zoom;
}

// ── Public API ──

function fitCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(rect.width, 1);
  const h = Math.max(rect.height, 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
}

export function initCanvas(
  canvas: HTMLCanvasElement,
  gatewayId: number
): {
  destroy: () => void;
  resetLayout: () => void;
  getState: () => TopoState;
  applyData: (data: TopologyData) => void;
} {
  const ctx = canvas.getContext("2d")!;
  fitCanvas(canvas);

  const state = createTopologyState();
  const dpr = window.devicePixelRatio || 1;
  state.pan = { x: canvas.width / dpr / 2, y: canvas.height / dpr / 2 };

  let animFrame: number;
  function animate() {
    state.dashOffset -= 0.6;
    drawFrame(ctx, canvas, state);
    animFrame = requestAnimationFrame(animate);
  }
  animFrame = requestAnimationFrame(animate);

  const handleMouseDown = (e: MouseEvent) => onMouseDown(state, e, canvas);
  const handleMouseMove = (e: MouseEvent) => onMouseMove(state, e, canvas);
  const handleMouseUp = () => {
    if (state.dragging) {
      savePositions(gatewayId, state.nodes);
      state.dragging = null;
    }
    state.isPanning = false;
    canvas.style.cursor = "grab";
  };
  const handleWheel = (e: WheelEvent) => onWheel(state, e, canvas);

  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mouseleave", handleMouseUp);
  canvas.addEventListener("wheel", handleWheel, { passive: false });

  const ro = new ResizeObserver(() => {
    fitCanvas(canvas);
  });
  ro.observe(canvas);

  return {
    destroy() {
      cancelAnimationFrame(animFrame);
      ro.disconnect();
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
    },
    resetLayout() {
      localStorage.removeItem(`topo_pos_${gatewayId}`);
      autoLayout(state.nodes);
      savePositions(gatewayId, state.nodes);
    },
    getState() {
      return state;
    },
    applyData(data: TopologyData) {
      applyTopologyData(state, gatewayId, data);
    },
  };
}

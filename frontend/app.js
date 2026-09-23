const API = "";
let countdownInterval = null;
let countdownSeconds = 300;
let currentRecordsPage = 1;
let currentLockId = null;
let sortKey = null;
let sortDir = "asc";
let enrichedLocks = [];
let isPaused = false;

let allGateways = [];
let gwSortKey = null;
let gwSortDir = "asc";

const LOCK_RECORD_TYPES = {
  1: "App", 2: "Parking Lock", 3: "Gateway", 4: "Passcode",
  5: "Parking Lock Raise", 6: "Parking Lock Lower", 7: "IC Card",
  8: "Fingerprint", 9: "Wristband", 10: "Mechanical Key",
  11: "Bluetooth", 12: "Gateway Unlock", 29: "Unexpected",
  30: "Door Magnet Close", 31: "Door Magnet Open", 32: "Open From Inside",
  33: "Lock by Fingerprint", 34: "Lock by Passcode", 35: "Lock by IC Card",
  36: "Lock by Mechanical Key", 37: "Remote Control", 44: "Tamper Alert",
  45: "Auto Lock", 46: "Unlock by Key", 47: "Lock by Key",
  48: "Invalid Passcode"
};

function formatDate(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}:${mi}:${ss}`;
}

function relativeTime(ts) {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function batteryHtml(level) {
  if (level === undefined || level === null) return "-";
  let icon = "🔋", cls = "battery-high";
  if (level <= 20) { icon = "🪫"; cls = "battery-low"; }
  else if (level <= 50) { cls = "battery-mid"; }
  return `<span class="battery ${cls}"><span class="battery-icon">${icon}</span> ${level}%</span>`;
}

function rssiLabel(rssi) {
  if (rssi === null || rssi === undefined) return "-";
  let label = "Weak", cls = "rssi-weak";
  if (rssi > -75) { label = "Strong"; cls = "rssi-strong"; }
  else if (rssi > -85) { label = "Medium"; cls = "rssi-medium"; }
  return `<span class="${cls}">${rssi} (${label})</span>`;
}

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Tab Navigation ──
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.remove("hidden");
    });
  });
}

// ── Auth ──
async function loadAuthStatus() {
  try {
    const data = await apiFetch("/api/auth/status");
    const accountEl = document.getElementById("account-info");
    const errorEl = document.getElementById("auth-error");

    if (data.authenticated) {
      accountEl.classList.remove("hidden");
      errorEl.classList.add("hidden");
      document.getElementById("account-username").textContent = data.username;
      document.getElementById("status-dot").className = "status-dot dot-green";
      document.getElementById("token-status-text").textContent = "Active";
      document.getElementById("token-expires").textContent = formatDate(data.expiresAt);
    } else {
      accountEl.classList.add("hidden");
      errorEl.classList.remove("hidden");
    }
  } catch (err) {
    document.getElementById("account-info").classList.add("hidden");
    document.getElementById("auth-error").classList.remove("hidden");
  }
}

// ── Lock Search ──
async function searchLock(page) {
  const input = document.getElementById("lock-id-input");
  const lockId = input.value.trim();
  if (!lockId) return;

  currentLockId = lockId;
  currentRecordsPage = page || 1;

  const searchBtn = document.getElementById("search-btn");
  searchBtn.disabled = true;
  searchBtn.textContent = "Loading...";

  try {
    const [detail, records, gatewayData] = await Promise.all([
      apiFetch(`/api/locks/${lockId}`),
      apiFetch(`/api/locks/${lockId}/records?pageNo=${currentRecordsPage}&pageSize=10`),
      apiFetch(`/api/locks/${lockId}/gateway`).catch(() => ({ list: [] })),
    ]);

    renderLockDetail(detail, gatewayData);
    renderRecords(records);
  } catch (err) {
    alert("Failed to fetch lock data: " + err.message);
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Search";
  }
}

function renderLockDetail(d, gatewayData) {
  const el = document.getElementById("lock-detail");
  el.classList.remove("hidden");
  document.getElementById("lock-name").textContent = d.lockName || "-";
  document.getElementById("lock-alias").textContent = d.lockAlias || "-";
  document.getElementById("lock-battery").innerHTML = batteryHtml(d.electricQuantity);
  document.getElementById("lock-mac").textContent = d.lockMac || "-";
  document.getElementById("lock-id-display").textContent = d.lockId || "-";
  document.getElementById("lock-model").textContent = d.modelNum || "-";
  document.getElementById("lock-firmware").textContent = d.firmwareRevision || "-";

  const gwEl = document.getElementById("lock-gateway-info");
  if (d.hasGateway === 1 && gatewayData?.list?.length > 0) {
    const gw = gatewayData.list[0];
    const onlineStatus = gw.isOnline === 1
      ? '<span class="badge badge-success">Online</span>'
      : gw.isOnline === 0
        ? '<span class="badge badge-fail">Offline</span>'
        : '<span class="badge">Unknown</span>';

    gwEl.innerHTML = `
      <div class="gateway-detail">
        <span><strong>ID:</strong> ${gw.gatewayId}</span>
        <span><strong>MAC:</strong> ${gw.gatewayMac || "-"}</span>
        <span><strong>WiFi:</strong> ${gw.networkName || "-"}</span>
        <span><strong>Status:</strong> ${onlineStatus}</span>
        <span><strong>Signal:</strong> ${rssiLabel(gw.rssi)}</span>
        <span><strong>Locks:</strong> ${gw.lockNum ?? "-"}</span>
      </div>
    `;
  } else if (d.hasGateway === 0) {
    gwEl.innerHTML = '<span class="no-gateway">No Gateway Connected</span>';
  } else {
    gwEl.innerHTML = '<span class="no-gateway">Gateway info unavailable</span>';
  }
}

// ── Lock Records ──
function renderRecords(data) {
  const section = document.getElementById("lock-records-section");
  section.classList.remove("hidden");
  const tbody = document.getElementById("records-body");
  tbody.innerHTML = "";

  const totalEl = document.getElementById("records-total");
  if (totalEl) totalEl.textContent = `(${data.total || 0} records)`;

  if (!data.list || data.list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9ca3af;">No records found</td></tr>';
    return;
  }

  data.list.forEach((r, i) => {
    const tr = document.createElement("tr");
    const rowNum = (data.pageNo - 1) * data.pageSize + i + 1;
    const method = LOCK_RECORD_TYPES[r.recordType] || `Type ${r.recordType}`;
    const status = r.success === 1
      ? '<span class="badge badge-success">Success</span>'
      : '<span class="badge badge-fail">Failed</span>';

    tr.innerHTML = `
      <td>${rowNum}</td>
      <td>${formatDate(r.lockDate)}</td>
      <td>${method}</td>
      <td>${r.username || "-"}</td>
      <td>${status}</td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(data.pages, data.pageNo);
}

function renderPagination(totalPages, currentPage) {
  const el = document.getElementById("records-pagination");
  el.innerHTML = "";
  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "‹ Prev";
  prevBtn.disabled = currentPage <= 1;
  prevBtn.onclick = () => searchLock(currentPage - 1);
  el.appendChild(prevBtn);

  if (totalPages <= 9) {
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement("button");
      btn.textContent = p;
      if (p === currentPage) btn.className = "active";
      btn.onclick = () => searchLock(p);
      el.appendChild(btn);
    }
  } else {
    const pages = new Set();
    pages.add(1);
    pages.add(2);
    for (let p = Math.max(3, currentPage - 1); p <= Math.min(totalPages - 2, currentPage + 1); p++) {
      pages.add(p);
    }
    pages.add(totalPages - 1);
    pages.add(totalPages);

    const sorted = [...pages].sort((a, b) => a - b);
    let prev = 0;
    sorted.forEach(p => {
      if (prev && p - prev > 1) {
        const dots = document.createElement("span");
        dots.textContent = " ... ";
        dots.className = "pagination-dots";
        el.appendChild(dots);
      }
      const btn = document.createElement("button");
      btn.textContent = p;
      if (p === currentPage) btn.className = "active";
      btn.onclick = () => searchLock(p);
      el.appendChild(btn);
      prev = p;
    });
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next ›";
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.onclick = () => searchLock(currentPage + 1);
  el.appendChild(nextBtn);
}

// ── All Lockboxes ──
let allLocksData = [];

async function loadAllLocks() {
  const loadingEl = document.getElementById("locks-loading");
  const tbody = document.getElementById("locks-body");

  loadingEl.classList.remove("hidden");
  tbody.innerHTML = "";

  try {
    const data = await apiFetch("/api/locks/enriched");
    allLocksData = data.list || [];
    enrichedLocks = allLocksData;

    updateLockCount(enrichedLocks.length);
    renderAllLocks();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;">Error: ${err.message}</td></tr>`;
  } finally {
    loadingEl.classList.add("hidden");
  }
}

function updateLockCount(count) {
  document.getElementById("locks-count").textContent = `All Lockboxes (${count} locks)`;
}

function sortLocks(key) {
  if (sortKey === key) {
    sortDir = sortDir === "asc" ? "desc" : "asc";
  } else {
    sortKey = key;
    sortDir = "asc";
  }

  enrichedLocks.sort((a, b) => {
    let valA, valB;
    switch (key) {
      case "lockId":
        valA = a.lockId || 0;
        valB = b.lockId || 0;
        return sortDir === "asc" ? valA - valB : valB - valA;
      case "lockName":
        valA = (a.lockName || "").toLowerCase();
        valB = (b.lockName || "").toLowerCase();
        break;
      case "lockAlias":
        valA = (a.lockAlias || "").toLowerCase();
        valB = (b.lockAlias || "").toLowerCase();
        break;
      case "lastOpen":
        valA = a.lastOpen || 0;
        valB = b.lastOpen || 0;
        return sortDir === "asc" ? valA - valB : valB - valA;
      case "electricQuantity":
        valA = a.electricQuantity || 0;
        valB = b.electricQuantity || 0;
        return sortDir === "asc" ? valA - valB : valB - valA;
      case "hasGateway":
        valA = a.hasGateway || 0;
        valB = b.hasGateway || 0;
        return sortDir === "asc" ? valA - valB : valB - valA;
      default:
        return 0;
    }
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  renderAllLocks();
  updateSortArrows();
}

function updateSortArrows() {
  const keys = ["lockId", "lockName", "lockAlias", "lastOpen", "electricQuantity", "hasGateway"];
  keys.forEach(k => {
    const el = document.getElementById(`sort-${k}`);
    if (el) {
      if (sortKey === k) {
        el.textContent = sortDir === "asc" ? " ▲" : " ▼";
      } else {
        el.textContent = "";
      }
    }
  });
}

function renderAllLocks() {
  const tbody = document.getElementById("locks-body");
  tbody.innerHTML = "";

  enrichedLocks.forEach(lock => {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.onclick = () => {
      document.getElementById("lock-id-input").value = lock.lockId;
      searchLock(1);
      document.getElementById("section-history").scrollIntoView({ behavior: "smooth" });
    };

    tr.innerHTML = `
      <td><strong>${lock.lockId}</strong></td>
      <td>${lock.lockName || "-"}</td>
      <td>${lock.lockAlias || "-"}</td>
      <td>${relativeTime(lock.lastOpen)}</td>
      <td>${batteryHtml(lock.electricQuantity)}</td>
      <td>${lock.hasGateway === 1 ? "Yes" : "No"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Lockboxes Refresh ──
function togglePause() {
  isPaused = !isPaused;
  const btn = document.getElementById("pause-btn");
  const countdownEl = document.getElementById("countdown");

  if (isPaused) {
    btn.innerHTML = "▶ Resume";
    countdownEl.textContent = "Paused";
  } else {
    btn.innerHTML = "⏸ Pause";
    updateCountdownDisplay();
  }
}

function forceRefreshAll() {
  countdownSeconds = 300;
  isPaused = false;
  document.getElementById("pause-btn").innerHTML = "⏸ Pause";
  loadAllLocks();
}

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownSeconds = 300;
  updateCountdownDisplay();

  countdownInterval = setInterval(() => {
    if (isPaused) return;
    countdownSeconds--;
    updateCountdownDisplay();
    if (countdownSeconds <= 0) {
      countdownSeconds = 300;
      loadAllLocks();
    }
  }, 1000);
}

function updateCountdownDisplay() {
  const min = Math.floor(countdownSeconds / 60);
  const sec = countdownSeconds % 60;
  document.getElementById("countdown").textContent =
    `Next refresh: ${min}:${sec.toString().padStart(2, "0")}`;
}

// ── Gateways ──
async function loadGateways() {
  const loadingEl = document.getElementById("gateways-loading");
  const tbody = document.getElementById("gateways-body");
  loadingEl.classList.remove("hidden");
  tbody.innerHTML = "";

  try {
    const data = await apiFetch("/api/gateways");
    allGateways = data.list || [];
    document.getElementById("gateways-count").textContent = `All Gateways (${allGateways.length})`;
    renderGateways();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;">Error: ${err.message}</td></tr>`;
  } finally {
    loadingEl.classList.add("hidden");
  }
}

function sortGateways(key) {
  if (gwSortKey === key) {
    gwSortDir = gwSortDir === "asc" ? "desc" : "asc";
  } else {
    gwSortKey = key;
    gwSortDir = "asc";
  }

  allGateways.sort((a, b) => {
    let valA, valB;
    switch (key) {
      case "gatewayId":
        valA = a.gatewayId || 0;
        valB = b.gatewayId || 0;
        return gwSortDir === "asc" ? valA - valB : valB - valA;
      case "gatewayMac":
        valA = (a.gatewayMac || "").toLowerCase();
        valB = (b.gatewayMac || "").toLowerCase();
        break;
      case "lockNum":
        valA = a.lockNum || 0;
        valB = b.lockNum || 0;
        return gwSortDir === "asc" ? valA - valB : valB - valA;
      case "isOnline":
        valA = a.isOnline || 0;
        valB = b.isOnline || 0;
        return gwSortDir === "asc" ? valA - valB : valB - valA;
      default:
        return 0;
    }
    if (valA < valB) return gwSortDir === "asc" ? -1 : 1;
    if (valA > valB) return gwSortDir === "asc" ? 1 : -1;
    return 0;
  });

  renderGateways();
  ["gatewayId", "gatewayMac", "lockNum", "isOnline"].forEach(k => {
    const el = document.getElementById(`sort-gw-${k}`);
    if (el) el.textContent = gwSortKey === k ? (gwSortDir === "asc" ? " ▲" : " ▼") : "";
  });
}

function renderGateways() {
  const tbody = document.getElementById("gateways-body");
  tbody.innerHTML = "";

  if (allGateways.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;">No gateways found</td></tr>';
    return;
  }

  allGateways.forEach(gw => {
    const tr = document.createElement("tr");
    const onlineBadge = gw.isOnline === 1
      ? '<span class="badge badge-success">Online</span>'
      : gw.isOnline === 0
        ? '<span class="badge badge-fail">Offline</span>'
        : '<span class="badge">Unknown</span>';
    const version = gw.gatewayVersion === 1 ? "G1" : gw.gatewayVersion === 2 ? "G2" : `-`;

    tr.innerHTML = `
      <td><strong>${gw.gatewayId}</strong></td>
      <td>${gw.gatewayMac || "-"}</td>
      <td>${gw.networkName || "-"}</td>
      <td>${gw.lockNum ?? 0}</td>
      <td>${onlineBadge}</td>
      <td>
        <button class="btn-topology" onclick="openTopology(${gw.gatewayId}, '${gw.networkName || gw.gatewayId}', ${gw.lockNum || 0})">
          Topology (${gw.lockNum || 0})
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Topology ──
async function openTopology(gatewayId, gatewayName, lockNum) {
  const overlay = document.getElementById("topology-overlay");
  overlay.classList.remove("hidden");
  document.getElementById("topology-gateway-name").textContent = `${gatewayName} — ${lockNum} locks`;
  startTopology(gatewayId);
}

function closeTopology() {
  document.getElementById("topology-overlay").classList.add("hidden");
  stopTopology();
}

function resetTopologyLayout() {
  resetTopologyPositions();
}

// ── Init ──
document.getElementById("lock-id-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchLock(1);
});

(async function init() {
  initTabs();
  await loadAuthStatus();
  await Promise.all([loadAllLocks(), loadGateways()]);
  startCountdown();
})();

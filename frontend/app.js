const API_BASE = ""; 

let currentFile = null;
let allLeads = [];

// ===== PAGE NAVIGATION =====
function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  document.getElementById("nav-" + name).classList.add("active");

  const titles = {
    dashboard: ["Dashboard", "Overview of all lead activity"],
    upload: ["Upload Excel", "Upload and merge Excel files"],
    leads: ["All Leads", "Browse and filter your lead database"],
    history: ["Upload History", "Track all past file uploads"],
  };
  document.getElementById("page-title").textContent = titles[name][0];
  document.getElementById("page-subtitle").textContent = titles[name][1];

  if (name === "dashboard") loadDashboard();
  if (name === "leads") loadLeads();
  if (name === "history") loadHistory();

  return false;
}

// ===== API HEALTH CHECK =====
async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (res.ok) {
      document.querySelector(".dot").classList.add("online");
      document.getElementById("api-status-text").textContent = "API Connected";
    } else {
      throw new Error();
    }
  } catch {
    document.querySelector(".dot").classList.add("offline");
    document.getElementById("api-status-text").textContent = "API Offline";
  }
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard`);
    const data = await res.json();

    document.getElementById("total-leads-count").textContent = data.total_leads;

    // Status counts for stat cards
    const statusBreak = data.status_breakdown || {};
    document.getElementById("assigned-count").textContent =
      (statusBreak["Assigned to Branch"] || statusBreak["assigned to branch"] || 0);
    document.getElementById("first-call-count").textContent =
      (statusBreak["First Call"] || statusBreak["first call"] || 0);
    document.getElementById("not-interested-count").textContent =
      (statusBreak["Customer Not Interested"] || statusBreak["customer not interested"] || 0);

    // Render charts
    renderBarChart("status-chart", statusBreak, getStatusColor);
    renderBarChart("source-chart", data.source_breakdown || {}, getSourceColor);
    renderBarChart("employee-chart", data.employee_breakdown || {}, () => "default");
  } catch (e) {
    console.error("Dashboard load error", e);
  }
}

function renderBarChart(containerId, dataObj, colorFn) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const entries = Object.entries(dataObj).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    container.innerHTML = '<p style="color:var(--text3);font-size:0.82rem;text-align:center;padding:1rem">No data yet</p>';
    return;
  }

  const max = Math.max(...entries.map(e => e[1]));
  container.innerHTML = entries.map(([label, count]) => {
    const pct = max > 0 ? (count / max) * 100 : 0;
    const colorClass = colorFn(label);
    return `
      <div class="bar-row">
        <span class="bar-label" title="${label}">${label}</span>
        <div class="bar-track">
          <div class="bar-fill ${colorClass}" style="width:${pct}%"></div>
        </div>
        <span class="bar-count">${count}</span>
      </div>`;
  }).join("");
}

function getStatusColor(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("first call")) return "first-call";
  if (s.includes("followup")) return "followup";
  if (s.includes("rate")) return "rate-call";
  if (s.includes("assigned")) return "assigned";
  if (s.includes("appointment")) return "appointment";
  if (s.includes("not interested")) return "not-interested";
  if (s.includes("dropped")) return "dropped";
  if (s.includes("need time")) return "need-time";
  return "default";
}

function getSourceColor(source) {
  const s = (source || "").toLowerCase();
  if (s === "whatsapp") return "source-w";
  if (s === "justdial") return "source-j";
  return "default";
}

// ===== FILE UPLOAD =====
function onDragOver(e) {
  e.preventDefault();
  document.getElementById("upload-box").classList.add("dragover");
}
function onDragLeave() {
  document.getElementById("upload-box").classList.remove("dragover");
}
function onDrop(e) {
  e.preventDefault();
  document.getElementById("upload-box").classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
}
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) setFile(file);
}
function setFile(file) {
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    showToast("❌ Only .xlsx and .xls files are supported.", "error");
    return;
  }
  currentFile = file;
  document.getElementById("file-name").textContent = file.name;
  document.getElementById("file-size").textContent = formatSize(file.size);
  document.getElementById("file-preview").classList.remove("hidden");
  document.getElementById("upload-result").classList.add("hidden");
}
function cancelUpload() {
  currentFile = null;
  document.getElementById("file-preview").classList.add("hidden");
  document.getElementById("file-input").value = "";
}

async function uploadFile() {
  if (!currentFile) return;

  document.getElementById("file-preview").classList.add("hidden");
  document.getElementById("upload-progress").classList.remove("hidden");
  document.getElementById("upload-result").classList.add("hidden");

  const formData = new FormData();
  formData.append("file", currentFile);

  try {
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    document.getElementById("upload-progress").classList.add("hidden");
    const resultEl = document.getElementById("upload-result");
    resultEl.classList.remove("hidden");

    if (res.ok && data.success) {
      resultEl.className = "upload-result success";
      resultEl.innerHTML = `
        <strong>${data.message}</strong>
        <div class="result-stats">
          <div class="result-stat">📄 Total Rows: ${data.total_rows}</div>
          <div class="result-stat">✅ Inserted: ${data.inserted}</div>
          <div class="result-stat">🔄 Duplicates Skipped: ${data.duplicates_skipped}</div>
          <div class="result-stat">⚠️ Errors: ${data.errors}</div>
        </div>`;
      // Show the Download Merged Excel button
      document.getElementById("download-section").classList.remove("hidden");
      showToast(`✅ ${data.inserted} leads added, ${data.duplicates_skipped} duplicates skipped`);
    } else {
      resultEl.className = "upload-result error";
      resultEl.innerHTML = `<strong>❌ Error:</strong> ${data.detail || JSON.stringify(data)}`;
    }
  } catch (err) {
    document.getElementById("upload-progress").classList.add("hidden");
    const resultEl = document.getElementById("upload-result");
    resultEl.className = "upload-result error";
    resultEl.innerHTML = `<strong>❌ Connection Error:</strong> Cannot reach the API. Is the backend running?`;
    resultEl.classList.remove("hidden");
  }

  currentFile = null;
  document.getElementById("file-input").value = "";
}

// ===== LEADS TABLE =====
async function loadLeads() {
  const search = document.getElementById("search-input").value;
  const status = document.getElementById("status-filter").value;
  const source = document.getElementById("source-filter").value;

  let url = `${API_BASE}/api/leads?limit=200`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;
  if (source) url += `&lead_source=${encodeURIComponent(source)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    allLeads = data.leads || [];
    renderLeadsTable(allLeads, data.total);
  } catch {
    document.getElementById("leads-tbody").innerHTML =
      '<tr><td colspan="8" class="empty-cell">❌ Cannot load leads. Is the API running?</td></tr>';
  }
}

function renderLeadsTable(leads, total) {
  const tbody = document.getElementById("leads-tbody");
  const footer = document.getElementById("table-footer");

  if (!leads.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No leads found. Upload an Excel file to get started.</td></tr>';
    footer.textContent = "";
    return;
  }

  tbody.innerHTML = leads.map((l, i) => `
    <tr>
      <td style="color:var(--text3)">${i + 1}</td>
      <td>${sourceTag(l.lead_source)}</td>
      <td>${l.employee_name || "—"}</td>
      <td style="color:var(--text);font-weight:500">${l.customer_name || "—"}</td>
      <td style="font-family:monospace;color:var(--accent2)">${l.phone || "—"}</td>
      <td>${statusBadge(l.status)}</td>
      <td title="${l.remarks || ""}">${l.remarks ? l.remarks.substring(0, 30) + (l.remarks.length > 30 ? "…" : "") : "—"}</td>
      <td style="color:var(--text3)">${formatDate(l.uploaded_at)}</td>
    </tr>`).join("");

  footer.textContent = `Showing ${leads.length} of ${total} leads`;
}

function filterLeads() {
  clearTimeout(window._filterTimer);
  window._filterTimer = setTimeout(loadLeads, 300);
}

function statusBadge(status) {
  if (!status) return '<span class="badge badge-gray">—</span>';
  const s = status.toLowerCase();
  if (s.includes("assigned")) return `<span class="badge badge-green">${status}</span>`;
  if (s.includes("first call") || s.includes("followup") || s.includes("appointment")) return `<span class="badge badge-blue">${status}</span>`;
  if (s.includes("not interested") || s.includes("dropped")) return `<span class="badge badge-red">${status}</span>`;
  if (s.includes("rate") || s.includes("need time")) return `<span class="badge badge-yellow">${status}</span>`;
  return `<span class="badge badge-gray">${status}</span>`;
}

function sourceTag(source) {
  if (!source) return "—";
  return source;
}

// ===== UPLOAD HISTORY =====
async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard`);
    const data = await res.json();
    const logs = data.upload_history || [];
    const tbody = document.getElementById("history-tbody");

    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No uploads yet.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map((log, i) => `
      <tr>
        <td style="color:var(--text3)">${i + 1}</td>
        <td style="color:var(--text);font-weight:500">📄 ${log.filename}</td>
        <td>${log.total_rows}</td>
        <td style="color:var(--green);font-weight:600">${log.inserted}</td>
        <td style="color:var(--yellow)">${log.duplicates}</td>
        <td style="color:${log.errors > 0 ? 'var(--red)' : 'var(--text3)'}">${log.errors}</td>
        <td style="color:var(--text3)">${formatDate(log.uploaded_at)}</td>
      </tr>`).join("");
  } catch {
    document.getElementById("history-tbody").innerHTML =
      '<tr><td colspan="7" class="empty-cell">❌ Cannot load history.</td></tr>';
  }
}

// ===== CLEAR ALL =====
async function clearAllLeads() {
  if (!confirm("⚠️ Are you sure you want to delete ALL leads and upload history? This cannot be undone.")) return;
  try {
    await fetch(`${API_BASE}/api/leads/all`, { method: "DELETE" });
    showToast("🗑 All data cleared.");
    loadDashboard();
  } catch {
    showToast("❌ Failed to clear data.", "error");
  }
}

// ===== HELPERS =====
function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function showToast(msg, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast";
  toast.classList.remove("hidden");
  if (type === "error") toast.style.borderColor = "var(--red)";
  else toast.style.borderColor = "var(--accent)";
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add("hidden"), 4000);
}

// ===== INIT =====
window.addEventListener("load", () => {
  checkApiHealth();
  loadDashboard();
  setInterval(checkApiHealth, 30000);
});

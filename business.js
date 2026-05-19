const STORE_KEY = "jdTvsBusinessSuiteV1";
const SESSION_KEY = "jdTvsCurrentUserV1";
const THEME_KEY = "jdTvsThemeV1";
const LOGO_PATH = "jd-logo.jpeg";
const TABLE_PAGE_SIZE = 25;
const defaultTheme = {
  green: "#0f7668",
  deep: "#10251f",
  gold: "#d6a92f",
  bg: "#f5f7f4",
  panel: "#ffffff",
  mode: "3d",
  effect: "3d",
  glass: "glass",
};

const roleLabels = {
  admin: "Admin",
  accounts: "Accounts",
  parts_manager: "Parts Manager",
  sales: "Sales",
  rto: "RTO / Insurance",
};

const navIcons = {
  dashboard: "⌂",
  admin: "⚙",
  sales: "₹",
  rto: "R",
  customer: "+",
  parts: "P",
  lists: "≡",
  settings: "◉",
};

const bikeCategories = {
  "TVS Raider 125": "Motorcycle",
  "TVS Apache RTR 160": "Motorcycle",
  "TVS Apache RTR 180": "Motorcycle",
  "TVS Apache RTR 200": "Motorcycle",
  "TVS Ronin": "Motorcycle",
  "TVS Sport": "Motorcycle",
  "TVS Radeon": "Motorcycle",
  "TVS Star City Plus": "Motorcycle",
  "TVS Jupiter": "Scooter",
  "TVS Ntorq": "Scooter",
  "TVS Zest": "Scooter",
  "TVS iQube": "Electric Scooter",
  "TVS XL100": "Moped",
};

function bikeCategoryMap() {
  return { ...bikeCategories, ...(state.customBikeCategories || {}) };
}

function bikeModelOptions() {
  return Object.keys(bikeCategoryMap()).map((name) => `<option value="${name}">${name}</option>`).join("");
}

const pageAccess = {
  "dashboard": ["admin", "accounts", "parts_manager", "sales", "rto"],
  "admin": ["admin"],
  "sales": ["admin", "accounts", "sales"],
  "rto": ["admin", "accounts", "rto", "sales"],
  "customer": ["admin", "accounts", "sales", "rto"],
  "parts": ["admin", "parts_manager"],
  "lists": ["admin", "accounts", "parts_manager", "sales", "rto"],
  "settings": ["admin", "accounts", "parts_manager", "sales", "rto"],
};

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = loadState();
let toastTimer = null;
let notificationTimer = null;
let editingCustomerId = null;
let deferredInstallPrompt = null;
let serverSyncReady = false;
let serverSyncTimer = null;
let serverSyncUpdatedAt = 0;
let serverSyncBusy = false;
applyTheme();

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(dateText, months) {
  const date = new Date(`${dateText || today()}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function dateDiffFromToday(dateText) {
  if (!dateText) return null;
  return new Date(`${dateText}T00:00:00`) - new Date(`${today()}T00:00:00`);
}

function insuranceDisplayStatus(item = {}) {
  const expiryText = item.expiryDate || item.nextDate;
  const diff = dateDiffFromToday(expiryText);
  if (diff !== null && diff < 0) return "Expired";
  if (item.company && item.policyNo && expiryText) return "Completed";
  return "Pending";
}

function money(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function numberValue(selector, root = document) {
  return Number(qs(selector, root)?.value || 0);
}

function textValue(selector, root = document) {
  return (qs(selector, root)?.value || "").trim();
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function same(value, other) {
  return normalize(value) === normalize(other);
}

function withinLastDays(dateText, days = 7) {
  if (!dateText) return true;
  const date = new Date(`${dateText}T00:00:00`);
  const start = new Date(`${today()}T00:00:00`);
  start.setDate(start.getDate() - (days - 1));
  return date >= start;
}

function visibleRowsForUser(rows, dateKey = "date") {
  if (currentUser()?.role === "admin") return rows;
  return rows.filter((item) => withinLastDays(item[dateKey]));
}

function loadState() {
  const saved = localStorage.getItem(STORE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    return normalizeState(data);
  }
  const demoSaleId = createId();
  const demoCustomerId = createId();
  const demoRtoId = createId();
  const demoInsuranceId = createId();
  const demoPartId = createId();
  const demoPartSaleId = createId();
  return normalizeState({
    employees: [
      { id: createId(), name: "Admin", username: "admin", password: "1234", mobile: "9876500001", idNo: "EMP-001", address: "JD Auto Sales, Main Road", joinDate: today(), role: "admin", active: true },
      { id: createId(), name: "Accounts", username: "accounts", password: "1234", mobile: "9876500002", idNo: "EMP-002", address: "JD Auto Sales, Accounts Desk", joinDate: today(), role: "accounts", active: true },
      { id: createId(), name: "Parts Manager", username: "parts", password: "1234", mobile: "9876500003", idNo: "EMP-003", address: "JD Auto Sales, Parts Counter", joinDate: today(), role: "parts_manager", active: true },
      { id: createId(), name: "Sales Executive", username: "sales", password: "1234", mobile: "9876500004", idNo: "EMP-004", address: "JD Auto Sales, Sales Desk", joinDate: today(), role: "sales", active: true },
      { id: createId(), name: "RTO Staff", username: "rto", password: "1234", mobile: "9876500005", idNo: "EMP-005", address: "JD Auto Sales, RTO Desk", joinDate: today(), role: "rto", active: true },
    ],
    distributors: [
      { id: createId(), name: "TVS Main Distributor", mobile: "9876512345", total: 50000, paid: 30000, balance: 20000, notes: "Monthly stock payment demo" },
    ],
    distributorTransactions: [],
    bikes: [
      { id: createId(), model: "TVS Raider 125", category: "Motorcycle", frameNo: "MD625RAIDER002", engineNo: "AE8R002", colour: "Red", keyNo: "K101", price: 98000 },
      { id: createId(), model: "TVS Jupiter", category: "Scooter", frameNo: "MD625JUPITER002", engineNo: "AE8J002", colour: "Blue", keyNo: "K102", price: 86000 },
    ],
    sales: [
      { id: demoSaleId, customer: "Rahul Kumar", guardian: "Suresh Kumar", idNo: "DL-2026-001", mobile: "9876543210", address: "Station Road, Patna", invoice: "VN001", bike: "TVS Raider 125", frameNo: "MD625RAIDER001", engineNo: "AE8R001", paymentType: "Finance", financeCompany: "TVS Credit", emiMonths: 12, downPayment: 20000, total: 98000, paid: 20000, pending: 78000, discount: 0, date: today() },
    ],
    customers: [
      { id: demoCustomerId, saleId: demoSaleId, name: "Rahul Kumar", mobile: "9876543210", invoice: "VN001", bikeNo: "MD625RAIDER001", paid: 20000, pending: 78000, date: today() },
      { id: createId(), name: "Amit Singh", mobile: "9123456780", invoice: "VN002", bikeNo: "BR06AB1234", paid: 5000, pending: 3500, date: today() },
    ],
    rto: [
      { id: demoRtoId, saleId: demoSaleId, customer: "Rahul Kumar", mobile: "9876543210", invoice: "VN001", frameNo: "MD625RAIDER001", status: "Pending", rtoName: "Patna RTO", registrationNo: "", date: today() },
    ],
    insurance: [
      { id: demoInsuranceId, saleId: demoSaleId, customer: "Rahul Kumar", mobile: "9876543210", invoice: "VN001", frameNo: "MD625RAIDER001", status: "Completed", company: "ICICI Lombard", policyNo: "POL-2026-001", expenses: 1200, expiryDate: addMonths(today(), 1), date: today() },
    ],
    parts: [
      { id: demoPartId, name: "Engine Oil", commonName: "Oil", partNo: "OIL-900", stock: 18, low: 5, purchase: 280, sale: 360, rackNo: "R1" },
      { id: createId(), name: "Brake Shoe", commonName: "Brake", partNo: "BRK-110", stock: 8, low: 4, purchase: 140, sale: 220, rackNo: "R2" },
      { id: createId(), name: "Spark Plug", commonName: "Plug", partNo: "M7011010", stock: 24, low: 6, purchase: 78, sale: 118, rackNo: "R3" },
    ],
    partSales: [
      { id: demoPartSaleId, partId: demoPartId, partNo: "OIL-900", invoice: "VN001", registrationNo: "", name: "Engine Oil", commonName: "Oil", rackNo: "R1", qty: 2, buyQty: 0, amount: 720, mrp: 360, date: today(), mode: "sell", returnedQty: 0 },
    ],
    mechanics: [],
  labourLines: [],
  serviceRequests: [],
  notifications: [],
  importantPdfs: [],
  });
}

function normalizeState(data) {
  const defaults = ["employees", "distributors", "distributorTransactions", "bikes", "sales", "customers", "rto", "insurance", "parts", "partSales", "mechanics", "labourLines", "serviceRequests", "notifications", "paymentLogs", "importantPdfs"];
  defaults.forEach((key) => { if (!Array.isArray(data[key])) data[key] = []; });
  if (!data.customBikeCategories || typeof data.customBikeCategories !== "object") data.customBikeCategories = {};
  if (!data.employees.some((employee) => employee.role === "admin")) {
    data.employees.unshift({ id: createId(), name: "Admin", username: "admin", password: "1234", role: "admin", active: true });
  }
  defaults.forEach((key) => {
    data[key] = data[key].map((item) => ({ id: item.id || createId(), ...item }));
  });
  data.customers.forEach((customer) => {
    if (customer.saleId) return;
    const sale = data.sales.find((item) =>
      same(item.invoice, customer.invoice) &&
      same(item.mobile, customer.mobile) &&
      Number(item.pending || 0) === Number(customer.pending || 0)
    );
    if (sale) customer.saleId = sale.id;
  });
  data.distributors.forEach((item) => {
    item.name = item.name || "Distributor";
    item.balance = Math.max(Number(item.total || 0) - Number(item.paid || 0), 0);
    item.extra = Math.max(Number(item.paid || 0) - Number(item.total || 0), 0);
  });
  if (!data.distributorTransactions.length) {
    data.distributors.forEach((item) => {
      if (Number(item.total || 0) > 0) {
        data.distributorTransactions.push({ id: createId(), distributorId: item.id, date: item.date || today(), type: "bill", amount: Number(item.total || 0), notes: item.notes || "Opening total" });
      }
      if (Number(item.paid || 0) > 0) {
        data.distributorTransactions.push({ id: createId(), distributorId: item.id, date: item.date || today(), type: "paid", amount: Number(item.paid || 0), notes: item.notes || "Opening paid" });
      }
    });
  }
  syncDistributorTotals(data);
  return data;
}

function syncDistributorTotals(target = state) {
  (target.distributors || []).forEach((item) => {
    const entries = (target.distributorTransactions || []).filter((entry) => entry.distributorId === item.id);
    item.total = entries.filter((entry) => entry.type === "bill").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    item.paid = entries.filter((entry) => entry.type === "paid").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    item.balance = Math.max(Number(item.total || 0) - Number(item.paid || 0), 0);
    item.extra = Math.max(Number(item.paid || 0) - Number(item.total || 0), 0);
  });
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  queueServerSync();
}

function replaceState(nextState) {
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, normalizeState(nextState));
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function queueServerSync() {
  if (!serverSyncReady || serverSyncBusy || location.protocol === "file:") return;
  clearTimeout(serverSyncTimer);
  serverSyncTimer = setTimeout(pushStateToServer, 450);
}

async function pushStateToServer() {
  if (serverSyncBusy || location.protocol === "file:") return;
  serverSyncBusy = true;
  try {
    const response = await fetch("api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updatedAt: Date.now(), data: state }),
    });
    if (response.ok) {
      const payload = await response.json();
      serverSyncUpdatedAt = Number(payload.updatedAt || Date.now());
    }
  } catch {
    serverSyncReady = false;
  } finally {
    serverSyncBusy = false;
  }
}

async function pullStateFromServer({ initial = false } = {}) {
  if (serverSyncBusy || location.protocol === "file:") return;
  try {
    const response = await fetch(`api/state?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    if (payload?.data && Number(payload.updatedAt || 0) > serverSyncUpdatedAt) {
      serverSyncUpdatedAt = Number(payload.updatedAt || Date.now());
      replaceState(payload.data);
      renderPage();
      if (!initial) showToast("Online data synced.");
    } else if (initial && !payload?.data) {
      serverSyncReady = true;
      pushStateToServer();
    }
  } catch {
    serverSyncReady = false;
  }
}

function initServerSync() {
  if (location.protocol === "file:") return;
  fetch(`api/state?ts=${Date.now()}`, { cache: "no-store" })
    .then((response) => response.ok ? response.json() : null)
    .then((payload) => {
      serverSyncReady = true;
      if (payload?.data) {
        serverSyncUpdatedAt = Number(payload.updatedAt || Date.now());
        replaceState(payload.data);
        renderPage();
      } else {
        pushStateToServer();
      }
      setInterval(() => pullStateFromServer(), 7000);
    })
    .catch(() => { serverSyncReady = false; });
}

async function pullLatestStateForLogin() {
  if (location.protocol === "file:") return;
  try {
    const response = await fetch(`api/state?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    if (payload?.data) {
      serverSyncReady = true;
      serverSyncUpdatedAt = Number(payload.updatedAt || Date.now());
      replaceState(payload.data);
    }
  } catch {
    serverSyncReady = false;
  }
}

function loadTheme() {
  try {
    return { ...defaultTheme, ...(JSON.parse(localStorage.getItem(THEME_KEY)) || {}) };
  } catch {
    return { ...defaultTheme };
  }
}

function applyTheme(theme = loadTheme()) {
  const root = document.documentElement;
  root.style.setProperty("--green", theme.green);
  root.style.setProperty("--deep", theme.deep);
  root.style.setProperty("--gold", theme.gold);
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--panel", theme.panel);
  root.dataset.themeMode = theme.mode || "3d";
  root.dataset.themeEffect = theme.effect || (theme.mode === "normal" ? "flat" : "3d");
  root.dataset.themeGlass = theme.glass || (theme.mode === "normal" ? "solid" : "glass");
}

function themeModeValue(theme = loadTheme()) {
  const mode = theme.mode || document.documentElement.dataset.themeMode || defaultTheme.mode;
  return ["3d", "normal", "dark", "night"].includes(mode) ? mode : defaultTheme.mode;
}

function isStandaloneApp() {
  return Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone);
}

function syncStandaloneClass() {
  document.body.classList.toggle("standalone-app", isStandaloneApp());
}

function currentUser() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  let session = { id: raw, password: "" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.id) session = parsed;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
  const employee = state.employees.find((item) => item.id === session.id && item.active);
  if (!employee) return null;
  if (!session.password || session.password !== employee.password) {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
  return employee;
}

function redirectIfNeeded(page) {
  if (page === "login") return;
  const user = currentUser();
  if (!user) {
    location.href = "login.html";
    return false;
  }
  if (!pageAccess[page]?.includes(user.role)) {
    const fallback = user.role === "parts_manager" ? "parts.html" : "dashboard.html";
    location.href = fallback;
    return false;
  }
  return true;
}

function showToast(message) {
  const toast = qs("#toast");
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
}

function layout(page, title, eyebrow = "JD TVS") {
  syncStandaloneClass();
  const user = currentUser();
  const menu = [
    ["dashboard.html", "Dashboard", "dashboard"],
    ["admin.html", "Admin", "admin"],
    ["sales.html", "Sales", "sales"],
    ["rto-insurance.html", "RTO & Insurance", "rto"],
    ["customer.html", "Customers", "customer"],
    ["parts.html", "Parts", "parts"],
    ["lists.html", "Lists", "lists"],
    ["settings.html", "Settings", "settings"],
  ].filter((item) => user && pageAccess[item[2]]?.includes(user.role));

  document.body.innerHTML = `
    <div id="toast" class="toast" role="status" hidden></div>
    <div class="app-layout">
      <aside class="sidebar">
        <button class="sidebar-close" type="button" data-close-sidebar aria-label="Close menu">×</button>
        <div class="brand"><span class="brand-logo"><img src="${LOGO_PATH}" alt="JD Auto Sales logo"></span><div><h1>JD TVS</h1><p>${roleLabels[user.role]}</p></div></div>
        <nav class="menu">${menu.map(([href, label, key]) => `<a class="${key === page ? "active" : ""}" href="${href}" title="${label}"><span class="menu-icon">${navIcons[key] || label[0]}</span><span class="menu-label">${label}</span></a>`).join("")}</nav>
      </aside>
      <main class="main">
        <header class="topbar">
          <button class="mobile-nav-logo" type="button" data-open-sidebar aria-label="Open menu"><img src="${LOGO_PATH}" alt="JD Auto Sales logo"></button>
          <div class="page-title-block"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p class="welcome-name">Welcome, <strong>${user.name}</strong></p></div>
          <div class="top-actions">
            <div class="notification-menu">
            <button id="notificationBell" class="soft-btn bell-btn" type="button" aria-label="Notifications"><span class="action-icon">!</span><span class="action-text">Alerts</span><span id="notificationCount">0</span></button>
            </div>
            <button class="soft-btn" type="button" data-open-customer aria-label="Customer Entry"><span class="action-icon">+</span><span class="action-text">Customer Entry</span></button>
            <button class="soft-btn" type="button" data-logout aria-label="Logout"><span class="action-icon">⎋</span><span class="action-text">Logout</span></button>
          </div>
        </header>
        <div id="notificationPanel" class="notification-panel" hidden></div>
        ${commonDatalists()}
        <div id="pageRoot"></div>
        ${appFooter()}
      </main>
    </div>
    ${customerModalHtml()}
    ${recordEditorHtml()}
  `;
  qs("[data-logout]").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.href = "login.html";
  });
  qs("#notificationBell")?.addEventListener("click", () => {
    const panel = qs("#notificationPanel");
    panel.hidden = !panel.hidden;
    clearTimeout(notificationTimer);
    if (!panel.hidden) {
      notificationTimer = setTimeout(() => {
        panel.hidden = true;
      }, 4500);
    }
  });
  qs("#notificationPanel")?.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-notifications]")) {
      clearTimeout(notificationTimer);
      qs("#notificationPanel").hidden = true;
      return;
    }
    clearTimeout(notificationTimer);
    handleNotificationAction(event);
  });
  qs("[data-open-sidebar]")?.addEventListener("click", () => document.body.classList.add("sidebar-open"));
  qs("[data-close-sidebar]")?.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
  bindCustomerModal();
  bindRecordEditor();
  bindFooterThemeControls();
  bindInstallButton();
  bindGlobalPartsCards();
  renderPartsStats();
  renderPartsList();
  renderNotificationBell();
}

function appFooter() {
  const mode = themeModeValue();
  return `
    <footer class="app-footer">
      <div class="footer-theme-controls" aria-label="Theme controls">
        <label>Mode
          <select data-footer-theme="mode">
            <option value="3d"${mode === "3d" ? " selected" : ""}>Default</option>
            <option value="normal"${mode === "normal" ? " selected" : ""}>Normal</option>
            <option value="dark"${mode === "dark" ? " selected" : ""}>Dark</option>
            <option value="night"${mode === "night" ? " selected" : ""}>Night</option>
          </select>
        </label>
      </div>
      <div class="footer-copy">Copyright © <span>${new Date().getFullYear()}</span> Rohit Singh</div>
    </footer>`;
}

function bindFooterThemeControls() {
  const footer = qs(".app-footer");
  if (!footer) return;
  const theme = loadTheme();
  qsa("[data-footer-theme]", footer).forEach((select) => {
    select.value = themeModeValue(theme);
    select.addEventListener("change", () => {
      const nextTheme = { ...loadTheme(), mode: select.value };
      localStorage.setItem(THEME_KEY, JSON.stringify(nextTheme));
      applyTheme(nextTheme);
      updateFooterThemeControls(nextTheme);
      syncSettingsThemeControls(nextTheme);
      redrawVisibleCharts();
      showToast("Theme updated.");
    });
  });
}

function updateFooterThemeControls(theme = loadTheme()) {
  qsa("[data-footer-theme]").forEach((select) => {
    select.value = themeModeValue(theme);
  });
}

function syncSettingsThemeControls(theme = loadTheme()) {
  if (qs("#themeMode")) qs("#themeMode").value = theme.mode || "3d";
  if (qs("#themeEffect")) qs("#themeEffect").value = theme.effect || (theme.mode === "normal" ? "flat" : "3d");
  if (qs("#themeGlass")) qs("#themeGlass").value = theme.glass || (theme.mode === "normal" ? "solid" : "glass");
}

function optionList(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => `<option value="${value}"></option>`)
    .join("");
}

function commonDatalists() {
  const demoNames = ["Rahul Kumar", "Amit Singh", "Priya Sharma", "Sales Executive", "RTO Staff", "TVS Main Distributor"];
  const demoMobiles = ["9876543210", "9123456780", "9876512345", "9876500001", "9876500002"];
  const demoAddresses = ["Station Road, Patna", "Main Road, Muzaffarpur", "JD Auto Sales, Main Road", "Parts Counter"];
  const demoIds = ["DL-2026-001", "AADHAR-1234", "PAN-DEMO01", "EMP-001"];
  const demoCompanies = ["TVS Credit", "Bajaj Finance", "HDFC Bank", "ICICI Lombard", "Tata AIG", "New India Assurance"];
  const demoRto = ["Patna RTO", "Muzaffarpur RTO", "Gaya RTO", "BR06"];
  const demoColours = ["Red", "Blue", "Black", "White", "Grey", "Matte Black"];
  const demoKeys = ["K101", "K102", "K201", "K301"];
  const demoRacks = ["R1", "R2", "R3", "A1", "B1"];
  const names = state.customers.map((item) => item.name || item.customer).concat(state.sales.map((item) => item.customer), state.employees.map((item) => item.name), state.distributors.map((item) => item.name), demoNames);
  const mobiles = state.customers.map((item) => item.mobile).concat(state.sales.map((item) => item.mobile), state.employees.map((item) => item.mobile), state.distributors.map((item) => item.mobile), demoMobiles);
  const invoices = state.customers.map((item) => item.invoice).concat(state.sales.map((item) => item.invoice), state.rto.map((item) => item.invoice), state.partSales.map((item) => item.invoice), ["VN001", "VN002", "SALE-1001"]);
  const regFrames = state.bikes.map((item) => item.frameNo).concat(state.sales.map((item) => item.frameNo), state.rto.map((item) => item.registrationNo || item.frameNo), state.customers.map((item) => item.bikeNo), ["MD625RAIDER001", "BR06AB1234"]);
  const addresses = state.sales.map((item) => item.address).concat(state.employees.map((item) => item.address), demoAddresses);
  const ids = state.sales.map((item) => item.idNo).concat(state.employees.map((item) => item.idNo), demoIds);
  const companies = state.sales.map((item) => item.financeCompany).concat(state.insurance.map((item) => item.company), demoCompanies);
  const partNames = state.parts.map((item) => item.name).concat(["Engine Oil", "Brake Shoe", "Spark Plug", "Filter Element"]);
  const commonNames = state.parts.map((item) => item.commonName).concat(["Oil", "Brake", "Plug", "Filter"]);
  return `
    <datalist id="customerNameList">${optionList(names)}</datalist>
    <datalist id="mobileList">${optionList(mobiles)}</datalist>
    <datalist id="invoiceList">${optionList(invoices)}</datalist>
    <datalist id="regFrameList">${optionList(regFrames)}</datalist>
    <datalist id="addressList">${optionList(addresses)}</datalist>
    <datalist id="idNoList">${optionList(ids)}</datalist>
    <datalist id="companyList">${optionList(companies)}</datalist>
    <datalist id="rtoNameList">${optionList(demoRto.concat(state.rto.map((item) => item.rtoName)))}</datalist>
    <datalist id="colourList">${optionList(demoColours.concat(state.bikes.map((item) => item.colour)))}</datalist>
    <datalist id="keyNoList">${optionList(demoKeys.concat(state.bikes.map((item) => item.keyNo)))}</datalist>
    <datalist id="rackNoList">${optionList(demoRacks.concat(state.parts.map((item) => item.rackNo)))}</datalist>
    <datalist id="partNameList">${optionList(partNames)}</datalist>
    <datalist id="partCommonNameList">${optionList(commonNames)}</datalist>`;
}

function partsSummaryCards() {
  const showStockValue = currentUser()?.role === "admin";
  return `
    <section class="stats-grid compact-stats" aria-label="Parts totals">
      <article class="stat-card stat-action" id="availablePartsCard" role="button" tabindex="0"><span>Available Parts</span><strong id="partsStockCount">0</strong><small>Click to view stock items</small></article>
      <article class="stat-card stat-action" id="lowStockCard" role="button" tabindex="0"><span>Low Stock</span><strong id="partsLowCount">0</strong><small>Click to view refill list</small></article>
      <article class="stat-card stat-action" id="issuedTodayCard" role="button" tabindex="0"><span>Issued Today</span><strong id="partsIssuedToday">0</strong><small>Click to view parts quantity</small></article>
      ${showStockValue ? `<article class="stat-card stat-action warning" id="partsValueCard" role="button" tabindex="0"><span>Parts Value</span><strong id="partsValueTotal">Rs 0</strong><small>Click to view MRP stock value</small></article>` : ""}
    </section>`;
}

function partsDetailPanels() {
  return `
    <article class="panel quick-detail-panel" id="issuedTodayPanel" hidden>
      <div class="panel-head">
        <div><p class="eyebrow">Today Issued</p><h3>Parts Quantity Details</h3></div>
        <button class="soft-btn" id="closeIssuedToday" type="button">Close</button>
      </div>
      <div id="issuedTodayDetails" class="table-wrap"></div>
    </article>
    <article class="panel quick-detail-panel" id="partsListPanel" hidden>
      <div class="panel-head">
        <div><p class="eyebrow" id="partsListEyebrow">Stock</p><h3 id="partsListTitle">Parts List</h3></div>
        <button class="soft-btn" id="closePartsList" type="button">Close</button>
      </div>
      <div class="panel-body filters compact-filter"><input id="partsStockSearch" placeholder="Search parts list"></div>
      <div id="partsListBox" class="table-wrap"></div>
    </article>`;
}

function bindGlobalPartsCards() {
  bindStatCard("#availablePartsCard", showPartsList);
  bindStatCard("#lowStockCard", showLowStockParts);
  bindStatCard("#partsValueCard", showPartsValueDetails);
  qs("#issuedTodayCard")?.addEventListener("click", showIssuedTodayDetails);
  qs("#issuedTodayCard")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      showIssuedTodayDetails();
    }
  });
  qs("#closeIssuedToday")?.addEventListener("click", () => qs("#issuedTodayPanel").hidden = true);
  qs("#closePartsList")?.addEventListener("click", () => qs("#partsListPanel").hidden = true);
  qs("#partsStockSearch")?.addEventListener("input", () => renderPartsList(qs("#partsListPanel")?.dataset.mode || "all"));
}

function customerModalHtml() {
  return `
    <div id="customerModal" class="modal-backdrop" hidden>
      <div class="modal">
        <div class="panel-head">
          <div><p class="eyebrow">Quick Customer</p><h3>Customer Payment Entry</h3></div>
          <button class="soft-btn" type="button" data-close-customer>Close</button>
        </div>
        <div class="panel-body">
          <form id="quickCustomerForm" class="entry-form">
            <label>Customer Name <input id="quickCustomerName" list="customerNameList" required></label>
            <label>Mobile No. <input id="quickMobile" list="mobileList" required></label>
            <label>Invoice / VN No. <input id="quickInvoice" list="invoiceList" placeholder="Invoice / VN no."></label>
            <label>Bike / Reg No. <input id="quickBikeNo" list="regFrameList" placeholder="Frame / bike / registration no."></label>
            <label>Issued Parts Payment <input id="quickPartsAmount" type="number" min="0" value="0" readonly></label>
            <label>Total Amount <input id="quickTotal" type="number" min="0" value="0"></label>
            <label>Paid Amount <input id="quickPaid" type="number" min="0" value="0"></label>
            <label>Discount <input id="quickDiscount" type="number" min="0" value="0"></label>
            <label>Pending Amount <input id="quickPending" type="number" min="0" value="0"></label>
            <label>Extra / Service Charge <input id="quickExtra" type="number" min="0" value="0" readonly></label>
            <label>Date <input id="quickDate" type="date" required></label>
            <button class="primary-btn" type="submit">Save Entry</button>
          </form>
          <div id="oldCustomerBox" class="notice-list" style="margin-top:16px"></div>
        </div>
      </div>
    </div>
  `;
}

function recordEditorHtml() {
  return `
    <div id="recordEditorModal" class="modal-backdrop" hidden>
      <div class="modal">
        <div class="panel-head">
          <div><p class="eyebrow">Update</p><h3 id="recordEditorTitle">Record</h3></div>
          <button class="soft-btn" type="button" data-close-record-editor>Close</button>
        </div>
        <div class="panel-body">
          <form id="recordEditorForm" class="entry-form"></form>
        </div>
      </div>
    </div>
  `;
}

function editorConfigs() {
  return {
    bike: { title: "Update Bike", list: "bikes", fields: [
      ["model", "Bike Model", "text"], ["category", "Category", "text"], ["frameNo", "Frame No.", "text"], ["engineNo", "Engine No.", "text"], ["colour", "Colour", "text"], ["keyNo", "Key No.", "text"],
    ] },
    sale: { title: "Update Sale", list: "sales", fields: [
      ["customer", "Customer", "text"], ["mobile", "Mobile", "text"], ["invoice", "Invoice / VN", "text"], ["bike", "Bike", "text"], ["frameNo", "Frame No.", "text"], ["paymentType", "Payment Type", "select", ["Cash", "Finance"]], ["paid", "Received", "number"], ["pending", "Pending", "number"], ["discount", "Discount", "number"], ["date", "Date", "date"],
    ] },
    rto: { title: "Update RTO", list: "rto", fields: [
      ["customer", "Customer", "text"], ["invoice", "Invoice", "text"], ["frameNo", "Frame No.", "text"], ["rtoName", "RTO Name", "text"], ["registrationNo", "Registration No.", "text"], ["status", "Status", "select", ["Pending", "Completed"]],
    ] },
    insurance: { title: "Update Insurance", list: "insurance", fields: [
      ["customer", "Customer", "text"], ["mobile", "Mobile", "text"], ["invoice", "Invoice", "text"], ["company", "Company", "text"], ["policyNo", "Policy No.", "text"], ["expiryDate", "Expiry Date", "date"], ["status", "Status", "select", ["Pending", "Completed", "Expired"]],
    ] },
    part: { title: "Update Part", list: "parts", fields: [
      ["partNo", "Part No.", "text"], ["name", "Part Name", "text"], ["commonName", "Common Name", "text"], ["rackNo", "Rack No.", "text"], ["stock", "Stock", "number"], ["low", "Low Alert", "number"], ["sale", "MRP", "number"],
    ] },
    employee: { title: "Update Employee", list: "employees", fields: [
      ["name", "Name", "text"], ["username", "Username", "text"], ["password", "Password", "text"], ["mobile", "Mobile", "text"], ["idNo", "ID No.", "text"], ["address", "Address", "text"], ["joinDate", "Join Date", "date"], ["role", "Field", "select", ["admin", "accounts", "parts_manager", "sales", "rto"]], ["active", "Status", "select", ["true", "false"]],
    ] },
    distributor: { title: "Update Distributor", list: "distributors", fields: [
      ["name", "Name", "text"], ["mobile", "Mobile", "text"], ["notes", "Notes", "textarea"],
    ] },
  };
}

function bindRecordEditor() {
  qs("[data-close-record-editor]")?.addEventListener("click", () => qs("#recordEditorModal").hidden = true);
  qs("#recordEditorForm")?.addEventListener("submit", saveRecordEditor);
}

function openRecordEditor(type, id) {
  if (type === "distributorLedger") {
    openDistributorLedgerEditor(id);
    return;
  }
  const config = editorConfigs()[type];
  if (!config) return;
  const record = state[config.list].find((item) => item.id === id);
  if (!record) return showToast("Record nahi mila.");
  qs("#recordEditorTitle").textContent = config.title;
  const form = qs("#recordEditorForm");
  form.dataset.type = type;
  form.dataset.id = id;
  form.innerHTML = `${config.fields.map(([key, label, inputType, options]) => {
    const value = record[key] ?? "";
    if (inputType === "textarea") return `<label class="wide">${label}<textarea data-edit-field="${key}">${escapeHtml(value)}</textarea></label>`;
    if (inputType === "select") return `<label>${label}<select data-edit-field="${key}">${options.map((option) => `<option value="${option}" ${String(value) === String(option) ? "selected" : ""}>${roleLabels[option] || option}</option>`).join("")}</select></label>`;
    return `<label>${label}<input data-edit-field="${key}" type="${inputType}" value="${escapeHtml(value)}"></label>`;
  }).join("")}<button class="primary-btn" type="submit">Save Update</button>`;
  qs("#recordEditorModal").hidden = false;
}

function saveRecordEditor(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const type = form.dataset.type;
  if (type === "distributorLedger") {
    saveDistributorLedgerEditor(form);
    return;
  }
  const config = editorConfigs()[type];
  const record = state[config.list].find((item) => item.id === form.dataset.id);
  if (!record) return;
  config.fields.forEach(([key, , inputType]) => {
    const field = qs(`[data-edit-field="${key}"]`, form);
    if (!field) return;
    if (inputType === "number") record[key] = Number(field.value || 0);
    else if (key === "active") record[key] = field.value === "true";
    else record[key] = field.value.trim();
  });
  if (type === "distributor") {
    syncDistributorTotals();
  }
  if (type === "rto") record.status = record.rtoName && record.registrationNo ? "Completed" : record.status || "Pending";
  if (type === "insurance") record.status = insuranceDisplayStatus(record);
  saveState();
  qs("#recordEditorModal").hidden = true;
  renderPage();
  showToast("Record updated.");
}

function openDistributorLedgerEditor(id) {
  const entry = state.distributorTransactions.find((item) => item.id === id);
  if (!entry) return showToast("Distributor entry nahi mila.");
  const distributor = state.distributors.find((item) => item.id === entry.distributorId);
  if (!distributor) return showToast("Distributor nahi mila.");
  syncDistributorTotals();
  qs("#recordEditorTitle").textContent = "Update Distributor Ledger";
  const form = qs("#recordEditorForm");
  form.dataset.type = "distributorLedger";
  form.dataset.id = id;
  form.dataset.distributorId = distributor.id;
  form.innerHTML = `
    <label>Date <input data-edit-field="date" type="date" value="${escapeHtml(entry.date || today())}"></label>
    <label>Name <input data-edit-field="name" list="customerNameList" value="${escapeHtml(distributor.name || "")}"></label>
    <label>Mobile <input data-edit-field="mobile" list="mobileList" value="${escapeHtml(distributor.mobile || "")}"></label>
    <label>Type <select data-edit-field="type"><option value="bill" ${entry.type === "bill" ? "selected" : ""}>Total Lena / Bill</option><option value="paid" ${entry.type === "paid" ? "selected" : ""}>Diya / Jama</option></select></label>
    <label>Amount <input data-edit-field="amount" type="number" min="0" value="${Number(entry.amount || 0)}"></label>
    <label>Total Lena <input type="number" value="${Number(distributor.total || 0)}" readonly></label>
    <label>Diya/Jama <input type="number" value="${Number(distributor.paid || 0)}" readonly></label>
    <label>Balance <input type="number" value="${Number(distributor.balance || 0)}" readonly></label>
    <label>Extra Jama <input type="number" value="${Number(distributor.extra || 0)}" readonly></label>
    <label class="wide">Notes <textarea data-edit-field="notes">${escapeHtml(entry.notes || distributor.notes || "")}</textarea></label>
    <button class="primary-btn" type="submit">Save Update</button>`;
  qs("#recordEditorModal").hidden = false;
}

function saveDistributorLedgerEditor(form) {
  const entry = state.distributorTransactions.find((item) => item.id === form.dataset.id);
  const distributor = state.distributors.find((item) => item.id === form.dataset.distributorId);
  if (!entry || !distributor) return showToast("Record nahi mila.");
  distributor.name = qs('[data-edit-field="name"]', form).value.trim();
  distributor.mobile = qs('[data-edit-field="mobile"]', form).value.trim();
  distributor.notes = qs('[data-edit-field="notes"]', form).value.trim();
  entry.date = qs('[data-edit-field="date"]', form).value || today();
  entry.type = qs('[data-edit-field="type"]', form).value;
  entry.amount = Number(qs('[data-edit-field="amount"]', form).value || 0);
  entry.notes = qs('[data-edit-field="notes"]', form).value.trim();
  syncDistributorTotals();
  saveState();
  qs("#recordEditorModal").hidden = true;
  renderPage();
  showToast("Distributor ledger updated.");
}

function bindCustomerModal() {
  const modal = qs("#customerModal");
  const form = qs("#quickCustomerForm");
  qs("[data-open-customer]")?.addEventListener("click", () => openCustomerModal());
  qs("[data-close-customer]")?.addEventListener("click", () => {
    editingCustomerId = null;
    modal.hidden = true;
  });
  qs("#quickDate").value = today();
  ["#quickMobile", "#quickBikeNo", "#quickInvoice"].forEach((selector) => {
    qs(selector)?.addEventListener("input", syncQuickCustomerBalance);
  });
  ["#quickTotal", "#quickPaid", "#quickDiscount", "#quickPending"].forEach((selector) => {
    qs(selector)?.addEventListener("input", updateQuickPaymentPreview);
  });
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!textValue("#quickInvoice") && !textValue("#quickBikeNo") && !textValue("#quickMobile")) return showToast("Mobile, Invoice/VN ya Bike/Reg no. me se ek fill kare.");
    if (numberValue("#quickPending") > 0 && !textValue("#quickMobile")) return showToast("Pending balance ke liye mobile number required hai.");
    const existingCustomer = state.customers.find((item) => item.id === editingCustomerId) || findExistingCustomerForQuickEntry();
    const totalAmount = numberValue("#quickTotal");
    const pendingBefore = existingCustomer ? Number(existingCustomer.pending || 0) : (totalAmount || numberValue("#quickPending"));
    const receivedNow = numberValue("#quickPaid");
    const discountNow = numberValue("#quickDiscount");
    const appliedCredit = pendingBefore > 0 ? Math.min(receivedNow + discountNow, pendingBefore) : receivedNow + discountNow;
    const appliedPayment = pendingBefore > 0 ? Math.min(receivedNow, pendingBefore) : receivedNow;
    const partsAmount = numberValue("#quickPartsAmount");
    const serviceCharge = partsAmount > 0 ? Math.max(totalAmount - partsAmount, 0) : Math.max(receivedNow + discountNow - pendingBefore, 0);
    const record = {
      id: existingCustomer?.id || editingCustomerId || createId(),
      name: textValue("#quickCustomerName"),
      mobile: textValue("#quickMobile"),
      invoice: textValue("#quickInvoice"),
      bikeNo: textValue("#quickBikeNo"),
      total: totalAmount || Number(existingCustomer?.total || 0),
      partsAmount,
      paid: existingCustomer && appliedPayment > 0 ? Number(existingCustomer.paid || 0) + appliedPayment : appliedPayment,
      pending: existingCustomer && appliedCredit > 0 ? Math.max(Number(existingCustomer.pending || 0) - appliedCredit, 0) : numberValue("#quickPending"),
      discount: Number(existingCustomer?.discount || 0) + discountNow,
      extra: Number(existingCustomer?.extra || 0) + serviceCharge,
      date: textValue("#quickDate") || today(),
    };
    const index = state.customers.findIndex((item) => item.id === record.id);
    if (index >= 0) state.customers[index] = { ...state.customers[index], ...record };
    else state.customers.push(record);
    const saleMatch = existingCustomer?.saleId
      ? state.sales.find((sale) => sale.id === existingCustomer.saleId)
      : state.sales.find((sale) => same(sale.invoice, record.invoice) || same(sale.mobile, record.mobile) || same(sale.frameNo, record.bikeNo) || same(sale.registrationNo, record.bikeNo));
    if (saleMatch && appliedCredit > 0) {
      saleMatch.paid = Number(saleMatch.paid || 0) + appliedPayment;
      saleMatch.discount = Number(saleMatch.discount || 0) + discountNow;
      saleMatch.pending = Math.max(Number(saleMatch.pending || 0) - appliedCredit, 0);
      record.pending = saleMatch.pending;
    }
    if (index >= 0) state.customers[index] = { ...state.customers[index], ...record };
    state.paymentLogs.push({
      id: createId(),
      customerId: record.id,
      date: record.date,
      name: record.name,
      mobile: record.mobile,
      invoice: record.invoice,
      bikeNo: record.bikeNo,
      total: totalAmount,
      partsAmount,
      extra: serviceCharge,
      paid: appliedPayment,
      discount: discountNow,
      pending: record.pending,
    });
    editingCustomerId = null;
    saveState();
    form.reset();
    qs("#quickDate").value = today();
    renderOldCustomerNotice();
    renderPage();
    showToast(index >= 0 ? "Customer updated." : "Customer entry saved.");
  });
}

function openCustomerModal(prefill = {}) {
  const modal = qs("#customerModal");
  editingCustomerId = prefill.id || null;
  modal.hidden = false;
  qs("#quickCustomerName").value = prefill.name || "";
  qs("#quickMobile").value = prefill.mobile || "";
  qs("#quickInvoice").value = prefill.invoice || "";
  qs("#quickBikeNo").value = prefill.bikeNo || "";
  qs("#quickPartsAmount").value = prefill.partsAmount || 0;
  qs("#quickTotal").value = prefill.total || prefill.pending || 0;
  qs("#quickPaid").value = prefill.paid || 0;
  qs("#quickDiscount").value = prefill.discount || 0;
  qs("#quickPending").value = prefill.pending || 0;
  qs("#quickExtra").value = prefill.extra || 0;
  qs("#quickDate").value = today();
  updateQuickPaymentPreview();
  renderOldCustomerNotice();
}

function findExistingCustomerForQuickEntry() {
  const invoice = textValue("#quickInvoice");
  const mobile = textValue("#quickMobile");
  const bikeNo = textValue("#quickBikeNo");
  return state.customers.find((item) =>
    (invoice && same(item.invoice, invoice)) ||
    (mobile && same(item.mobile, mobile) && Number(item.pending || 0) > 0) ||
    (bikeNo && (same(item.bikeNo, bikeNo) || same(item.frameNo, bikeNo) || same(item.registrationNo, bikeNo)))
  );
}

function updateQuickPaymentPreview() {
  const totalInput = qs("#quickTotal");
  const total = numberValue("#quickTotal");
  const partsAmount = numberValue("#quickPartsAmount");
  const pending = numberValue("#quickPending");
  const paid = numberValue("#quickPaid");
  const discount = numberValue("#quickDiscount");
  if (total > 0 && (totalInput === document.activeElement || qs("#quickPaid") === document.activeElement || qs("#quickDiscount") === document.activeElement)) {
    qs("#quickPending").value = Math.max(total - paid - discount, 0);
  }
  const overPay = Math.max(paid + discount - (total || pending), 0);
  if (qs("#quickExtra")) qs("#quickExtra").value = partsAmount > 0 ? Math.max(total - partsAmount, 0) : overPay;
}

function findQuickCustomerMatch() {
  const mobile = textValue("#quickMobile");
  const bikeNo = textValue("#quickBikeNo");
  const invoice = textValue("#quickInvoice");
  const rtoMatch = state.rto.find((item) =>
    (bikeNo && (same(item.registrationNo, bikeNo) || same(item.frameNo, bikeNo))) ||
    (invoice && same(item.invoice, invoice))
  );
  const customerMatch = state.customers.find((item) =>
    (invoice && same(item.invoice, invoice)) ||
    (mobile && same(item.mobile, mobile)) ||
    (bikeNo && (same(item.bikeNo, bikeNo) || same(item.frameNo, bikeNo)))
  );
  const saleMatch = state.sales.find((item) =>
    (invoice && same(item.invoice, invoice)) ||
    (mobile && same(item.mobile, mobile)) ||
    (bikeNo && (same(item.frameNo, bikeNo) || same(item.registrationNo, bikeNo)))
  );
  return customerMatch || saleMatch || rtoMatch || null;
}

function syncQuickCustomerBalance() {
  const matches = pendingReferenceMatches();
  const match = matches[0] || findQuickCustomerMatch();
  if (match && !editingCustomerId) {
    qs("#quickCustomerName").value = match.name || match.customer || qs("#quickCustomerName").value;
    qs("#quickMobile").value = match.mobile || qs("#quickMobile").value;
    qs("#quickInvoice").value = match.invoice || qs("#quickInvoice").value;
    qs("#quickBikeNo").value = match.bikeNo || match.frameNo || match.registrationNo || qs("#quickBikeNo").value;
    qs("#quickTotal").value = Number(match.pending || 0);
    qs("#quickPaid").value = 0;
    qs("#quickDiscount").value = 0;
    qs("#quickPending").value = Number(match.pending || 0);
    updateQuickPaymentPreview();
  }
  renderOldCustomerNotice();
}

function pendingReferenceMatches() {
  const mobile = textValue("#quickMobile");
  const bikeNo = textValue("#quickBikeNo");
  const invoice = textValue("#quickInvoice");
  if (!mobile && !bikeNo && !invoice) return [];
  const matchesInput = (item) =>
    (mobile && same(item.mobile, mobile)) ||
    (bikeNo && (same(item.bikeNo, bikeNo) || same(item.frameNo, bikeNo) || same(item.registrationNo, bikeNo))) ||
    (invoice && same(item.invoice, invoice));
  const customerRows = state.customers
    .filter((item) => !item.saleId && matchesInput(item) && Number(item.pending || 0) > 0)
    .map((item) => ({ ...item, matchSource: "Customer" }));
  const saleRows = state.sales
    .filter((item) => matchesInput(item) && Number(item.pending || 0) > 0)
    .map((item) => ({ ...item, name: item.customer || item.name, bikeNo: item.frameNo || item.registrationNo, matchSource: "Sale" }));
  const rtoMatches = state.rto.filter(matchesInput);
  const linkedRows = rtoMatches.flatMap((rto) => {
    const linkedCustomers = state.customers
      .filter((item) => !item.saleId && Number(item.pending || 0) > 0 && (same(item.invoice, rto.invoice) || same(item.bikeNo, rto.frameNo) || same(item.bikeNo, rto.registrationNo)))
      .map((item) => ({ ...item, registrationNo: rto.registrationNo || item.registrationNo, matchSource: "Customer" }));
    const linkedSales = state.sales
      .filter((item) => Number(item.pending || 0) > 0 && (same(item.invoice, rto.invoice) || same(item.frameNo, rto.frameNo) || same(item.registrationNo, rto.registrationNo)))
      .map((item) => ({ ...item, name: item.customer || item.name, bikeNo: item.frameNo || item.registrationNo, registrationNo: rto.registrationNo || item.registrationNo, matchSource: "Sale" }));
    return linkedCustomers.concat(linkedSales);
  });
  const unique = new Map();
  customerRows.concat(saleRows, linkedRows).forEach((item) => unique.set(`${item.matchSource}-${item.id}`, item));
  return [...unique.values()];
}

function renderOldCustomerNotice() {
  const box = qs("#oldCustomerBox");
  if (!box) return;
  const old = pendingReferenceMatches();
  if (!old.length) {
    box.innerHTML = "";
    return;
  }
  const partsAmount = numberValue("#quickPartsAmount");
  let partsAmountLeft = partsAmount;
  const rows = old.map((item, index) => {
    const pending = Number(item.pending || 0);
    const partsInThisRow = partsAmountLeft > 0 ? Math.min(partsAmountLeft, pending) : 0;
    partsAmountLeft = Math.max(partsAmountLeft - partsInThisRow, 0);
    const oldPending = Math.max(pending - partsInThisRow, 0);
    return { ...item, index, oldPending, partsInThisRow };
  }).filter((item) => item.oldPending > 0 || item.partsInThisRow > 0);
  const totalOldPending = rows.reduce((sum, item) => sum + Number(item.oldPending || 0), 0);
  const issuedPartsHtml = partsAmount > 0 ? `<div class="pending-match-row"><span>Issued Parts Payment: ${money(partsAmount)}</span><button class="soft-btn" type="button" data-fill-parts-payment>Receive Parts</button></div>` : "";
  const oldRowsHtml = rows.map((item) =>
    `<div class="pending-match-row"><span>${item.name || item.customer || "-"} | ${item.mobile || "-"} | ${item.invoice || item.vnNo || "-"} | Reg/Frame: ${item.registrationNo || item.frameNo || item.bikeNo || "-"} | Old Pending: ${money(item.oldPending)}</span>${item.oldPending > 0 ? `<button class="soft-btn" type="button" data-fill-old-pending-match="${item.index}" data-old-pending="${item.oldPending}">Old Receive</button>` : ""}</div>`
  ).join("");
  box.innerHTML = `<div class="notice"><strong>Old Pending Box - Total ${money(totalOldPending)}</strong>${issuedPartsHtml}${oldRowsHtml}</div>`;
}

function stats() {
  const visibleSales = visibleRowsForUser(state.sales);
  const manualCustomerEntries = visibleRowsForUser(state.customers.filter((item) => !item.saleId));
  const salesTotal = visibleSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const paid = visibleSales.reduce((sum, sale) => sum + Number(sale.paid || 0), 0) + manualCustomerEntries.reduce((sum, item) => sum + Number(item.paid || 0), 0);
  const pending = visibleSales.reduce((sum, sale) => sum + Number(sale.pending || 0), 0) + manualCustomerEntries.reduce((sum, item) => sum + Number(item.pending || 0), 0);
  return { salesTotal, paid, pending, salesCount: visibleSales.length };
}

function linkedRecordsForReference(reference) {
  const linkedRto = state.rto.find((item) => same(item.registrationNo, reference) || same(item.frameNo, reference) || same(item.invoice, reference));
  const invoices = new Set([reference, linkedRto?.invoice].filter(Boolean).map(normalize));
  const vehicleRefs = new Set([reference, linkedRto?.frameNo, linkedRto?.registrationNo].filter(Boolean).map(normalize));
  const sales = state.sales.filter((item) => invoices.has(normalize(item.invoice)) || vehicleRefs.has(normalize(item.frameNo)) || vehicleRefs.has(normalize(item.registrationNo)));
  const saleIds = new Set(sales.map((item) => item.id));
  const customers = state.customers.filter((item) => saleIds.has(item.saleId) || invoices.has(normalize(item.invoice)) || vehicleRefs.has(normalize(item.bikeNo)) || vehicleRefs.has(normalize(item.frameNo)) || vehicleRefs.has(normalize(item.registrationNo)));
  return { linkedRto, sales, customers };
}

function applyPartBalanceChange(reference, amount) {
  if (!reference || !amount) return;
  const { sales, customers } = linkedRecordsForReference(reference);
  sales.forEach((item) => {
    item.pending = Math.max(Number(item.pending || 0) + amount, 0);
  });
  customers.forEach((item) => {
    const linkedSale = item.saleId ? sales.find((sale) => sale.id === item.saleId) : null;
    item.pending = linkedSale ? Number(linkedSale.pending || 0) : Math.max(Number(item.pending || 0) + amount, 0);
  });
}

function statCards() {
  const total = stats();
  const lowParts = state.parts.filter((part) => Number(part.stock) <= Number(part.low || 0)).length;
  const rtoPending = state.rto.filter((item) => item.status !== "Completed").length;
  const insPending = state.insurance.filter((item) => insuranceDisplayStatus(item) === "Pending").length;
  return `
    <section class="stats-grid">
      <article class="stat-card stat-action" data-business-stat="sales" role="button" tabindex="0"><span>Total Sales</span><strong>${money(total.salesTotal)}</strong><small>${total.salesCount} bills</small></article>
      <article class="stat-card stat-action" data-business-stat="received" role="button" tabindex="0"><span>Received</span><strong>${money(total.paid)}</strong><small>All customer receipts</small></article>
      <article class="stat-card stat-action warning" data-business-stat="pending" role="button" tabindex="0"><span>Pending Balance</span><strong>${money(total.pending)}</strong><small>Follow-up amount</small></article>
      <article class="stat-card stat-action" data-business-stat="alerts" role="button" tabindex="0"><span>Alerts</span><strong>${rtoPending + insPending + lowParts}</strong><small>RTO, insurance, parts</small></article>
    </section>
    <article class="panel quick-detail-panel" id="businessStatPanel" hidden>
      <div class="panel-head"><div><p class="eyebrow" id="businessStatEyebrow">Details</p><h3 id="businessStatTitle">Report</h3></div><button class="soft-btn" id="closeBusinessStat" type="button">Close</button></div>
      <div id="businessStatBody" class="table-wrap"></div>
    </article>`;
}

function businessAlerts() {
  const alerts = [];
  visibleRowsForUser(state.rto).filter((item) => item.status !== "Completed").forEach((item) => alerts.push({ type: "RTO Pending", name: item.customer, invoice: item.invoice, text: item.frameNo || "-" }));
  visibleRowsForUser(state.insurance).filter((item) => insuranceDisplayStatus(item) === "Pending").forEach((item) => alerts.push({ type: "Insurance Pending", name: item.customer, invoice: item.invoice, text: item.company || "Company not set" }));
  insuranceReminders().forEach((item) => alerts.push({ type: "Renewal Reminder", name: item.customer, invoice: item.invoice, text: `${item.mobile || "-"} | Expiry ${item.expiryDate || item.nextDate || "-"}` }));
  state.parts.filter((part) => Number(part.stock) <= Number(part.low || 0)).forEach((part) => alerts.push({ type: "Low Parts", name: part.name, invoice: part.partNo || "-", text: `Stock ${part.stock}` }));
  return alerts;
}

function showBusinessStat(type) {
  const panel = qs("#businessStatPanel");
  const body = qs("#businessStatBody");
  if (!panel || !body) return;
  const empty = (cols, text) => `<tr><td class="empty-row" colspan="${cols}">${text}</td></tr>`;
  if (type === "sales") {
    qs("#businessStatEyebrow").textContent = "Sales";
    qs("#businessStatTitle").textContent = "Total Sales Bills";
    const sales = visibleRowsForUser(state.sales);
    body.innerHTML = `<table><thead><tr><th>Date</th><th>Customer</th><th>Invoice</th><th>Bike</th><th>Total</th><th>Paid</th><th>Pending</th></tr></thead><tbody>${sales.length ? sales.map((sale) => `<tr><td>${sale.date || "-"}</td><td>${sale.customer || "-"}</td><td>${sale.invoice || "-"}</td><td>${sale.bike || "-"}</td><td>${money(sale.total)}</td><td>${money(sale.paid)}</td><td class="${sale.pending ? "due" : "ok"}">${money(sale.pending)}</td></tr>`).join("") : empty(7, "No sales bills.")}</tbody></table>`;
  }
  if (type === "received") {
    const manual = visibleRowsForUser(state.customers).filter((item) => !item.saleId && Number(item.paid || 0) > 0);
    const rows = visibleRowsForUser(state.sales).filter((sale) => Number(sale.paid || 0) > 0).map((sale) => ({ date: sale.date, name: sale.customer, invoice: sale.invoice, source: "Sale", paid: sale.paid })).concat(manual.map((item) => ({ date: item.date, name: item.name, invoice: item.invoice, source: "Customer", paid: item.paid })));
    qs("#businessStatEyebrow").textContent = "Receipts";
    qs("#businessStatTitle").textContent = "Received Payments";
    body.innerHTML = `<table><thead><tr><th>Date</th><th>Name</th><th>Invoice</th><th>Source</th><th>Received</th></tr></thead><tbody>${rows.length ? rows.map((row) => `<tr><td>${row.date || "-"}</td><td>${row.name || "-"}</td><td>${row.invoice || "-"}</td><td>${row.source}</td><td>${money(row.paid)}</td></tr>`).join("") : empty(5, "No received payments.")}</tbody></table>`;
  }
  if (type === "pending") {
    const manual = visibleRowsForUser(state.customers).filter((item) => !item.saleId && Number(item.pending || 0) > 0);
    const rows = visibleRowsForUser(state.sales).filter((sale) => Number(sale.pending || 0) > 0).map((sale) => ({ id: sale.id, date: sale.date, name: sale.customer, mobile: sale.mobile, invoice: sale.invoice, bikeNo: sale.frameNo, source: "Sale", pending: sale.pending })).concat(manual.map((item) => ({ id: item.id, date: item.date, name: item.name, mobile: item.mobile, invoice: item.invoice, bikeNo: item.bikeNo, source: "Customer", pending: item.pending })));
    qs("#businessStatEyebrow").textContent = "Pending";
    qs("#businessStatTitle").textContent = "Pending Balance";
    body.innerHTML = `<table><thead><tr><th>Date</th><th>Name</th><th>Mobile</th><th>Invoice</th><th>Reg/Frame</th><th>Source</th><th>Pending</th><th>Action</th></tr></thead><tbody>${rows.length ? rows.map((row) => `<tr><td>${row.date || "-"}</td><td>${row.name || "-"}</td><td>${row.mobile || "-"}</td><td>${row.invoice || "-"}</td><td>${row.bikeNo || "-"}</td><td>${row.source}</td><td class="due">${money(row.pending)}</td><td><button class="soft-btn" data-receive-pending="${row.source}" data-id="${row.id}">Receive</button></td></tr>`).join("") : empty(8, "No pending balance.")}</tbody></table>`;
  }
  if (type === "alerts") {
    const rows = businessAlerts();
    qs("#businessStatEyebrow").textContent = "Alerts";
    qs("#businessStatTitle").textContent = "RTO, Insurance, Parts";
    body.innerHTML = `<table><thead><tr><th>Type</th><th>Name / Part</th><th>Invoice / No.</th><th>Details</th></tr></thead><tbody>${rows.length ? rows.map((row) => `<tr><td>${row.type}</td><td>${row.name || "-"}</td><td>${row.invoice || "-"}</td><td>${row.text || "-"}</td></tr>`).join("") : empty(4, "No alerts.")}</tbody></table>`;
  }
  panel.hidden = false;
  applyTablePagination();
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderDashboard() {
  layout("dashboard", "Dashboard", "Business Overview");
  const root = qs("#pageRoot");
  root.innerHTML = `${statCards()}
    <section class="grid-2">
      <article class="panel">
        <div class="panel-head"><div><p class="eyebrow">Reports</p><h3>Months / Weeks / Year</h3></div><select id="chartRange"><option value="month">Month</option><option value="week">Week</option><option value="year">Year</option></select></div>
        <div class="chart-box"><canvas id="salesChart" width="800" height="260"></canvas></div>
      </article>
      <article class="panel">
        <div class="panel-head"><div><p class="eyebrow">Status</p><h3>Work Summary</h3></div></div>
        <div class="chart-box"><canvas id="statusChart" width="500" height="260"></canvas></div>
      </article>
    </section>
    <section class="grid-3">
      <a class="panel panel-body" href="sales.html"><h3>Sales</h3><p>Bikes, RTO, insurance and balance fields in one sale form.</p></a>
      <a class="panel panel-body" href="customer.html"><h3>Customers</h3><p>One-click pending and payment entries.</p></a>
      <a class="panel panel-body" href="parts.html"><h3>Parts</h3><p>Bulk add, sale, import, export and low stock alert.</p></a>
    </section>
    <article class="panel"><div class="panel-head"><div><p class="eyebrow">Notifications</p><h3>Section Alerts</h3></div></div><div class="panel-body notice-list" id="noticeList"></div></article>`;
  qs("#chartRange").addEventListener("change", drawDashboardCharts);
  drawDashboardCharts();
  renderNotices();
}

function chartData(range) {
  const labels = range === "week" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] :
    range === "year" ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] :
    ["W1", "W2", "W3", "W4", "W5"];
  const values = labels.map(() => 0);
  state.sales.forEach((sale) => {
    const date = new Date(`${sale.date || today()}T00:00:00`);
    let index = range === "week" ? date.getDay() : range === "year" ? date.getMonth() : Math.min(4, Math.floor((date.getDate() - 1) / 7));
    values[index] += Number(sale.total || 0);
  });
  return { labels, values };
}

function drawBarChart(canvas, labels, values) {
  const ctx = canvas.getContext("2d");
  const styles = getComputedStyle(document.documentElement);
  const ink = styles.getPropertyValue("--ink").trim() || "#14231f";
  const muted = styles.getPropertyValue("--muted").trim() || "#66736e";
  const green = styles.getPropertyValue("--green").trim() || "#0f7668";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const max = Math.max(...values, 1);
  const barWidth = canvas.width / labels.length - 24;
  labels.forEach((label, index) => {
    const height = (values[index] / max) * 170;
    const x = index * (canvas.width / labels.length) + 14;
    const y = 210 - height;
    ctx.fillStyle = green;
    ctx.fillRect(x, y, Math.max(18, barWidth), height);
    ctx.fillStyle = ink;
    ctx.font = "14px Arial";
    ctx.fillText(label, x, 238);
    ctx.fillStyle = muted;
    ctx.font = "12px Arial";
    ctx.fillText(String(Math.round(values[index] / 1000)) + "k", x, Math.max(18, y - 8));
  });
}

function drawStatusChart(canvas) {
  const ctx = canvas.getContext("2d");
  const styles = getComputedStyle(document.documentElement);
  const ink = styles.getPropertyValue("--ink").trim() || "#14231f";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const data = [
    ["RTO Pending", state.rto.filter((x) => x.status !== "Completed").length, "#d6a92f"],
    ["Insurance Pending", state.insurance.filter((x) => insuranceDisplayStatus(x) === "Pending").length, "#2c6fbb"],
    ["Low Parts", state.parts.filter((x) => Number(x.stock) <= Number(x.low || 0)).length, "#b13f3f"],
  ];
  const total = Math.max(data.reduce((sum, item) => sum + item[1], 0), 1);
  let start = -Math.PI / 2;
  data.forEach((item) => {
    const slice = (item[1] / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(170, 115);
    ctx.arc(170, 115, 90, start, start + slice);
    ctx.fillStyle = item[2];
    ctx.fill();
    start += slice;
  });
  data.forEach((item, index) => {
    ctx.fillStyle = item[2];
    ctx.fillRect(310, 65 + index * 34, 16, 16);
    ctx.fillStyle = ink;
    ctx.font = "14px Arial";
    ctx.fillText(`${item[0]}: ${item[1]}`, 336, 78 + index * 34);
  });
}

function drawDashboardCharts() {
  const data = chartData(qs("#chartRange")?.value || "month");
  drawBarChart(qs("#salesChart"), data.labels, data.values);
  drawStatusChart(qs("#statusChart"));
}

function renderNotices() {
  const box = qs("#noticeList");
  const notices = notificationItems();
  const html = notices.length ? notices.map((item) => `<div class="notice"><strong>${item.type}</strong>${item.text}</div>`).join("") : `<div class="notice"><strong>All clear</strong>No pending alerts right now.</div>`;
  if (box) box.innerHTML = html;
  renderNotificationBell(notices, html);
}

function renderNotificationBell(existingNotices, existingHtml) {
  const count = qs("#notificationCount");
  const panel = qs("#notificationPanel");
  if (!count || !panel) return;
  let notices = existingNotices;
  let html = existingHtml;
  if (!notices) {
    notices = notificationItems();
  }
  count.textContent = notices.length;
  panel.innerHTML = `<div class="notification-panel-head"><strong>Notifications</strong><button class="notification-close" type="button" data-close-notifications aria-label="Close notifications">×</button></div>${
    notices.length ? notices.map((item) => `<div class="notice notification-item"><strong>${item.type}</strong><span>${item.text}</span><div class="row-actions"><button class="edit-btn" data-notification-edit="${item.action}" data-id="${item.id}">Edit</button><button class="soft-btn" data-notification-done="${item.action}" data-id="${item.id}">Update</button></div></div>`).join("") : `<div class="notice"><strong>All clear</strong>No pending alerts right now.</div>`
  }`;
}

function notificationItems() {
  const user = currentUser();
  const role = user?.role || "admin";
  const canSee = (types) => role === "admin" || types.includes(role);
  const dated = (item) => item?.date ? ` | Date ${item.date}` : "";
  const items = [];
  if (canSee(["accounts", "sales", "rto"])) {
    state.rto.filter((item) => item.status !== "Completed").forEach((item) => items.push({ type: "RTO Pending", text: `${item.customer} - ${item.invoice || item.frameNo || "-"}${dated(item)}`, action: "rto", id: item.id }));
  }
  if (canSee(["accounts", "sales", "rto"])) {
    state.insurance.filter((item) => insuranceDisplayStatus(item) === "Pending").forEach((item) => items.push({ type: "Insurance Pending", text: `${item.customer} - ${item.mobile || "-"} - ${item.company || "Company not set"}${dated(item)}`, action: "insurance", id: item.id }));
    insuranceReminders().forEach((item) => items.push({ type: "Renewal Reminder", text: `${item.customer} - ${item.mobile || "-"} - Expiry ${item.expiryDate || item.nextDate}`, action: "insurance", id: item.id }));
  }
  if (canSee(["parts_manager"])) {
    state.parts.filter((part) => Number(part.stock) <= Number(part.low || 0)).forEach((part) => items.push({ type: "Low Stock", text: `${part.name} stock ${part.stock} | Date ${today()}`, action: "parts", id: part.id }));
  }
  if (canSee(["accounts", "sales"])) {
    state.sales.filter((sale) => Number(sale.pending || 0) > 0).forEach((sale) => items.push({ type: "Payment Pending", text: `${sale.customer || "-"} - ${sale.mobile || sale.invoice || sale.frameNo || "-"} - ${money(sale.pending)}${dated(sale)}`, action: "payment-sale", id: sale.id }));
    state.customers.filter((item) => !item.saleId && Number(item.pending || 0) > 0).forEach((item) => items.push({ type: "Payment Pending", text: `${item.name || "-"} - ${item.mobile || item.invoice || item.bikeNo || "-"} - ${money(item.pending)}${dated(item)}`, action: "payment-customer", id: item.id }));
  }
  return items;
}

function handleNotificationAction(event) {
  const done = event.target.closest("[data-notification-done]");
  const edit = event.target.closest("[data-notification-edit]");
  const button = done || edit;
  if (!button) return;
  const type = button.dataset.notificationDone || button.dataset.notificationEdit;
  const id = button.dataset.id;
  if (edit) {
    if (type === "parts") location.href = "parts.html";
    else if (type.startsWith("payment")) location.href = "customer.html";
    else location.href = "rto-insurance.html";
    return;
  }
  if (type === "payment-sale") {
    const item = state.sales.find((row) => row.id === id);
    if (item) openCustomerModal({ name: item.customer, mobile: item.mobile, invoice: item.invoice, bikeNo: item.frameNo || item.registrationNo, paid: 0, pending: item.pending });
    qs("#notificationPanel").hidden = true;
    return;
  }
  if (type === "payment-customer") {
    const item = state.customers.find((row) => row.id === id);
    if (item) openCustomerModal({ id: item.id, name: item.name, mobile: item.mobile, invoice: item.invoice, bikeNo: item.bikeNo, paid: 0, pending: item.pending });
    qs("#notificationPanel").hidden = true;
    return;
  }
  if (type === "rto") {
    const item = state.rto.find((row) => row.id === id);
    if (item) item.status = "Completed";
  }
  if (type === "insurance") {
    const item = state.insurance.find((row) => row.id === id);
    if (item) item.status = "Completed";
  }
  if (type === "parts") {
    location.href = "parts.html";
    return;
  }
  saveState();
  renderNotificationBell();
  renderNotices();
  renderPage();
  showToast("Notification updated.");
}

function renderAdmin() {
  layout("admin", "Admin", "Employee & Distributor Setup");
  qs("#pageRoot").innerHTML = `
    <section class="grid-2">
      <article class="panel"><div class="panel-head"><div><p class="eyebrow">Employees</p><h3>Add / Edit Login</h3></div></div><div class="panel-body"><form id="employeeForm" class="entry-form"></form></div></article>
      <article class="panel"><div class="panel-head"><div><p class="eyebrow">Distributor</p><h3>Payment Details</h3></div></div><div class="panel-body"><form id="distributorForm" class="entry-form"></form></div></article>
    </section>
    ${importantPdfPanel("admin")}
    <article class="panel"><div class="panel-head"><div><p class="eyebrow">Records</p><h3>Employees Password Set / Reset</h3></div></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Mobile</th><th>ID No.</th><th>Field</th><th>Join Date</th><th>Status</th><th>New Password</th><th>Action</th></tr></thead><tbody id="employeeRows"></tbody></table></div></article>
    <article class="panel"><div class="panel-head"><div><p class="eyebrow">Records</p><h3>Distributors Date Wise Ledger</h3></div><button class="soft-btn" id="openDistributorBalance" type="button">Show Distributor Balance</button></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Name</th><th>Mobile</th><th>Type</th><th>Amount</th><th>Total Lena</th><th>Diya/Jama</th><th>Balance</th><th>Extra Jama</th><th>Notes</th><th>Action</th></tr></thead><tbody id="distributorRows"></tbody></table></div></article>
    <div id="distributorBalanceModal" class="modal-backdrop" hidden>
      <div class="modal small-modal">
        <div class="panel-head"><div><p class="eyebrow">Distributor</p><h3>Pending / Extra Balance</h3></div><button class="soft-btn" id="closeDistributorBalance" type="button">Close</button></div>
        <div class="panel-body">
          <label>Distributor Name <input id="balanceDistributorName" list="customerNameList" placeholder="Type distributor name"></label>
          <div id="distributorBalanceResult" class="notice-list"></div>
        </div>
      </div>
    </div>`;
  fillEmployeeForm();
  fillDistributorForm();
  renderAdminRows();
  bindDistributorBalanceModal();
  renderImportantPdfList();
}

let editingEmployeeId = null;
let editingDistributorId = null;

function fillEmployeeForm(employee = {}) {
  qs("#employeeForm").innerHTML = `
    <label>Name <input id="empName" list="customerNameList" required value="${employee.name || ""}"></label>
    <label>Username <input id="empUser" required value="${employee.username || ""}"></label>
    <label>Password <input id="empPass" required value="${employee.password || ""}"></label>
    <label>Mobile <input id="empMobile" list="mobileList" value="${employee.mobile || ""}"></label>
    <label>ID No. <input id="empIdNo" list="idNoList" value="${employee.idNo || ""}"></label>
    <label>Address <input id="empAddress" list="addressList" value="${employee.address || ""}"></label>
    <label>Join Date <input id="empJoinDate" type="date" value="${employee.joinDate || today()}"></label>
    <label>Field <select id="empRole"><option value="admin">Admin</option><option value="accounts">Accounts</option><option value="parts_manager">Parts Manager</option><option value="sales">Sales</option><option value="rto">RTO / Insurance</option></select></label>
    <label>Status <select id="empActive"><option value="true">Active</option><option value="false">Off</option></select></label>
    <button class="primary-btn" type="submit">${employee.id ? "Update" : "Add"} Employee</button>`;
  qs("#empRole").value = employee.role || "sales";
  qs("#empActive").value = String(employee.active ?? true);
  qs("#employeeForm").addEventListener("submit", saveEmployee);
}

function saveEmployee(event) {
  event.preventDefault();
  const old = state.employees.find((item) => item.id === editingEmployeeId) || {};
  const record = { ...old, id: editingEmployeeId || createId(), name: textValue("#empName"), username: textValue("#empUser"), password: textValue("#empPass"), mobile: textValue("#empMobile"), idNo: textValue("#empIdNo"), address: textValue("#empAddress"), joinDate: textValue("#empJoinDate"), role: textValue("#empRole"), active: textValue("#empActive") === "true" };
  const duplicate = state.employees.find((item) => same(item.username, record.username) && item.id !== record.id);
  if (duplicate) return showToast("Username already exists.");
  if (editingEmployeeId) state.employees[state.employees.findIndex((item) => item.id === editingEmployeeId)] = record;
  else state.employees.push(record);
  editingEmployeeId = null;
  saveState();
  pushStateToServer();
  fillEmployeeForm();
  renderAdminRows();
  showToast("Employee login saved.");
}

function fillDistributorForm(item = {}) {
  qs("#distributorForm").innerHTML = `
    <label>Name <input id="distName" list="customerNameList" required value="${item.name || ""}"></label>
    <label>Mobile <input id="distMobile" list="mobileList" value="${item.mobile || ""}"></label>
    <label>Date <input id="distDate" type="date" value="${today()}"></label>
    <label>Total Amount <input id="distTotalAmount" type="number" min="0" value="0"></label>
    <label>Paid Amount <input id="distPaidAmount" type="number" min="0" value="0"></label>
    <label>Pending <input id="distPendingAmount" type="number" value="${item.balance || 0}" readonly></label>
    <label>Extra <input id="distExtraAmount" type="number" value="${item.extra || 0}" readonly></label>
    <label class="wide">Personal Details / Notes <textarea id="distNotes">${item.notes || ""}</textarea></label>
    <button class="primary-btn" type="submit">${item.id ? "Update Distributor / Add Entry" : "Add Entry"}</button>`;
  qs("#distName").addEventListener("input", syncDistributorFormFromName);
  ["#distTotalAmount", "#distPaidAmount"].forEach((selector) => qs(selector).addEventListener("input", updateDistributorPaymentPreview));
  qs("#distributorForm").addEventListener("submit", saveDistributor);
  updateDistributorPaymentPreview();
}

function saveDistributor(event) {
  event.preventDefault();
  const name = textValue("#distName");
  const mobile = textValue("#distMobile");
  const notes = textValue("#distNotes");
  let record = editingDistributorId ? state.distributors.find((item) => item.id === editingDistributorId) : null;
  if (!record) record = state.distributors.find((item) => same(item.name, name) && (!mobile || same(item.mobile, mobile)));
  if (!record) {
    record = { id: createId(), name, mobile, notes };
    state.distributors.push(record);
  } else {
    record.name = name;
    record.mobile = mobile;
    record.notes = notes;
  }
  const totalAmount = numberValue("#distTotalAmount");
  const paidAmount = numberValue("#distPaidAmount");
  if (totalAmount > 0) {
    state.distributorTransactions.push({
      id: createId(),
      distributorId: record.id,
      date: textValue("#distDate") || today(),
      type: "bill",
      amount: totalAmount,
      notes,
    });
  }
  if (paidAmount > 0) {
    state.distributorTransactions.push({
      id: createId(),
      distributorId: record.id,
      date: textValue("#distDate") || today(),
      type: "paid",
      amount: paidAmount,
      notes,
    });
  }
  syncDistributorTotals();
  editingDistributorId = null;
  saveState();
  fillDistributorForm();
  renderAdminRows();
  showToast(totalAmount > 0 || paidAmount > 0 ? "Distributor payment details saved." : "Distributor details updated.");
}

function findDistributorByFormName() {
  const name = textValue("#distName");
  const mobile = textValue("#distMobile");
  return state.distributors.find((item) => same(item.name, name) || (mobile && same(item.mobile, mobile)));
}

function syncDistributorFormFromName() {
  const item = findDistributorByFormName();
  if (!item) {
    updateDistributorPaymentPreview();
    return;
  }
  editingDistributorId = item.id;
  qs("#distName").value = item.name || "";
  qs("#distMobile").value = item.mobile || "";
  qs("#distNotes").value = item.notes || "";
  updateDistributorPaymentPreview(item);
}

function updateDistributorPaymentPreview(item = findDistributorByFormName()) {
  const currentTotal = Number(item?.total || 0);
  const currentPaid = Number(item?.paid || 0);
  const nextTotal = currentTotal + numberValue("#distTotalAmount");
  const nextPaid = currentPaid + numberValue("#distPaidAmount");
  if (qs("#distPendingAmount")) qs("#distPendingAmount").value = Math.max(nextTotal - nextPaid, 0);
  if (qs("#distExtraAmount")) qs("#distExtraAmount").value = Math.max(nextPaid - nextTotal, 0);
}

function bindDistributorBalanceModal() {
  qs("#openDistributorBalance")?.addEventListener("click", () => {
    qs("#distributorBalanceModal").hidden = false;
    renderDistributorBalanceResult();
    qs("#balanceDistributorName")?.focus();
  });
  qs("#closeDistributorBalance")?.addEventListener("click", () => qs("#distributorBalanceModal").hidden = true);
  qs("#balanceDistributorName")?.addEventListener("input", renderDistributorBalanceResult);
}

function renderDistributorBalanceResult() {
  const box = qs("#distributorBalanceResult");
  if (!box) return;
  const query = normalize(qs("#balanceDistributorName")?.value);
  const rows = state.distributors.filter((item) => !query || normalize(item.name).includes(query) || normalize(item.mobile).includes(query));
  box.innerHTML = rows.length ? rows.map((item) => `
    <div class="notice">
      <strong>${item.name}</strong>
      Mobile: ${item.mobile || "-"}<br>
      Total: ${money(item.total)} | Paid: ${money(item.paid)}<br>
      Pending: ${money(item.balance)} | Extra: ${money(item.extra)}
    </div>`).join("") : `<div class="notice"><strong>No distributor found</strong>Distributor name type kare.</div>`;
}

function renderAdminRows() {
  qs("#employeeRows").innerHTML = state.employees.map((employee) => `<tr><td>${employee.name}</td><td>${employee.username}</td><td>${employee.mobile || "-"}</td><td>${employee.idNo || "-"}</td><td>${roleLabels[employee.role]}</td><td>${employee.joinDate || "-"}</td><td>${employee.active ? "Active" : "Off"}</td><td><input data-password-reset-input="${employee.id}" type="text" value="${escapeHtml(employee.password || "")}" placeholder="Set password"></td><td><details class="action-menu"><summary>Action</summary><div class="action-menu-list"><button class="edit-btn" data-record-edit="employee" data-id="${employee.id}">Update</button><button class="soft-btn" data-reset-employee-password="${employee.id}">Set Password</button><button class="delete-btn" data-delete-employee="${employee.id}">Delete</button></div></details></td></tr>`).join("");
  qs("#distributorRows").innerHTML = distributorLedgerRows().length ? distributorLedgerRows().map(({ item, entry }) => `<tr><td>${entry.date || "-"}</td><td>${item.name}</td><td>${item.mobile || "-"}</td><td>${entry.type === "paid" ? "Diya / Jama" : "Total Lena / Bill"}</td><td>${money(entry.amount)}</td><td>${money(item.total)}</td><td>${money(item.paid)}</td><td class="due">${money(item.balance)}</td><td class="ok">${money(item.extra)}</td><td>${entry.notes || item.notes || "-"}</td><td><details class="action-menu"><summary>Action</summary><div class="action-menu-list"><button class="edit-btn" data-record-edit="distributorLedger" data-id="${entry.id}">Update</button><button class="delete-btn" data-delete-distributor-entry="${entry.id}">Delete Entry</button><button class="delete-btn" data-delete-distributor="${item.id}">Delete All</button></div></details></td></tr>`).join("") : `<tr><td class="empty-row" colspan="11">No distributor ledger records.</td></tr>`;
  applyTablePagination();
}

function distributorLedgerRows() {
  syncDistributorTotals();
  const rows = state.distributorTransactions.map((entry) => ({ entry, item: state.distributors.find((dist) => dist.id === entry.distributorId) })).filter((row) => row.item);
  return rows.sort((a, b) => String(b.entry.date || "").localeCompare(String(a.entry.date || "")));
}

function importantPdfPanel(section) {
  return `
    <article class="panel important-pdf-panel pdf-launch-panel" data-pdf-section="${section}">
      <div class="panel-body pdf-launch-row">
        <button class="soft-btn" type="button" data-open-pdf-modal="${section}">Important PDF List</button>
        <span>${state.importantPdfs.length} files</span>
      </div>
    </article>
    <div class="modal-backdrop important-pdf-modal" data-pdf-modal="${section}" hidden>
      <div class="modal">
        <div class="panel-head">
          <div><p class="eyebrow">Important PDF</p><h3>Upload & List</h3></div>
          <button class="soft-btn" type="button" data-close-pdf-modal>Close</button>
        </div>
        <div class="panel-body">
          <form class="entry-form pdf-upload-form" data-pdf-upload-form="${section}">
            <label>PDF Name <input data-pdf-name required placeholder="PDF name set kare"></label>
            <label>PDF / Image File <input data-pdf-file type="file" accept="application/pdf,.pdf,image/*" required></label>
            <button class="primary-btn" type="submit">Upload</button>
          </form>
          <div class="filters compact-filter pdf-search-row"><input data-pdf-search placeholder="Search PDF list"></div>
        </div>
        <div class="table-wrap important-pdf-list"></div>
      </div>
    </div>`;
}

function renderImportantPdfList() {
  qsa(".important-pdf-list").forEach((box) => {
    const modal = box.closest("[data-pdf-modal]");
    const query = normalize(qs("[data-pdf-search]", modal)?.value);
    const rows = state.importantPdfs.filter((pdf) => !query || Object.values(pdf).join(" ").toLowerCase().includes(query)).slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const empty = `<tr><td class="empty-row" colspan="7">No important PDF uploaded.</td></tr>`;
    box.innerHTML = `<table class="compact-table"><thead><tr><th>Date</th><th>Name</th><th>From</th><th>Type</th><th>Size</th><th>Rename</th><th>Action</th></tr></thead><tbody>${rows.length ? rows.map((pdf) => `<tr><td>${pdf.date || "-"}</td><td>${escapeHtml(pdf.name || "-")}</td><td>${escapeHtml(pdf.section || "-")}</td><td>${pdf.sourceType === "image" ? "Image PDF" : "PDF"}</td><td>${formatBytes(pdf.size || 0)}</td><td><input data-pdf-rename-input="${pdf.id}" value="${escapeHtml(pdf.name || "")}"></td><td><details class="action-menu"><summary>Action</summary><div class="action-menu-list"><a class="soft-btn" href="${pdf.dataUrl}" target="_blank" rel="noopener">Open</a><button class="soft-btn" data-print-pdf="${pdf.id}">Print</button><button class="edit-btn" data-rename-pdf="${pdf.id}">Update Name</button><button class="delete-btn" data-delete-pdf="${pdf.id}">Delete</button></div></details></td></tr>`).join("") : empty}</tbody></table>`;
  });
  applyTablePagination();
}

async function uploadImportantPdf(event) {
  const form = event.target.closest("[data-pdf-upload-form]");
  if (!form) return;
  event.preventDefault();
  const file = qs("[data-pdf-file]", form).files[0];
  const name = qs("[data-pdf-name]", form).value.trim();
  if (!file || (!file.type.startsWith("image/") && file.type !== "application/pdf")) return showToast("PDF ya image file select kare.");
  try {
    const isImage = file.type.startsWith("image/");
    const dataUrl = isImage ? await imageFileToPdfDataUrl(file) : await readFileAsDataUrl(file);
    state.importantPdfs.push({
      id: createId(),
      name,
      fileName: file.name,
      section: form.dataset.pdfUploadForm,
      dataUrl,
      sourceType: isImage ? "image" : "pdf",
      size: Math.round((dataUrl.length * 3) / 4),
      date: today(),
      uploadedBy: currentUser()?.name || "",
    });
    saveState();
    form.reset();
    renderImportantPdfList();
    updateImportantPdfButtons();
    showToast(isImage ? "Image PDF me convert hokar upload ho gaya." : "Important PDF uploaded.");
  } catch {
    showToast("File upload nahi ho paya.");
  }
}

function updateImportantPdfButtons() {
  qsa(".pdf-launch-row span").forEach((item) => {
    item.textContent = `${state.importantPdfs.length} files`;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function imageFileToPdfDataUrl(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.68);
  return jpegDataUrlToPdfDataUrl(jpegDataUrl, canvas.width, canvas.height);
}

function jpegDataUrlToPdfDataUrl(jpegDataUrl, imageWidth, imageHeight) {
  const jpegBinary = atob(jpegDataUrl.split(",")[1]);
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 32;
  const scale = Math.min((pageWidth - margin * 2) / imageWidth, (pageHeight - margin * 2) / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;
  const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBinary.length} >>\nstream\n${jpegBinary}\nendstream`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.3\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return `data:application/pdf;base64,${btoa(pdf)}`;
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function printImportantPdf(id) {
  const pdf = state.importantPdfs.find((item) => item.id === id);
  if (!pdf) return;
  const win = window.open(pdf.dataUrl, "_blank");
  if (win) setTimeout(() => win.print(), 900);
}

function renderSales() {
  layout("sales", "Sales", "Bike Sale & Balance");
  qs("#pageRoot").innerHTML = `${statCards()}
    ${importantPdfPanel("sales")}
    <article class="panel"><div class="panel-body section-toggle-bar"><button class="primary-btn" data-sales-section="sell">Sell Bike</button><button class="soft-btn" data-sales-section="bike">Add Bike</button><button class="soft-btn" data-sales-section="list">Sales List</button><a class="soft-btn" href="lists.html#bike">Bike List</a></div></article>
    <article class="panel sales-section" data-sales-panel="bike" hidden><div class="panel-head"><div><p class="eyebrow">Bike Stock</p><h3>Add New Bike</h3></div></div><div class="panel-body"><form id="bikeForm" class="entry-form">
      <datalist id="bikeModelList">${bikeModelOptions()}</datalist><label>Bike Model <input id="bikeModel" list="bikeModelList" required placeholder="Select or type new model"></label><label>Category <input id="bikeCategory" placeholder="Auto / type for new model"></label><label>Frame No. <input id="bikeFrame" list="regFrameList" required></label><label>Engine No. <input id="bikeEngine" placeholder="Engine no."></label><label>Colour <input id="bikeColour" list="colourList"></label><label>Key No. <input id="bikeKey" list="keyNoList"></label><button class="primary-btn" type="submit">Add Bike</button>
    </form></div></article>
    <article class="panel sales-section" data-sales-panel="sell"><div class="panel-head"><div><p class="eyebrow">Sale</p><h3>Customer Sale Entry</h3></div></div><div class="panel-body"><form id="saleForm" class="entry-form">
      <label>Customer Name <input id="saleCustomer" list="customerNameList" required></label><label>Father / Husband Name <input id="saleGuardian" list="customerNameList"></label><label>ID No. <input id="saleIdNo" list="idNoList"></label><label>Mobile No. <input id="saleMobile" list="mobileList" required></label><label>Address <input id="saleAddress" list="addressList"></label><label>Frame No. <select id="saleFrame" required></select></label>
      <label>Bike Model <input id="saleBike" readonly></label><label>Payment Type <select id="salePayment"><option value="Cash">Cash</option><option value="Finance">Finance</option></select></label><label class="finance-sale-field" hidden>Down Payment <input id="saleDownPayment" type="number" min="0" value="0"></label><label class="finance-sale-field" hidden>EMI Month <input id="saleEmiMonth" type="number" min="1" value="12"></label><label class="finance-sale-field" hidden>Finance Company <input id="saleFinanceCompany" list="companyList"></label>
      <label>Sale Amount <input id="saleTotal" type="number" min="0" value="0"></label><label>Paid Amount <input id="salePaid" type="number" min="0" value="0"></label><label>Pending Payment <input id="salePending" type="number" min="0" value="0" readonly></label><label>Discount <input id="saleDiscount" type="number" min="0" value="0"></label><label>Date <input id="saleDate" type="date"></label>
      <button class="primary-btn" type="submit">Save Sale</button>
    </form></div></article>
    <article class="panel"><div class="panel-head"><div><p class="eyebrow">Notifications</p><h3>Sales Alerts</h3></div></div><div class="panel-body notice-list" id="noticeList"></div></article>
    <article class="panel sales-section" data-sales-panel="list" hidden><div class="panel-head"><div><p class="eyebrow">Records</p><h3>Sales List</h3></div><input id="salesSearch" placeholder="Search sale"></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Mobile</th><th>Bike</th><th>Frame</th><th>Payment</th><th>Finance</th><th>Total</th><th>Received</th><th>Pending</th><th>Discount</th><th>Action</th></tr></thead><tbody id="salesRows"></tbody></table></div></article>`;
  qs("#saleDate").value = today();
  bindSales();
  bindSalesSections();
  renderSalesData();
  renderNotices();
  renderImportantPdfList();
}

function bindSalesSections() {
  qsa("[data-sales-section]").forEach((button) => {
    button.addEventListener("click", () => showSalesSection(button.dataset.salesSection));
  });
}

function showSalesSection(section) {
  qsa("[data-sales-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.salesPanel !== section;
  });
  qsa("[data-sales-section]").forEach((button) => {
    button.classList.toggle("primary-btn", button.dataset.salesSection === section);
    button.classList.toggle("soft-btn", button.dataset.salesSection !== section);
  });
  applyTablePagination();
}

function bindSales() {
  qs("#bikeCategory").value = bikeCategoryMap()[qs("#bikeModel").value] || "";
  qs("#bikeModel").addEventListener("input", () => {
    const category = bikeCategoryMap()[qs("#bikeModel").value];
    if (category) qs("#bikeCategory").value = category;
  });
  qs("#salePayment").addEventListener("change", syncSalePaymentMode);
  qs("#saleDownPayment").addEventListener("input", syncSalePaymentMode);
  ["#saleTotal", "#salePaid", "#saleDiscount"].forEach((selector) => qs(selector).addEventListener("input", syncSaleBalance));
  qs("#bikeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const frameNo = textValue("#bikeFrame");
    const model = textValue("#bikeModel");
    const category = textValue("#bikeCategory") || "Motorcycle";
    if (state.bikes.some((bike) => same(bike.frameNo, frameNo))) return showToast("Frame number already exists.");
    if (!bikeCategoryMap()[model]) state.customBikeCategories[model] = category;
    state.bikes.push({ id: createId(), model, category, frameNo, engineNo: textValue("#bikeEngine"), colour: textValue("#bikeColour"), keyNo: textValue("#bikeKey") });
    saveState();
    event.target.reset();
    qs("#bikeModelList").innerHTML = bikeModelOptions();
    qs("#bikeCategory").value = "";
    location.href = "lists.html#bike";
    showToast("Bike added in new bike section.");
  });
  qs("#saleFrame").addEventListener("change", fillSaleBike);
  qs("#saleForm").addEventListener("submit", saveSale);
  qs("#salesSearch").addEventListener("input", renderSalesRows);
  syncSalePaymentMode();
}

function fillSaleBike() {
  const bike = state.bikes.find((item) => item.id === qs("#saleFrame").value);
  qs("#saleBike").value = bike ? `${bike.model} ${bike.colour || ""}`.trim() : "";
}

function syncSalePaymentMode() {
  const isFinance = qs("#salePayment").value === "Finance";
  qsa(".finance-sale-field").forEach((field) => {
    field.hidden = !isFinance;
  });
  if (isFinance) qs("#salePaid").value = qs("#saleDownPayment").value || 0;
  syncSaleBalance();
}

function syncSaleBalance() {
  const total = numberValue("#saleTotal");
  const paid = numberValue("#salePaid");
  const discount = numberValue("#saleDiscount");
  qs("#salePending").value = Math.max(total - paid - discount, 0);
}

function saveSale(event) {
  event.preventDefault();
  const bike = state.bikes.find((item) => item.id === qs("#saleFrame").value);
  if (!bike) return showToast("Select bike frame number.");
  const sale = {
    id: createId(),
    customer: textValue("#saleCustomer"),
    guardian: textValue("#saleGuardian"),
    idNo: textValue("#saleIdNo"),
    mobile: textValue("#saleMobile"),
    address: textValue("#saleAddress"),
    invoice: `SALE-${Date.now()}`,
    bike: qs("#saleBike").value,
    frameNo: bike.frameNo,
    engineNo: bike.engineNo,
    paymentType: textValue("#salePayment"),
    financeCompany: textValue("#saleFinanceCompany"),
    emiMonths: numberValue("#saleEmiMonth"),
    downPayment: numberValue("#saleDownPayment"),
    total: numberValue("#saleTotal"),
    paid: numberValue("#salePaid"),
    pending: numberValue("#salePending"),
    discount: numberValue("#saleDiscount"),
    date: textValue("#saleDate") || today(),
  };
  state.sales.push(sale);
  state.customers.push({ id: createId(), saleId: sale.id, name: sale.customer, mobile: sale.mobile, invoice: sale.invoice, bikeNo: sale.frameNo, paid: sale.paid, pending: sale.pending, date: sale.date });
  state.rto.push({ id: createId(), saleId: sale.id, customer: sale.customer, mobile: sale.mobile, invoice: sale.invoice, frameNo: sale.frameNo, status: "Pending", registrationNo: "", date: sale.date });
  state.insurance.push({ id: createId(), saleId: sale.id, customer: sale.customer, mobile: sale.mobile, invoice: sale.invoice, frameNo: sale.frameNo, status: "Pending", company: "", policyNo: "", expenses: 0, expiryDate: "", date: sale.date });
  state.bikes = state.bikes.filter((item) => item.id !== bike.id);
  saveState();
  event.target.reset();
  qs("#saleDate").value = today();
  renderPage();
  showToast("Sale saved. Bike moved to customer, RTO and insurance pending.");
}

function renderSalesData() {
  const select = qs("#saleFrame");
  select.innerHTML = `<option value="">Select frame no.</option>${state.bikes.map((bike) => `<option value="${bike.id}">${bike.frameNo} - ${bike.model}</option>`).join("")}`;
  fillSaleBike();
  renderSalesRows();
}

function renderSalesRows() {
  const query = normalize(qs("#salesSearch")?.value);
  const sales = visibleRowsForUser(state.sales).filter((sale) => !query || Object.values(sale).join(" ").toLowerCase().includes(query));
  qs("#salesRows").innerHTML = sales.length ? sales.slice().reverse().map((sale) => `<tr><td>${sale.date}</td><td>${sale.customer}</td><td>${sale.mobile}</td><td>${sale.bike}</td><td>${sale.frameNo}</td><td>${sale.paymentType || "Cash"}</td><td>${sale.financeCompany || "-"}</td><td>${money(sale.total)}</td><td>${money(sale.paid)}</td><td class="${sale.pending ? "due" : "ok"}">${money(sale.pending)}</td><td>${money(sale.discount)}</td><td><button class="soft-btn" data-open-customer-for="${sale.id}">Payment</button></td></tr>`).join("") : `<tr><td class="empty-row" colspan="12">No sales records.</td></tr>`;
  applyTablePagination();
}

function renderRtoInsurance() {
  layout("rto", "RTO & Insurance", "Pending / Completed");
  qs("#pageRoot").innerHTML = `
    <section class="grid-2">
      <article class="panel"><div class="panel-head"><div><p class="eyebrow">RTO</p><h3>Registration Work</h3></div><input id="rtoSearch" placeholder="Search RTO list"></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Invoice</th><th>Frame</th><th>RTO Name</th><th>Registration No.</th><th>Status</th><th>Action</th></tr></thead><tbody id="rtoRows"></tbody></table></div></article>
      <article class="panel"><div class="panel-head"><div><p class="eyebrow">Insurance</p><h3>Policy Work</h3></div><input id="insuranceSearch" placeholder="Search insurance list"></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Invoice</th><th>Company</th><th>Policy No.</th><th>Expiry Date</th><th>Status</th><th>Action</th></tr></thead><tbody id="insuranceRows"></tbody></table></div></article>
    </section>
    <article class="panel"><div class="panel-head"><div><p class="eyebrow">Reminder</p><h3>Insurance Renewal</h3></div></div><div class="panel-body notice-list" id="noticeList"></div></article>`;
  qs("#rtoSearch").addEventListener("input", renderRtoRows);
  qs("#insuranceSearch").addEventListener("input", renderInsuranceRows);
  renderRtoRows();
  renderInsuranceRows();
  renderNotices();
}

function renderRtoRows() {
  const query = normalize(qs("#rtoSearch")?.value);
  const rows = visibleRowsForUser(state.rto).filter((item) => !query || Object.values(item).join(" ").toLowerCase().includes(query));
  qs("#rtoRows").innerHTML = rows.length ? rows.map((item) => `<tr><td>${item.customer}</td><td>${item.invoice}</td><td>${item.frameNo}</td><td><input value="${item.rtoName || ""}" list="rtoNameList" data-rto-name="${item.id}" placeholder="RTO name"></td><td><input value="${item.registrationNo || ""}" list="regFrameList" data-rto-reg="${item.id}" placeholder="Registration no."></td><td class="${item.status === "Completed" ? "ok" : "due"}">${item.status}</td><td><button class="primary-btn" data-complete-rto="${item.id}">Save</button></td></tr>`).join("") : `<tr><td class="empty-row" colspan="7">No RTO records.</td></tr>`;
  applyTablePagination();
}

function renderInsuranceRows() {
  const query = normalize(qs("#insuranceSearch")?.value);
  const rows = visibleRowsForUser(state.insurance).filter((item) => !query || Object.values(item).join(" ").toLowerCase().includes(query));
  qs("#insuranceRows").innerHTML = rows.length ? rows.map((item) => {
    const status = insuranceDisplayStatus(item);
    return `<tr><td>${item.customer}</td><td>${item.invoice}</td><td><input value="${item.company || ""}" list="companyList" data-ins-company="${item.id}" placeholder="Company"></td><td><input value="${item.policyNo || ""}" data-ins-policy="${item.id}" placeholder="Policy no."></td><td><input type="date" value="${item.expiryDate || item.nextDate || ""}" data-ins-expiry="${item.id}"></td><td class="${status === "Completed" ? "ok" : "due"}">${status}</td><td><button class="primary-btn" data-complete-ins="${item.id}">Save</button></td></tr>`;
  }).join("") : `<tr><td class="empty-row" colspan="7">No insurance records.</td></tr>`;
  applyTablePagination();
}

function insuranceReminders() {
  const ms30 = 30 * 24 * 60 * 60 * 1000;
  return state.insurance.filter((item) => {
    const expiryText = item.expiryDate || item.nextDate;
    if (!expiryText) return false;
    const diff = dateDiffFromToday(expiryText);
    return insuranceDisplayStatus(item) === "Completed" && diff <= ms30 && diff >= 0;
  });
}

function renderCustomer() {
  layout("customer", "Customers", "Payment & Pending List");
  qs("#pageRoot").innerHTML = `${statCards()}
    <article class="panel"><div class="panel-head"><div><p class="eyebrow">Search</p><h3>Customer List</h3></div><div class="filters"><input id="customerSearch" placeholder="Mobile, invoice, bike no."><button class="primary-btn" data-open-customer>Add Customer Entry</button></div></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Name</th><th>Mobile</th><th>Invoice</th><th>Bike / Frame</th><th>Paid</th><th>Pending</th><th>Action</th></tr></thead><tbody id="customerRows"></tbody></table></div></article>`;
  qs("#customerSearch").addEventListener("input", renderCustomerRows);
  qs("[data-open-customer]").addEventListener("click", () => openCustomerModal());
  renderCustomerRows();
}

function renderCustomerRows() {
  const query = normalize(qs("#customerSearch")?.value);
  const rows = visibleRowsForUser(state.customers).filter((item) => !query || Object.values(item).join(" ").toLowerCase().includes(query));
  const canDelete = currentUser()?.role === "admin";
  qs("#customerRows").innerHTML = rows.length ? rows.slice().reverse().map((item) => `<tr><td>${item.date}</td><td>${item.name}</td><td>${item.mobile}</td><td>${item.invoice}</td><td>${item.bikeNo || "-"}</td><td>${money(item.paid)}</td><td class="${item.pending ? "due" : "ok"}">${money(item.pending)}</td><td><div class="row-actions"><button class="edit-btn" data-edit-customer="${item.id}">Edit</button>${canDelete ? `<button class="delete-btn" data-delete-customer="${item.id}">Delete</button>` : ""}</div></td></tr>`).join("") : `<tr><td class="empty-row" colspan="8">No customer records.</td></tr>`;
  applyTablePagination();
}

function renderParts() {
  layout("parts", "Parts", "Parts Allocation");
  qs("#pageRoot").innerHTML = `${partsSummaryCards()}${partsDetailPanels()}
    ${importantPdfPanel("parts")}
    <article class="panel"><div class="panel-body section-toggle-bar"><button class="primary-btn" data-parts-section="sell">Sell Parts</button><button class="soft-btn" data-parts-section="return">Return Parts</button><button class="soft-btn" data-parts-section="buy">Buy Parts</button><button class="soft-btn" data-parts-section="list">Parts List</button></div></article>
    <article class="panel parts-section" data-parts-panel="sell">
      <div class="panel-head">
        <div><p class="eyebrow">Issue / Return</p><h3>Sell Parts Entry</h3></div>
        <div class="parts-panel-actions">
          <label>Invoice / VN No. <input id="partsInvoice" list="invoiceList" placeholder="Invoice or VN number"></label>
          <label>Registration No. <input id="partsRegistration" list="regFrameList" placeholder="Registration number"></label>
          <button class="soft-btn" id="addJobPartRow" type="button">+ Add Parts</button>
          <button class="primary-btn" id="saveJobParts" type="button">Save</button>
        </div>
      </div>
      <datalist id="partsDatalist">${partsDatalistOptions()}</datalist>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Part No *</th><th>Part Name</th><th>Common Name</th><th>Available Qty</th><th>MRP</th><th>Issued Quantity</th></tr></thead>
          <tbody id="partsRows"></tbody>
        </table>
      </div>
      <div id="invoicePartsBox" class="panel-body notice-list"></div>
    </article>

    <article class="panel parts-section" data-parts-panel="return" hidden>
      <div class="panel-head">
        <div><p class="eyebrow">Return</p><h3>Parts Return Entry</h3></div>
        <div class="parts-panel-actions">
          <label>Invoice / VN No. <input id="returnInvoice" list="invoiceList" placeholder="Invoice or VN number"></label>
          <label>Registration No. <input id="returnRegistration" list="regFrameList" placeholder="Registration number"></label>
          <button class="soft-btn" id="searchReturnParts" type="button">Search</button>
          <button class="soft-btn" id="addReturnPartRow" type="button">+ Add Parts</button>
          <button class="primary-btn" id="saveReturnParts" type="button">Save Return</button>
        </div>
      </div>
      <datalist id="returnPartsDatalist">${partsDatalistOptions()}</datalist>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Part No *</th><th>Part Name</th><th>Sold Qty</th><th>MRP</th><th>Return Quantity</th><th>Return Amount</th></tr></thead>
          <tbody id="returnPartsRows"></tbody>
        </table>
      </div>
      <div id="returnPartsLookup" class="panel-body notice-list"></div>
    </article>

    <article class="panel parts-section" data-parts-panel="buy" hidden>
      <div class="panel-head">
        <div><p class="eyebrow">Buy / Add Stock</p><h3>New Parts Entry</h3></div>
        ${partsImportExportActions("importPartsExcel", "exportPartsExcel")}
      </div>
      <datalist id="buyPartsDatalist">${partsDatalistOptions()}</datalist>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Part No *</th><th>Part Name</th><th>Common Name</th><th>Available Qty</th><th>MRP</th><th>Rack No.</th><th>Low Alert</th><th>Quantity Add</th></tr></thead>
          <tbody id="buyPartsRows"></tbody>
        </table>
      </div>
      <div class="panel-body top-actions">
        <button class="soft-btn" id="addBuyPartRow" type="button">+ Add Parts</button>
        <button class="primary-btn" id="saveBuyParts" type="button">Save Stock</button>
      </div>
    </article>

    <article class="panel parts-section" data-parts-panel="list" hidden>
      <div class="panel-head">
        <div><p class="eyebrow">Stock</p><h3>Parts List</h3></div>
        ${partsImportExportActions("importPartsExcelList", "exportPartsExcelList")}
      </div>
      <div class="panel-body filters compact-filter"><input id="partsPageSearch" placeholder="Search parts list"></div>
      <div id="partsPageListBox" class="table-wrap"></div>
    </article>

    <div id="mrpChoiceModal" class="modal-backdrop" hidden>
      <div class="modal small-modal">
        <div class="panel-head">
          <div><p class="eyebrow">Select MRP</p><h3>Same Part No. Found</h3></div>
          <button class="soft-btn" id="closeMrpChoice" type="button">Close</button>
        </div>
        <div id="mrpChoiceList" class="panel-body notice-list"></div>
      </div>
    </div>

    `;
  bindGlobalPartsCards();
  bindParts();
  renderPartsStats();
  renderPartsList();
  renderPartsRows();
  renderReturnPartsRows();
  renderBuyPartsRows();
  renderPartsPageList();
  renderImportantPdfList();
  showPartsSection("sell");
}

function partsImportExportActions(importId, exportId) {
  return `
    <div class="parts-panel-actions parts-io-actions">
      <button class="soft-btn" id="${exportId}" type="button">Export Parts</button>
      <label class="soft-btn file-btn">Import Parts
        <input id="${importId}" type="file" accept=".xls,.html,.csv,.tsv,.txt" hidden>
      </label>
      <small>Import columns: Part No, Part Name, Common Name, Rack No</small>
    </div>`;
}

function renderLists() {
  layout("lists", "Lists", "Section Wise Records");
  qs("#pageRoot").innerHTML = `
    <article class="panel">
      <div class="panel-head">
        <div><p class="eyebrow">All Lists</p><h3>Click Section To Show List</h3></div>
      </div>
      <div class="panel-body">
        <div class="tabs">
          <button class="primary-btn" data-list-tab="bike">New Bike List</button>
          <button class="soft-btn" data-list-tab="customer">Customer List</button>
          <button class="soft-btn" data-list-tab="sales">Sales List</button>
          <button class="soft-btn" data-list-tab="rto">RTO List</button>
          <button class="soft-btn" data-list-tab="insurance">Insurance List</button>
          <button class="soft-btn" data-list-tab="parts">Parts List</button>
          <button class="soft-btn" data-list-tab="payments">Payment List</button>
        </div>
      </div>
      <div id="listOutput" class="list-output"></div>
    </article>`;
  qsa("[data-list-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      qsa("[data-list-tab]").forEach((item) => {
        item.classList.toggle("primary-btn", item === button);
        item.classList.toggle("soft-btn", item !== button);
      });
      location.hash = button.dataset.listTab;
      renderListTab(button.dataset.listTab);
    });
  });
  const activeType = (location.hash || "#bike").replace("#", "").split("?")[0] || "bike";
  qsa("[data-list-tab]").forEach((item) => {
    item.classList.toggle("primary-btn", item.dataset.listTab === activeType);
    item.classList.toggle("soft-btn", item.dataset.listTab !== activeType);
  });
  renderListTab(activeType);
}

function renderListTab(type) {
  const output = qs("#listOutput");
  const previousType = output.dataset.type;
  const searchText = previousType === type ? (qs("#listSearch")?.value || "") : "";
  output.dataset.type = type;
  const empty = (colspan, text) => `<tr><td class="empty-row" colspan="${colspan}">${text}</td></tr>`;
  const searchable = ["bike", "customer", "sales", "rto", "insurance", "parts", "payments"].includes(type);
  const query = normalize(searchText);
  const wrapList = (html) => `${searchable ? `<div class="panel-body filters"><input id="listSearch" placeholder="Search ${type} list" value="${searchText}"></div>` : ""}<div class="table-wrap">${html}</div>`;
  const applyListSearch = (rows) => rows.filter((item) => !query || Object.values(item).join(" ").toLowerCase().includes(query));
  const canDelete = currentUser()?.role === "admin";
  const deleteAction = (name, id) => canDelete ? `<button class="delete-btn" data-${name}="${id}">Delete</button>` : "";
  const actionMenu = (items) => `<details class="action-menu"><summary>Action</summary><div class="action-menu-list">${items.filter(Boolean).join("")}</div></details>`;
  if (type === "bike") {
    const rows = applyListSearch(state.bikes);
    output.innerHTML = wrapList(`<table><thead><tr><th>Model</th><th>Category</th><th>Frame</th><th>Engine</th><th>Colour</th><th>Key</th><th>Action</th></tr></thead><tbody>${rows.length ? rows.map((bike) => `<tr><td>${bike.model}</td><td>${bike.category || "-"}</td><td>${bike.frameNo}</td><td>${bike.engineNo}</td><td>${bike.colour || "-"}</td><td>${bike.keyNo || "-"}</td><td>${actionMenu([`<button class="edit-btn" data-record-edit="bike" data-id="${bike.id}">Update</button>`, deleteAction("delete-bike", bike.id)])}</td></tr>`).join("") : empty(7, "No new bikes available.")}</tbody></table>`);
  }
  if (type === "customer") {
    const rows = applyListSearch(visibleRowsForUser(state.customers));
    output.innerHTML = wrapList(`<table><thead><tr><th>Date</th><th>Name</th><th>Mobile</th><th>Invoice</th><th>Bike / Frame</th><th>Paid</th><th>Pending</th><th>Action</th></tr></thead><tbody>${rows.length ? rows.map((item) => `<tr><td>${item.date || "-"}</td><td>${item.name || item.customer || "-"}</td><td>${item.mobile || "-"}</td><td>${item.invoice || "-"}</td><td>${item.bikeNo || item.frameNo || "-"}</td><td>${money(item.paid)}</td><td class="${item.pending ? "due" : "ok"}">${money(item.pending)}</td><td>${actionMenu([`<button class="edit-btn" data-edit-customer="${item.id}">Update</button>`, `<button class="soft-btn" data-receive-pending="Customer" data-id="${item.id}">Receive</button>`, deleteAction("delete-customer", item.id)])}</td></tr>`).join("") : empty(8, "No customer records.")}</tbody></table>`);
  }
  if (type === "sales") {
    const rows = applyListSearch(visibleRowsForUser(state.sales));
    output.innerHTML = wrapList(`<table><thead><tr><th>Date</th><th>Customer</th><th>Mobile</th><th>Bike</th><th>Frame</th><th>Payment</th><th>Paid</th><th>Pending</th><th>Action</th></tr></thead><tbody>${rows.length ? rows.map((sale) => `<tr><td>${sale.date || "-"}</td><td>${sale.customer || "-"}</td><td>${sale.mobile || "-"}</td><td>${sale.bike || "-"}</td><td>${sale.frameNo || "-"}</td><td>${sale.paymentType || "-"}</td><td>${money(sale.paid)}</td><td class="${sale.pending ? "due" : "ok"}">${money(sale.pending)}</td><td>${actionMenu([`<button class="edit-btn" data-record-edit="sale" data-id="${sale.id}">Update Sale</button>`, `<button class="soft-btn" data-open-customer-for="${sale.id}">Update Payment</button>`, deleteAction("delete-sale", sale.id)])}</td></tr>`).join("") : empty(9, "No sales records.")}</tbody></table>`);
  }
  if (type === "rto") {
    const rows = applyListSearch(visibleRowsForUser(state.rto));
    output.innerHTML = wrapList(`<table><thead><tr><th>Customer</th><th>Invoice</th><th>Frame</th><th>RTO Name</th><th>Registration</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.length ? rows.map((item) => `<tr><td>${item.customer || "-"}</td><td>${item.invoice || "-"}</td><td>${item.frameNo || "-"}</td><td>${item.rtoName || "-"}</td><td>${item.registrationNo || "-"}</td><td class="${item.status === "Completed" ? "ok" : "due"}">${item.status || "Pending"}</td><td>${actionMenu([`<button class="edit-btn" data-record-edit="rto" data-id="${item.id}">Update</button>`, deleteAction("delete-rto", item.id)])}</td></tr>`).join("") : empty(7, "No RTO records.")}</tbody></table>`);
  }
  if (type === "insurance") {
    const rows = applyListSearch(visibleRowsForUser(state.insurance));
    output.innerHTML = wrapList(`<table><thead><tr><th>Customer</th><th>Mobile</th><th>Invoice</th><th>Company</th><th>Policy</th><th>Expiry</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.length ? rows.map((item) => {
      const status = insuranceDisplayStatus(item);
      return `<tr><td>${item.customer || "-"}</td><td>${item.mobile || "-"}</td><td>${item.invoice || "-"}</td><td>${item.company || "-"}</td><td>${item.policyNo || "-"}</td><td>${item.expiryDate || item.nextDate || "-"}</td><td class="${status === "Completed" ? "ok" : "due"}">${status}</td><td>${actionMenu([`<button class="edit-btn" data-record-edit="insurance" data-id="${item.id}">Update</button>`, deleteAction("delete-insurance", item.id)])}</td></tr>`;
    }).join("") : empty(8, "No insurance records.")}</tbody></table>`);
  }
  if (type === "parts") {
    const rows = applyListSearch(state.parts);
    output.innerHTML = wrapList(`<table><thead><tr><th>Part No.</th><th>Name</th><th>Common Name</th><th>Rack No.</th><th>Stock</th><th>Low Alert</th><th>MRP</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.length ? rows.map((part) => `<tr><td>${part.partNo || "-"}</td><td>${part.name}</td><td>${part.commonName || "-"}</td><td>${part.rackNo || "-"}</td><td>${part.stock}</td><td>${part.low}</td><td>${money(part.sale)}</td><td class="${Number(part.stock) <= Number(part.low || 0) ? "due" : "ok"}">${Number(part.stock) <= Number(part.low || 0) ? "Low" : "OK"}</td><td>${actionMenu([`<button class="edit-btn" data-record-edit="part" data-id="${part.id}">Update</button>`, deleteAction("delete-part", part.id)])}</td></tr>`).join("") : empty(9, "No parts records.")}</tbody></table>`);
  }
  if (type === "payments") {
    const paymentRows = state.paymentLogs.length ? state.paymentLogs.slice().reverse() : visibleRowsForUser(state.customers).slice().reverse();
    const rows = applyListSearch(paymentRows);
    const paymentDelete = (id) => canDelete && state.paymentLogs.length ? `<button class="delete-btn" data-delete-payment-log="${id}">Delete</button>` : "";
    output.innerHTML = wrapList(`<table><thead><tr><th>Date</th><th>Name</th><th>Mobile</th><th>Invoice</th><th>Reg / Frame</th><th>Total Amount</th><th>Parts Amount</th><th>Service Charge</th><th>Received</th><th>Discount</th><th>Pending</th><th>Action</th></tr></thead><tbody>${rows.length ? rows.map((item) => `<tr><td>${item.date || "-"}</td><td>${item.name || item.customer || "-"}</td><td>${item.mobile || "-"}</td><td>${item.invoice || "-"}</td><td>${item.bikeNo || item.frameNo || "-"}</td><td>${money(item.total || Number(item.paid || 0) + Number(item.pending || 0) + Number(item.discount || 0))}</td><td>${money(item.partsAmount || 0)}</td><td>${money(item.extra || 0)}</td><td>${money(item.paid)}</td><td>${money(item.discount || 0)}</td><td class="${item.pending ? "due" : "ok"}">${money(item.pending)}</td><td>${actionMenu([`<button class="soft-btn" data-receive-pending="Customer" data-id="${item.customerId || item.id}">Receive</button>`, `<button class="edit-btn" data-edit-customer="${item.customerId || item.id}">Update</button>`, paymentDelete(item.id)])}</td></tr>`).join("") : empty(12, "No payment records.")}</tbody></table>`);
  }
  qs("#listSearch")?.addEventListener("input", () => renderListTab(type));
  if (searchable && query && qs("#listSearch")) {
    const input = qs("#listSearch");
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  applyTablePagination();
}

function bindParts() {
  qsa("[data-parts-section]").forEach((button) => {
    button.addEventListener("click", () => showPartsSection(button.dataset.partsSection));
  });
  qsa("[data-job-tab]").forEach((button) => {
    button.addEventListener("click", () => openJobTab(button.dataset.jobTab));
  });
  qs("#saveMechanic")?.addEventListener("click", saveMechanic);
  qs("#saveLabour")?.addEventListener("click", saveLabour);
  qs("#bulkAdd")?.addEventListener("click", () => {
    textValue("#bulkParts").split(/\n+/).map((line) => line.split(",").map((x) => x.trim())).filter((row) => row[0]).forEach(([name, partNo, stock, low, purchase, sale]) => state.parts.push({ id: createId(), name, partNo, stock: Number(stock || 0), low: Number(low || 2), purchase: Number(purchase || 0), sale: Number(sale || 0) }));
    saveState();
    qs("#bulkParts").value = "";
    renderPartsRows();
    showToast("Bulk parts added.");
  });
  qs("#addJobPartRow").addEventListener("click", () => addJobPartRow());
  qs("#addReturnPartRow")?.addEventListener("click", () => addReturnPartRow());
  qs("#saveReturnParts")?.addEventListener("click", saveReturnParts);
  qs("#sellPartsMode")?.addEventListener("click", () => setPartsMode("sell"));
  qs("#addBuyPartRow")?.addEventListener("click", () => addBuyPartRow());
  qs("#saveBuyParts")?.addEventListener("click", saveBuyParts);
  qsa("#exportPartsExcel, #exportPartsExcelList").forEach((button) => button.addEventListener("click", exportPartsExcel));
  qsa("#importPartsExcel, #importPartsExcelList").forEach((input) => input.addEventListener("change", importPartsExcel));
  qs("#partsPageSearch")?.addEventListener("input", renderPartsPageList);
  qs("#closeMrpChoice")?.addEventListener("click", () => qs("#mrpChoiceModal").hidden = true);
  qs("#partsInvoice")?.addEventListener("input", renderInvoiceParts);
  qs("#partsRegistration")?.addEventListener("input", renderInvoiceParts);
  qs("#returnInvoice")?.addEventListener("input", refreshReturnSoldQty);
  qs("#returnRegistration")?.addEventListener("input", refreshReturnSoldQty);
  qs("#searchReturnParts")?.addEventListener("click", fillReturnRowsFromReference);
  qs("#batteryMode")?.addEventListener("click", () => applyIssueMode("Battery"));
  qs("#warrantyMode")?.addEventListener("click", () => applyIssueMode("Warranty"));
  qs("#serviceRequest")?.addEventListener("click", createServiceRequest);
  qs("#saveJobParts").addEventListener("click", saveJobParts);
  qs("#exportParts")?.addEventListener("click", exportParts);
  qs("#importParts")?.addEventListener("change", importParts);
}

function bindStatCard(selector, handler) {
  const card = qs(selector);
  if (!card) return;
  card.addEventListener("click", handler);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler();
    }
  });
}

function applyTablePagination(root = document) {
  qsa(".table-pager", root).forEach((pager) => pager.remove());
  qsa(".table-wrap table", root).forEach((table) => {
    applyResponsiveTableLabels(table);
    const tbody = qs("tbody", table);
    if (!tbody || tbody.id === "partsRows") return;
    const rows = qsa("tr", tbody);
    if (rows.length <= TABLE_PAGE_SIZE || rows.some((row) => row.querySelector(".empty-row"))) {
      rows.forEach((row) => row.hidden = false);
      return;
    }
    let page = Number(table.dataset.page || 1);
    const pages = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE));
    page = Math.min(Math.max(page, 1), pages);
    table.dataset.page = page;
    rows.forEach((row, index) => {
      row.hidden = index < (page - 1) * TABLE_PAGE_SIZE || index >= page * TABLE_PAGE_SIZE;
    });
    const pager = document.createElement("div");
    pager.className = "table-pager";
    pager.innerHTML = `
      <button class="soft-btn" type="button" data-page-prev ${page === 1 ? "disabled" : ""}>Prev</button>
      <span>Page ${page} / ${pages} · ${rows.length} records</span>
      <button class="soft-btn" type="button" data-page-next ${page === pages ? "disabled" : ""}>Next</button>`;
    table.closest(".table-wrap").after(pager);
    qs("[data-page-prev]", pager)?.addEventListener("click", () => {
      table.dataset.page = page - 1;
      applyTablePagination(root);
    });
    qs("[data-page-next]", pager)?.addEventListener("click", () => {
      table.dataset.page = page + 1;
      applyTablePagination(root);
    });
  });
}

function applyResponsiveTableLabels(table) {
  const labels = qsa("thead th", table).map((th) => th.textContent.trim());
  if (!labels.length) return;
  qsa("tbody tr", table).forEach((row) => {
    qsa("td", row).forEach((cell, index) => {
      if (labels[index]) cell.dataset.label = labels[index];
    });
  });
  qsa("tfoot tr", table).forEach((row) => {
    qsa("th, td", row).forEach((cell, index) => {
      if (labels[index]) cell.dataset.label = labels[index];
    });
  });
}

let partsMode = "sell";

function setPartsMode(mode) {
  partsMode = mode;
  qs("#sellPartsMode")?.classList.toggle("active-mode", mode === "sell");
  showToast("Sell mode selected.");
}

function openJobTab(tabName) {
  qsa("[data-job-tab]").forEach((button) => button.classList.toggle("active", button.dataset.jobTab === tabName));
  qsa("[data-job-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.jobPanel !== tabName;
  });
}

function saveMechanic() {
  const name = textValue("#mechanicName");
  const work = textValue("#mechanicWork");
  if (!name || !work) return showToast("Mechanic name and work required.");
  state.mechanics.push({ id: createId(), name, work, status: textValue("#mechanicStatus"), date: today() });
  saveState();
  qs("#mechanicName").value = "";
  qs("#mechanicWork").value = "";
  renderMechanicRows();
  showToast("Mechanic allocation saved.");
}

function saveLabour() {
  const name = textValue("#labourName");
  const work = textValue("#labourWork");
  if (!name || !work) return showToast("Labour name and work required.");
  state.labourLines.push({ id: createId(), name, work, amount: numberValue("#labourAmount"), date: today() });
  saveState();
  qs("#labourName").value = "";
  qs("#labourWork").value = "";
  qs("#labourAmount").value = 0;
  renderLabourRows();
  showToast("Labour line saved.");
}

function renderMechanicRows() {
  const rows = qs("#mechanicRows");
  if (!rows) return;
  rows.innerHTML = state.mechanics.length
    ? state.mechanics.slice().reverse().map((item) => `<tr><td>${item.name}</td><td>${item.work}</td><td>${item.status}</td><td>${item.date}</td></tr>`).join("")
    : `<tr><td class="empty-row" colspan="4">No mechanic allocation.</td></tr>`;
}

function renderLabourRows() {
  const rows = qs("#labourRows");
  if (!rows) return;
  rows.innerHTML = state.labourLines.length
    ? state.labourLines.slice().reverse().map((item) => `<tr><td>${item.name}</td><td>${item.work}</td><td>${money(item.amount)}</td><td>${item.date}</td></tr>`).join("")
    : `<tr><td class="empty-row" colspan="4">No labour lines.</td></tr>`;
}

function renderPartsRows() {
  qs("#partsRows").innerHTML = jobPartRow();
  bindJobPartRows();
  updatePartsSummary();
  renderPartsStats();
}

function renderReturnPartsRows() {
  const rows = qs("#returnPartsRows");
  if (!rows) return;
  rows.innerHTML = returnPartRow();
  bindReturnPartRows();
}

function renderBuyPartsRows() {
  const rows = qs("#buyPartsRows");
  if (!rows) return;
  rows.innerHTML = buyPartRow();
  bindBuyPartRows();
}

function renderPartsStats() {
  if (!qs("#partsStockCount")) return;
  const stockCount = state.parts.length;
  const lowCount = state.parts.filter((part) => Number(part.stock || 0) <= Number(part.low || 0)).length;
  const issuedToday = state.partSales.filter((sale) => sale.date === today()).reduce((sum, sale) => sum + Number(sale.qty || 0), 0);
  const value = state.parts.reduce((sum, part) => sum + Number(part.stock || 0) * Number(part.sale || 0), 0);
  qs("#partsStockCount").textContent = stockCount;
  qs("#partsLowCount").textContent = lowCount;
  qs("#partsIssuedToday").textContent = issuedToday;
  if (qs("#partsValueTotal")) qs("#partsValueTotal").textContent = money(value);
}

function showIssuedTodayDetails() {
  const panel = qs("#issuedTodayPanel");
  const box = qs("#issuedTodayDetails");
  if (!panel || !box) return;
  const rows = state.partSales
    .filter((sale) => sale.date === today() && Number(sale.qty || 0) > 0)
    .slice()
    .reverse();
  panel.hidden = false;
  box.innerHTML = rows.length
    ? `<table><thead><tr><th>Invoice / VN</th><th>Registration</th><th>Part No.</th><th>Part Name</th><th>Common Name</th><th>Issued Qty</th><th>Returned Qty</th><th>Net Qty</th><th>Amount</th><th>Action</th></tr></thead><tbody>${rows.map((sale) => {
        const part = state.parts.find((item) => item.id === sale.partId);
        const issued = Number(sale.originalQty || 0) || Number(sale.qty || 0) + Number(sale.returnedQty || 0);
        const returned = Number(sale.returnedQty || 0);
        const reference = sale.invoice || sale.registrationNo || sale.id;
        return `<tr><td>${sale.invoice || "-"}</td><td>${sale.registrationNo || "-"}</td><td>${part?.partNo || sale.partNo || "-"}</td><td>${sale.name || part?.name || "-"}</td><td>${sale.commonName || part?.commonName || "-"}</td><td>${issued}</td><td>${returned}</td><td>${Number(sale.qty || 0)}</td><td>${money(sale.amount)}</td><td><button class="soft-btn" data-receive-parts="${reference}">Receive</button></td></tr>`;
      }).join("")}</tbody></table>`
    : `<table><tbody><tr><td class="empty-row">Today koi part issue nahi hua.</td></tr></tbody></table>`;
  applyTablePagination();
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function partsAmountForReference(reference) {
  return invoicePartRows(reference).reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
}

function openPartsPayment(reference) {
  const amount = partsAmountForReference(reference);
  if (!amount) return showToast("Is invoice / registration par parts amount nahi mila.");
  const { sales, customers, linkedRto } = linkedRecordsForReference(reference);
  const customer = customers[0] || sales[0] || {};
  openCustomerModal({
    name: customer.name || customer.customer || "Parts Sale",
    mobile: customer.mobile || "",
    invoice: customer.invoice || linkedRto?.invoice || reference,
    bikeNo: customer.bikeNo || customer.frameNo || customer.registrationNo || linkedRto?.registrationNo || reference,
    partsAmount: amount,
    total: amount,
    paid: 0,
    discount: 0,
    pending: amount,
  });
}

function partInputValue(part = {}) {
  return part.id ? `${part.partNo || part.name} | ${part.name || ""} | MRP ${Number(part.sale || 0)}` : "";
}

function partsDatalistOptions() {
  return state.parts.map((part) => `<option value="${partInputValue(part)}"></option>`).join("");
}

function jobPartRow(part = {}) {
  const sale = Number(part.sale || part.mrp || 0);
  return `
    <tr class="job-part-row ${part.id ? "active" : ""}" data-part-row data-issue-mode="Normal">
      <td><input class="job-part-search" list="partsDatalist" placeholder="Type part no." value="${partInputValue(part)}"><input class="job-part-id" type="hidden" value="${part.id || ""}"></td>
      <td class="part-name">${part.name || ""}</td>
      <td class="part-common">${part.commonName || ""}</td>
      <td class="part-free">${part.stock || ""}</td>
      <td class="part-mrp">${sale}</td>
      <td><input class="issued-input" type="number" min="0" value="0"></td>
    </tr>`;
}

function returnPartRow(part = {}) {
  return `
    <tr class="job-part-row ${part.id ? "active" : ""}" data-return-part-row>
      <td><input class="return-part-search" list="returnPartsDatalist" placeholder="Type part no." value="${partInputValue(part)}"><input class="return-part-id" type="hidden" value="${part.id || ""}"></td>
      <td class="return-part-name">${part.name || ""}</td>
      <td class="return-sold-qty">0</td>
      <td class="return-mrp">${Number(part.sale || 0)}</td>
      <td><input class="return-qty" type="number" min="0" value="0"></td>
      <td class="return-amount">${money(0)}</td>
    </tr>`;
}

function buyPartRow(part = {}) {
  return `
    <tr class="job-part-row ${part.id ? "active" : ""}" data-buy-part-row>
      <td><input class="buy-part-search" list="buyPartsDatalist" placeholder="Type part no." value="${partInputValue(part)}"><input class="buy-part-id" type="hidden" value="${part.id || ""}"></td>
      <td><input class="buy-part-name" list="partNameList" placeholder="Part name" value="${part.name || ""}"></td>
      <td><input class="buy-common-name" list="partCommonNameList" placeholder="Common name" value="${part.commonName || ""}"></td>
      <td class="buy-current-stock">${part.stock || ""}</td>
      <td><input class="buy-mrp" type="number" min="0" value="${Number(part.sale || 0)}"></td>
      <td><input class="buy-rack" list="rackNoList" placeholder="Rack no." value="${part.rackNo || ""}"></td>
      <td><input class="buy-low" type="number" min="0" value="${Number(part.low || 2)}"></td>
      <td><input class="buy-qty" type="number" min="0" value="0"></td>
    </tr>`;
}

function findPartsByInput(value) {
  const query = normalize(value);
  if (!query) return [];
  const exactOption = state.parts.find((part) => normalize(partInputValue(part)) === query);
  if (exactOption) return [exactOption];
  const exactPartNo = state.parts.filter((part) => same(part.partNo, value));
  if (exactPartNo.length) return exactPartNo;
  return state.parts.filter((part) =>
    normalize(part.partNo).includes(query) ||
    normalize(part.name).includes(query) ||
    normalize(part.commonName).includes(query)
  );
}

function setJobPart(row, part) {
  row.querySelector(".job-part-id").value = part?.id || "";
  row.querySelector(".job-part-search").value = part ? partInputValue(part) : row.querySelector(".job-part-search").value;
  row.classList.toggle("active", Boolean(part));
  row.querySelector(".part-name").textContent = part?.name || "";
  row.querySelector(".part-common").textContent = part?.commonName || part?.name || "";
  row.querySelector(".part-free").textContent = part?.stock || "";
  row.querySelector(".part-mrp").textContent = Number(part?.sale || 0);
  updatePartsSummary();
}

function setBuyPartRow(row, part) {
  row.querySelector(".buy-part-id").value = part?.id || "";
  row.querySelector(".buy-part-search").value = part ? partInputValue(part) : row.querySelector(".buy-part-search").value;
  row.classList.toggle("active", Boolean(part));
  row.querySelector(".buy-part-name").value = part?.name || "";
  row.querySelector(".buy-common-name").value = part?.commonName || "";
  row.querySelector(".buy-current-stock").textContent = part?.stock || "";
  row.querySelector(".buy-mrp").value = Number(part?.sale || 0);
  row.querySelector(".buy-rack").value = part?.rackNo || "";
  row.querySelector(".buy-low").value = Number(part?.low || 2);
}

function fillJobPartRow(row) {
  const matches = findPartsByInput(row.querySelector(".job-part-search").value);
  if (!matches.length) {
    setJobPart(row, null);
    return;
  }
  const invoice = textValue("#partsInvoice") || textValue("#partsRegistration");
  const existingSale = invoice ? findInvoiceSaleByPartNo(invoice, matches[0].partNo || matches[0].name) : null;
  if (existingSale) {
    const existingPart = state.parts.find((part) => part.id === existingSale.partId);
    if (existingPart) {
      setJobPart(row, existingPart);
      return;
    }
  }
  if (matches.length === 1) {
    setJobPart(row, matches[0]);
    return;
  }
  openMrpChoice(row, matches);
}

function fillExactJobPartRow(row) {
  const value = row.querySelector(".job-part-search").value;
  const exactOption = state.parts.find((part) => same(partInputValue(part), value));
  const matches = exactOption ? [exactOption] : state.parts.filter((part) => same(part.partNo, value));
  if (!matches.length) return;
  const invoice = textValue("#partsInvoice") || textValue("#partsRegistration");
  const existingSale = invoice ? findInvoiceSaleByPartNo(invoice, matches[0].partNo || matches[0].name) : null;
  if (existingSale) {
    const existingPart = state.parts.find((part) => part.id === existingSale.partId);
    if (existingPart) {
      setJobPart(row, existingPart);
      return;
    }
  }
  if (matches.length === 1) setJobPart(row, matches[0]);
  else openMrpChoice(row, matches);
}

function fillBuyPartRow(row) {
  const matches = findPartsByInput(row.querySelector(".buy-part-search").value);
  if (!matches.length) {
    row.querySelector(".buy-part-id").value = "";
    row.querySelector(".buy-current-stock").textContent = "";
    return;
  }
  setBuyPartRow(row, matches[0]);
}

function fillExactBuyPartRow(row) {
  const value = row.querySelector(".buy-part-search").value;
  const exactOption = state.parts.find((part) => same(partInputValue(part), value));
  const matches = exactOption ? [exactOption] : state.parts.filter((part) => same(part.partNo, value));
  if (matches.length) setBuyPartRow(row, matches[0]);
}

function openMrpChoice(row, parts) {
  const modal = qs("#mrpChoiceModal");
  const list = qs("#mrpChoiceList");
  if (!modal || !list) return;
  modal.hidden = false;
  list.innerHTML = parts.map((part) => `
    <button class="choice-row" type="button" data-mrp-part="${part.id}">
      <strong>${part.partNo || "-"} - ${part.name || "-"}</strong>
      <span>MRP: ${money(part.sale)} | Available: ${part.stock || 0} | Rack: ${part.rackNo || "-"}</span>
    </button>`).join("");
  qsa("[data-mrp-part]", list).forEach((button) => {
    button.addEventListener("click", () => {
      const part = state.parts.find((item) => item.id === button.dataset.mrpPart);
      setJobPart(row, part);
      modal.hidden = true;
    });
  });
}

function bindJobPartRows() {
  qsa("[data-part-row]").forEach((row) => {
    if (row.dataset.bound === "yes") return;
    row.dataset.bound = "yes";
    row.addEventListener("click", () => {
      qsa("[data-part-row]").forEach((item) => item.classList.remove("focused"));
      row.classList.add("focused");
    });
    row.querySelector(".job-part-search").addEventListener("input", () => fillExactJobPartRow(row));
    row.querySelector(".job-part-search").addEventListener("change", () => fillJobPartRow(row));
    row.querySelector(".job-part-search").addEventListener("blur", () => fillJobPartRow(row));
    row.querySelector(".issued-input").addEventListener("input", () => {
      updatePartsSummary();
      const hasPart = Boolean(row.querySelector(".job-part-id").value);
      const hasQty = Number(row.querySelector(".issued-input").value || 0) > 0;
      const isLastRow = row === qsa("[data-part-row]").at(-1);
      if (hasPart && hasQty && isLastRow) addJobPartRow();
    });
  });
}

function setReturnPartRow(row, part) {
  row.querySelector(".return-part-id").value = part?.id || "";
  row.querySelector(".return-part-search").value = part ? partInputValue(part) : row.querySelector(".return-part-search").value;
  row.classList.toggle("active", Boolean(part));
  row.querySelector(".return-part-name").textContent = part?.name || "";
  row.querySelector(".return-mrp").textContent = Number(part?.sale || 0);
  const reference = textValue("#returnInvoice") || textValue("#returnRegistration");
  row.querySelector(".return-sold-qty").textContent = part && reference ? soldQtyForInvoice(reference, part.id) : 0;
  updateReturnPartRow(row);
}

function fillReturnPartRow(row) {
  const matches = findPartsByInput(row.querySelector(".return-part-search").value);
  setReturnPartRow(row, matches[0] || null);
}

function updateReturnPartRow(row) {
  const part = state.parts.find((item) => item.id === row.querySelector(".return-part-id")?.value);
  const soldQty = Number(row.querySelector(".return-sold-qty")?.textContent || 0);
  const qtyInput = row.querySelector(".return-qty");
  let returnQty = Number(qtyInput?.value || 0);
  if (soldQty > 0 && returnQty > soldQty) {
    returnQty = soldQty;
    qtyInput.value = soldQty;
  }
  const mrp = Number(part?.sale || row.querySelector(".return-mrp")?.textContent || 0);
  const amountCell = row.querySelector(".return-amount");
  if (amountCell) amountCell.textContent = money(returnQty * mrp);
}

function bindReturnPartRows() {
  qsa("[data-return-part-row]").forEach((row) => {
    if (row.dataset.bound === "yes") return;
    row.dataset.bound = "yes";
    row.querySelector(".return-part-search").addEventListener("input", () => fillReturnPartRow(row));
    row.querySelector(".return-part-search").addEventListener("change", () => fillReturnPartRow(row));
    row.querySelector(".return-qty").addEventListener("input", () => {
      updateReturnPartRow(row);
      const hasPart = Boolean(row.querySelector(".return-part-id").value);
      const hasQty = Number(row.querySelector(".return-qty").value || 0) > 0;
      const isLastRow = row === qsa("[data-return-part-row]").at(-1);
      if (hasPart && hasQty && isLastRow) addReturnPartRow();
      renderReturnReferenceParts();
    });
  });
}

function addReturnPartRow(part = {}) {
  qs("#returnPartsRows").insertAdjacentHTML("beforeend", returnPartRow(part));
  bindReturnPartRows();
}

function fillReturnRowsFromReference() {
  const reference = textValue("#returnInvoice") || textValue("#returnRegistration");
  if (!reference) {
    qs("#returnPartsRows").innerHTML = returnPartRow();
    bindReturnPartRows();
    renderReturnReferenceParts();
    return;
  }
  const sales = invoicePartRows(reference).filter((sale) => Number(sale.qty || 0) > 0);
  if (!sales.length) {
    qs("#returnPartsRows").innerHTML = returnPartRow();
    bindReturnPartRows();
    renderReturnReferenceParts();
    return;
  }
  qs("#returnPartsRows").innerHTML = sales.map((sale) => {
    const part = state.parts.find((item) => item.id === sale.partId || same(item.partNo, salePartNo(sale)));
    const returnable = Math.max(Number(sale.qty || 0), 0);
    return returnPartRow(part || { id: sale.partId, partNo: salePartNo(sale), name: sale.name, sale: sale.mrp });
  }).join("");
  bindReturnPartRows();
  qsa("[data-return-part-row]").forEach((row, index) => {
    const sale = sales[index];
    const part = state.parts.find((item) => item.id === sale.partId || same(item.partNo, salePartNo(sale)));
    if (part) setReturnPartRow(row, part);
    const returnable = Math.max(Number(sale.qty || 0), 0);
    row.querySelector(".return-sold-qty").textContent = returnable;
    row.querySelector(".return-qty").max = returnable;
    row.querySelector(".return-qty").value = 0;
    updateReturnPartRow(row);
  });
  renderReturnReferenceParts();
}

function refreshReturnSoldQty() {
  fillReturnRowsFromReference();
  return;
  qsa("[data-return-part-row]").forEach((row) => {
    const part = state.parts.find((item) => item.id === row.querySelector(".return-part-id").value);
    if (part) setReturnPartRow(row, part);
  });
  renderReturnReferenceParts();
}

function currentReturnDrafts() {
  const drafts = new Map();
  qsa("[data-return-part-row]").forEach((row) => {
    const partId = row.querySelector(".return-part-id")?.value;
    const part = state.parts.find((item) => item.id === partId);
    const partNo = part?.partNo || row.querySelector(".return-part-search")?.value.split("|")[0]?.trim() || "";
    const qty = Number(row.querySelector(".return-qty")?.value || 0);
    if (!partNo || qty <= 0) return;
    const key = normalize(partNo);
    drafts.set(key, Number(drafts.get(key) || 0) + qty);
  });
  return drafts;
}

function renderReturnReferenceParts() {
  const box = qs("#returnPartsLookup");
  if (!box) return;
  const reference = textValue("#returnInvoice") || textValue("#returnRegistration");
  if (!reference) {
    box.innerHTML = "";
    return;
  }
  const rows = invoicePartRows(reference).filter((sale) => Number(sale.qty || 0) > 0);
  if (!rows.length) {
    box.innerHTML = `<div class="notice"><strong>No parts found</strong>${reference} ke against returnable part sale nahi mila.</div>`;
    return;
  }
  const drafts = currentReturnDrafts();
  const previewTotal = rows.reduce((sum, sale) => {
    const draftQty = Math.min(Number(drafts.get(normalize(salePartNo(sale))) || 0), Math.max(Number(sale.qty || 0), 0));
    return sum + draftQty * Number(sale.mrp || 0);
  }, 0);
  const summary = previewTotal > 0 ? `<div class="notice"><strong>Return Preview</strong>Save karne par balance ${money(previewTotal)} kam hoga.</div>` : "";
  box.innerHTML = `${summary}<div class="table-wrap"><table><thead><tr><th>Invoice / Reg</th><th>Part No.</th><th>Part</th><th>Purchase Date</th><th>Last Return</th><th>Sold Left</th><th>Returned</th><th>Return Now</th><th>After Return</th><th>Return Amount</th></tr></thead><tbody>${rows.map((sale) => {
    const partNo = salePartNo(sale);
    const soldLeft = Math.max(Number(sale.qty || 0), 0);
    const returnNow = Math.min(Number(drafts.get(normalize(partNo)) || 0), soldLeft);
    const afterReturn = Math.max(soldLeft - returnNow, 0);
    const returnAmount = returnNow * Number(sale.mrp || 0);
    return `<tr><td>${sale.invoice || sale.registrationNo || reference}</td><td>${partNo || "-"}</td><td>${sale.name || "-"}</td><td>${sale.date || "-"}</td><td>${sale.returnDate || "-"}</td><td>${soldLeft}</td><td>${sale.returnedQty || 0}</td><td>${returnNow}</td><td>${afterReturn}</td><td>${money(returnAmount)}</td></tr>`;
  }).join("")}</tbody></table></div>`;
  applyTablePagination(box);
}

function bindBuyPartRows() {
  qsa("[data-buy-part-row]").forEach((row) => {
    if (row.dataset.bound === "yes") return;
    row.dataset.bound = "yes";
    row.addEventListener("click", () => {
      qsa("[data-buy-part-row]").forEach((item) => item.classList.remove("focused"));
      row.classList.add("focused");
    });
    row.querySelector(".buy-part-search").addEventListener("input", () => fillExactBuyPartRow(row));
    row.querySelector(".buy-part-search").addEventListener("change", () => fillBuyPartRow(row));
    row.querySelector(".buy-part-search").addEventListener("blur", () => fillBuyPartRow(row));
    row.querySelector(".buy-qty").addEventListener("input", () => {
      const hasPart = Boolean(row.querySelector(".buy-part-search").value.trim());
      const hasQty = Number(row.querySelector(".buy-qty").value || 0) > 0;
      const isLastRow = row === qsa("[data-buy-part-row]").at(-1);
      if (hasPart && hasQty && isLastRow) addBuyPartRow();
    });
  });
}

function addBuyPartRow(part = {}) {
  qs("#buyPartsRows").insertAdjacentHTML("beforeend", buyPartRow(part));
  bindBuyPartRows();
}

function addJobPartRow() {
  qs("#partsRows").insertAdjacentHTML("beforeend", jobPartRow());
  bindJobPartRows();
  updatePartsSummary();
}

function selectedJobRows() {
  return qsa("[data-part-row]").filter((row) => row.querySelector(".job-part-id").value);
}

function showPartsSection(section = "sell") {
  const active = ["sell", "return", "buy", "list"].includes(section) ? section : "sell";
  qsa("[data-parts-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.partsPanel !== active;
  });
  qsa("[data-parts-section]").forEach((button) => {
    const selected = button.dataset.partsSection === active;
    button.classList.toggle("primary-btn", selected);
    button.classList.toggle("soft-btn", !selected);
  });
  if (active === "list") renderPartsPageList();
  if (active === "sell") qs("#partsInvoice")?.focus();
  if (active === "return") qs("#returnInvoice")?.focus();
  if (active === "buy") qs(".buy-part-search")?.focus();
}

function renderPartsPageList() {
  const box = qs("#partsPageListBox");
  if (!box) return;
  const query = normalize(qs("#partsPageSearch")?.value);
  const rows = state.parts.filter((part) => !query || Object.values(part).join(" ").toLowerCase().includes(query));
  const empty = `<tr><td class="empty-row" colspan="9">No parts records.</td></tr>`;
  box.innerHTML = `<table><thead><tr><th>Part No.</th><th>Part Name</th><th>Common Name</th><th>Available Qty</th><th>MRP</th><th>Rack No.</th><th>Low Alert</th><th>Status</th><th>Stock Value</th></tr></thead><tbody>${rows.length ? rows.map((part) => {
    const value = Number(part.stock || 0) * Number(part.sale || 0);
    const low = Number(part.stock || 0) <= Number(part.low || 0);
    return `<tr><td>${part.partNo || "-"}</td><td>${part.name || "-"}</td><td>${part.commonName || "-"}</td><td>${part.stock || 0}</td><td>${money(part.sale)}</td><td>${part.rackNo || "-"}</td><td>${part.low || 0}</td><td class="${low ? "due" : "ok"}">${low ? "Low" : "OK"}</td><td>${money(value)}</td></tr>`;
  }).join("") : empty}</tbody></table>`;
  applyTablePagination(box);
}

function renderPartsList(mode = "all") {
  const box = qs("#partsListBox");
  if (!box) return;
  const query = normalize(qs("#partsStockSearch")?.value);
  const source = mode === "low" ? state.parts.filter((part) => Number(part.stock || 0) <= Number(part.low || 0)) : state.parts;
  const rows = source.filter((part) => !query || Object.values(part).join(" ").toLowerCase().includes(query));
  const emptyText = mode === "low" ? "No low stock parts." : "No parts records.";
  const totalValue = rows.reduce((sum, part) => sum + Number(part.stock || 0) * Number(part.sale || 0), 0);
  const empty = `<tr><td class="empty-row" colspan="9">${emptyText}</td></tr>`;
  const footer = mode === "value" ? `<tfoot><tr><th colspan="8">Total Stock Value</th><th>${money(totalValue)}</th></tr></tfoot>` : "";
  box.innerHTML = `<table><thead><tr><th>Part No.</th><th>Part Name</th><th>Common Name</th><th>Available Qty</th><th>MRP</th><th>Rack No.</th><th>Low Alert</th><th>Status</th><th>Stock Value</th></tr></thead><tbody>${rows.length ? rows.map((part) => {
    const value = Number(part.stock || 0) * Number(part.sale || 0);
    return `<tr><td>${part.partNo || "-"}</td><td>${part.name || "-"}</td><td>${part.commonName || "-"}</td><td>${part.stock || 0}</td><td>${money(part.sale)}</td><td>${part.rackNo || "-"}</td><td>${part.low || 0}</td><td class="${Number(part.stock || 0) <= Number(part.low || 0) ? "due" : "ok"}">${Number(part.stock || 0) <= Number(part.low || 0) ? "Low" : "OK"}</td><td>${money(value)}</td></tr>`;
  }).join("") : empty}</tbody>${footer}</table>`;
  applyTablePagination();
}

function refreshPartsDatalists() {
  qsa("#partsDatalist, #buyPartsDatalist, #returnPartsDatalist").forEach((list) => {
    list.innerHTML = partsDatalistOptions();
  });
}

function showPartsList() {
  const panel = qs("#partsListPanel");
  if (!panel) return;
  panel.dataset.mode = "all";
  qs("#partsListEyebrow").textContent = "Stock";
  qs("#partsListTitle").textContent = "Available Parts List";
  renderPartsList("all");
  qs("#issuedTodayPanel").hidden = true;
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showLowStockParts() {
  const panel = qs("#partsListPanel");
  if (!panel) return;
  panel.dataset.mode = "low";
  qs("#partsListEyebrow").textContent = "Low Stock";
  qs("#partsListTitle").textContent = "Need Refill Parts";
  renderPartsList("low");
  qs("#issuedTodayPanel").hidden = true;
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showPartsValueDetails() {
  const panel = qs("#partsListPanel");
  if (!panel) return;
  panel.dataset.mode = "value";
  qs("#partsListEyebrow").textContent = "Stock Value";
  qs("#partsListTitle").textContent = "MRP Stock Value Details";
  renderPartsList("value");
  qs("#issuedTodayPanel").hidden = true;
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buyRowPartNo(row) {
  const selected = state.parts.find((part) => part.id === row.querySelector(".buy-part-id").value);
  if (selected?.partNo) return selected.partNo;
  const raw = row.querySelector(".buy-part-search").value.trim();
  return raw.includes("|") ? raw.split("|")[0].trim() : raw;
}

function saveBuyParts() {
  const rows = qsa("[data-buy-part-row]").filter((row) => {
    return buyRowPartNo(row) || row.querySelector(".buy-part-name").value.trim() || Number(row.querySelector(".buy-qty").value || 0) > 0;
  });
  if (!rows.length) return showToast("Part row fill kare.");
  let savedCount = 0;
  for (const row of rows) {
    const partNo = buyRowPartNo(row);
    const name = row.querySelector(".buy-part-name").value.trim();
    const qty = Number(row.querySelector(".buy-qty").value || 0);
    const mrp = Number(row.querySelector(".buy-mrp").value || 0);
    if (!partNo || !name || qty <= 0) return showToast("Part no, name and quantity required.");
    const existing = state.parts.find((part) => same(part.partNo, partNo) && Number(part.sale || 0) === mrp);
    if (existing) {
      existing.name = name;
      existing.commonName = row.querySelector(".buy-common-name").value.trim();
      existing.stock = Number(existing.stock || 0) + qty;
      existing.rackNo = row.querySelector(".buy-rack").value.trim();
      existing.low = Number(row.querySelector(".buy-low").value || 0);
    } else {
      state.parts.push({
        id: createId(),
        partNo,
        name,
        commonName: row.querySelector(".buy-common-name").value.trim(),
        stock: qty,
        low: Number(row.querySelector(".buy-low").value || 0),
        purchase: 0,
        sale: mrp,
        rackNo: row.querySelector(".buy-rack").value.trim(),
      });
    }
    savedCount += 1;
  }
  saveState();
  renderBuyPartsRows();
  refreshPartsDatalists();
  renderPartsStats();
  renderPartsList();
  renderPartsPageList();
  showToast(`${savedCount} parts stock saved.`);
}

function salePartNo(sale) {
  if (sale.partNo) return sale.partNo;
  const part = state.parts.find((item) => item.id === sale.partId);
  return part?.partNo || sale.name || "";
}

function sameSaleReference(sale, reference) {
  return same(sale.invoice, reference) || same(sale.registrationNo, reference);
}

function findInvoiceSaleByPartNo(reference, partNo) {
  return state.partSales.find((sale) => sameSaleReference(sale, reference) && same(salePartNo(sale), partNo) && sale.mode !== "buy");
}

function soldQtyForInvoice(reference, partId) {
  const part = state.parts.find((item) => item.id === partId);
  const partNo = part?.partNo || "";
  return state.partSales
    .filter((sale) => sameSaleReference(sale, reference) && (sale.partId === partId || (partNo && same(salePartNo(sale), partNo))))
    .reduce((sum, sale) => sum + Number(sale.qty || 0), 0);
}

function invoicePartRows(reference) {
  const groups = new Map();
  state.partSales.filter((sale) => sameSaleReference(sale, reference)).forEach((sale) => {
    const partNo = salePartNo(sale);
    const key = normalize(partNo || sale.partId || sale.id);
    const part = state.parts.find((item) => item.id === sale.partId);
    const mrp = Number(sale.mrp || part?.sale || 0);
    const old = groups.get(key) || {
      ...sale,
      partNo,
      qty: 0,
      originalQty: 0,
      returnedQty: 0,
      amount: 0,
      mrp,
    };
    old.qty += Number(sale.qty || 0);
    old.originalQty += Number(sale.originalQty || 0) || Number(sale.qty || 0) + Number(sale.returnedQty || 0);
    old.returnedQty += Number(sale.returnedQty || 0);
    old.amount = Math.max(old.qty, 0) * mrp;
    old.date = sale.date || old.date;
    old.returnDate = sale.returnDate || old.returnDate || "";
    groups.set(key, old);
  });
  return [...groups.values()];
}

function renderInvoiceParts() {
  const box = qs("#invoicePartsBox");
  if (!box) return;
  const invoice = textValue("#partsInvoice");
  const registrationNo = textValue("#partsRegistration");
  const reference = invoice || registrationNo;
  if (!reference) {
    box.innerHTML = "";
    return;
  }
  const rows = invoicePartRows(reference);
  const rtoRecord = registrationNo ? state.rto.find((item) => same(item.registrationNo, registrationNo)) : null;
  const customer = state.customers.find((item) => same(item.invoice, invoice) || (rtoRecord && same(item.invoice, rtoRecord.invoice)));
  if (!rows.length && !customer) {
    box.innerHTML = `<div class="notice"><strong>No sale data found</strong>No parts or payment record for ${reference}.</div>`;
    return;
  }
  const partsHtml = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Invoice / VN</th><th>Registration</th><th>Part No.</th><th>Part</th><th>MRP</th><th>Sold</th><th>Returned</th><th>Remaining</th><th>Amount</th></tr></thead><tbody>${rows.map((sale) => {
        const part = state.parts.find((item) => item.id === sale.partId);
        return `<tr><td>${sale.date || "-"}</td><td>${sale.invoice || "-"}</td><td>${sale.registrationNo || "-"}</td><td>${salePartNo(sale) || "-"}</td><td>${sale.name || "-"}</td><td>${money(sale.mrp || part?.sale || 0)}</td><td>${sale.originalQty || sale.qty || 0}</td><td>${sale.returnedQty || 0}</td><td>${Math.max(Number(sale.qty || 0), 0)}</td><td>${money(sale.amount)}</td></tr>`;
      }).join("")}</tbody></table></div>`
    : "";
  const paymentHtml = customer ? `<div class="notice"><strong>Payment</strong>Paid: ${money(customer.paid)} | Pending: ${money(customer.pending)}</div>` : "";
  box.innerHTML = `${paymentHtml}${partsHtml}`;
}

function selectedOrActiveJobRows() {
  const focused = qs("[data-part-row].focused");
  if (focused) return [focused];
  const selected = selectedJobRows();
  return selected.length ? [selected[0]] : [];
}

function applyIssueMode(mode) {
  const rows = selectedOrActiveJobRows();
  if (!rows.length) return showToast("Add or select a part row first.");
  rows.forEach((row) => {
    row.dataset.issueMode = mode;
    row.classList.add("active", "focused");
  });
  updatePartsSummary();
  showToast(`${mode} mode applied.`);
}

function createServiceRequest() {
  const rows = selectedJobRows();
  if (!rows.length) return showToast("Select parts before service request.");
  const request = {
    id: createId(),
    date: today(),
    storage: textValue("#storageLocation"),
    parts: rows.map((row) => {
      const part = state.parts.find((item) => item.id === row.querySelector(".job-part-id").value);
      return {
        partId: part?.id || "",
        partNo: part?.partNo || "",
        name: part?.name || "",
        commonName: part?.commonName || "",
        rackNo: part?.rackNo || "",
        qty: Number(row.querySelector(".issued-input").value || 0),
        mode: row.dataset.issueMode || "Normal",
        returnedQty: 0,
      };
    }),
  };
  state.serviceRequests.push(request);
  saveState();
  showToast("Service request saved.");
}

function updatePartsSummary() {
  if (!qs("#partsCountTotal") || !qs("#partsAmountTotal")) return;
  const rows = selectedJobRows();
  const total = rows.reduce((sum, row) => {
    const qty = Number(row.querySelector(".issued-input").value || 0);
    const price = Number(row.querySelector(".part-mrp").textContent || 0);
    return sum + qty * price;
  }, 0);
  qs("#partsCountTotal").textContent = Number(rows.length).toFixed(2);
  qs("#partsAmountTotal").textContent = total.toFixed(2);
}

function saveJobParts() {
  const rows = selectedJobRows();
  if (!rows.length) return showToast("Select at least one part.");
  let savedCount = 0;
  const invoice = textValue("#partsInvoice");
  const registrationNo = textValue("#partsRegistration");
  const saleReference = invoice || registrationNo;
  if (!saleReference) return showToast("Invoice / VN ya Registration No. me se ek required hai.");
  let invoiceTotal = 0;
  const currentPartNos = new Set();
  for (const row of rows) {
    const part = state.parts.find((item) => item.id === row.querySelector(".job-part-id").value);
    const qty = Number(row.querySelector(".issued-input").value || 0);
    const returnedQty = 0;
    if (!part || (qty <= 0 && returnedQty <= 0)) return showToast("Issued or returned quantity required.");
    const partNo = part.partNo || part.name;
    if (currentPartNos.has(normalize(partNo))) return showToast(`${partNo} ek sale reference me ek hi row me rakho.`);
    currentPartNos.add(normalize(partNo));
    const existingSale = findInvoiceSaleByPartNo(saleReference, partNo);
    if (existingSale && existingSale.partId !== part.id) return showToast(`${partNo} is reference me pehle se alag MRP par hai. Same MRP select karke quantity update kare.`);
    const remainingSoldQty = soldQtyForInvoice(saleReference, part.id);
    if (returnedQty > remainingSoldQty) {
      return showToast(`Return quantity cannot be more than sold quantity for ${part.name}.`);
    }
    if (Number(part.stock || 0) < qty) return showToast(`${part.name} stock is low.`);
    part.stock = Number(part.stock || 0) - qty + returnedQty;
    invoiceTotal += (qty - returnedQty) * Number(part.sale || 0);
    if (existingSale) {
      existingSale.originalQty = Number(existingSale.originalQty || 0) + qty;
      existingSale.qty = Number(existingSale.qty || 0) + qty;
      existingSale.returnedQty = Number(existingSale.returnedQty || 0) + returnedQty;
      existingSale.amount = Math.max(Number(existingSale.qty || 0), 0) * Number(part.sale || 0);
      existingSale.date = today();
      existingSale.partNo = partNo;
      existingSale.mrp = Number(part.sale || 0);
      existingSale.invoice = invoice || existingSale.invoice || "";
      existingSale.registrationNo = registrationNo || existingSale.registrationNo || "";
    } else {
      state.partSales.push({
        id: createId(),
        partId: part.id,
        partNo,
        invoice,
        registrationNo,
        name: part.name,
        commonName: part.commonName || "",
        rackNo: part.rackNo || "",
        qty,
        originalQty: qty,
        buyQty: 0,
        amount: Math.max(qty - returnedQty, 0) * Number(part.sale || 0),
        mrp: Number(part.sale || 0),
        date: today(),
        mode: "sell",
        returnedQty,
      });
    }
    savedCount += 1;
  }
  const rtoRecord = registrationNo ? state.rto.find((item) => same(item.registrationNo, registrationNo)) : null;
  const customerInvoice = invoice || rtoRecord?.invoice || "";
  const linkedRecords = linkedRecordsForReference(saleReference);
  if (linkedRecords.sales.length || linkedRecords.customers.length) {
    applyPartBalanceChange(saleReference, invoiceTotal);
  } else if (customerInvoice) {
    state.customers.push({ id: createId(), name: "Parts Sale", mobile: "", invoice: customerInvoice, bikeNo: registrationNo, paid: 0, pending: Math.max(invoiceTotal, 0), date: today() });
  }
  saveState();
  qs("#partsInvoice").value = "";
  qs("#partsRegistration").value = "";
  renderPartsRows();
  renderReturnPartsRows();
  refreshPartsDatalists();
  renderPartsList();
  renderPartsPageList();
  renderPartsStats();
  renderInvoiceParts();
  showToast(`${savedCount} parts saved successfully.`);
}

function saveReturnParts() {
  const reference = textValue("#returnInvoice") || textValue("#returnRegistration");
  if (!reference) return showToast("Invoice/VN ya Registration no. required.");
  const rows = qsa("[data-return-part-row]").filter((row) => row.querySelector(".return-part-id").value && Number(row.querySelector(".return-qty").value || 0) > 0);
  if (!rows.length) return showToast("Return ke liye part aur quantity fill kare.");
  let savedCount = 0;
  let returnTotal = 0;
  for (const row of rows) {
    const part = state.parts.find((item) => item.id === row.querySelector(".return-part-id").value);
    const returnQty = Number(row.querySelector(".return-qty").value || 0);
    if (!part || returnQty <= 0) return showToast("Return quantity required.");
    const soldQty = soldQtyForInvoice(reference, part.id);
    if (returnQty > soldQty) return showToast(`Return quantity ${part.name} ke sold quantity se zyada nahi ho sakti.`);
    const sale = findInvoiceSaleByPartNo(reference, part.partNo || part.name);
    if (!sale) return showToast("Is reference me part sale nahi mila.");
    if (!sale.originalQty) sale.originalQty = Number(sale.qty || 0) + Number(sale.returnedQty || 0);
    sale.returnedQty = Number(sale.returnedQty || 0) + returnQty;
    sale.qty = Math.max(Number(sale.qty || 0) - returnQty, 0);
    sale.returnDate = today();
    sale.amount = Math.max(Number(sale.qty || 0), 0) * Number(sale.mrp || part.sale || 0);
    part.stock = Number(part.stock || 0) + returnQty;
    returnTotal += returnQty * Number(sale.mrp || part.sale || 0);
    savedCount += 1;
  }
  applyPartBalanceChange(reference, -returnTotal);
  saveState();
  fillReturnRowsFromReference();
  renderReturnReferenceParts();
  renderPartsRows();
  renderPartsStats();
  renderPartsList();
  renderPartsPageList();
  if (qs("#customerRows")) renderCustomerRows();
  if (qs("#salesRows")) renderSalesRows();
  if (qs("#listOutput")?.dataset.type) renderListTab(qs("#listOutput").dataset.type);
  showToast(`${savedCount} parts returned. Balance ${money(returnTotal)} kam hua.`);
}

function sellPart(event) {
  event.preventDefault();
  const part = state.parts.find((item) => item.id === qs("#sellPart").value);
  const qty = numberValue("#sellQty");
  if (!part || qty <= 0) return;
  if (Number(part.stock) < qty) return showToast("Not enough stock.");
  part.stock = Number(part.stock) - qty;
  state.partSales.push({ id: createId(), partId: part.id, name: part.name, qty, customer: textValue("#sellCustomer"), amount: qty * Number(part.sale || 0), date: today() });
  saveState();
  event.target.reset();
  renderPartsRows();
  showToast("Part sale saved.");
}

function exportParts() {
  const csv = ["Part No,Part Name,Common Name,Rack No"].concat(state.parts.map((p) => [p.partNo, p.name, p.commonName, p.rackNo].map(csvCell).join(","))).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `parts-import-template-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function exportPartsExcel() {
  const headers = ["Part No", "Part Name", "Common Name", "Rack No"];
  const rows = state.parts.map((part) => [part.partNo || "", part.name || "", part.commonName || "", part.rackNo || ""]);
  const table = `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${table}</body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "application/vnd.ms-excel" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `parts-import-template-${today()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function parseDelimitedRows(text) {
  const delimiter = text.includes("\t") ? "\t" : ",";
  return text.split(/\r?\n/).map((line) => {
    const cells = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === "\"") quoted = !quoted;
      else if (char === delimiter && !quoted) {
        cells.push(cell.trim());
        cell = "";
      } else cell += char;
    }
    cells.push(cell.trim());
    return cells;
  }).filter((row) => row.some(Boolean));
}

function partsRowsFromImport(text) {
  if (/<table[\s>]/i.test(text)) {
    const doc = new DOMParser().parseFromString(text, "text/html");
    return qsa("tr", doc).map((row) => qsa("th,td", row).map((cell) => cell.textContent.trim())).filter((row) => row.length);
  }
  return parseDelimitedRows(text);
}

function addImportedPart(record) {
  const partNo = String(record.partNo || "").trim();
  if (!partNo) return "invalid";
  if (state.parts.some((part) => same(part.partNo, partNo))) return "duplicate";
  state.parts.push({
    id: createId(),
    partNo,
    name: record.name || partNo,
    commonName: record.commonName || "",
    rackNo: record.rackNo || "",
    stock: 0,
    low: 0,
    purchase: 0,
    sale: 0,
  });
  return "added";
}

function importPartsExcel(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const rows = partsRowsFromImport(String(reader.result || ""));
    const headers = (rows[0] || []).map(normalize);
    const indexOf = (...names) => headers.findIndex((header) => names.some((name) => header.includes(name)));
    const hasHeader = ["part no", "partno", "part name", "common", "rack", "rake"].some((name) => headers.some((header) => header.includes(name)));
    const indexes = {
      partNo: indexOf("part no", "partno", "number"),
      name: indexOf("part name", "name"),
      commonName: indexOf("common"),
      rackNo: indexOf("rack", "rake"),
    };
    const dataRows = hasHeader ? rows.slice(1) : rows;
    let added = 0;
    let duplicate = 0;
    let invalid = 0;
    dataRows.forEach((row) => {
      const partNo = row[indexes.partNo >= 0 ? indexes.partNo : 0];
      const name = row[indexes.name >= 0 ? indexes.name : 1];
      const commonName = row[indexes.commonName >= 0 ? indexes.commonName : 2];
      const rackNo = row[indexes.rackNo >= 0 ? indexes.rackNo : 3];
      const result = addImportedPart({
        partNo,
        name: name || partNo,
        commonName,
        rackNo,
      });
      if (result === "added") added += 1;
      if (result === "duplicate") duplicate += 1;
      if (result === "invalid") invalid += 1;
    });
    saveState();
    refreshPartsDatalists();
    renderPartsRows();
    renderBuyPartsRows();
    renderPartsList();
    renderPartsPageList();
    renderPartsStats();
    event.target.value = "";
    showToast(`${added} imported. ${duplicate} duplicate skipped. ${invalid} invalid skipped.`);
  };
  reader.readAsText(file);
}

function importParts(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const rows = partsRowsFromImport(String(reader.result || ""));
    const headers = (rows[0] || []).map(normalize);
    const hasHeader = ["part no", "partno", "part name", "common", "rack", "rake"].some((name) => headers.some((header) => header.includes(name)));
    const dataRows = hasHeader ? rows.slice(1) : rows;
    let added = 0;
    let duplicate = 0;
    let invalid = 0;
    dataRows.forEach(([partNo, name, commonName, rackNo]) => {
      const result = addImportedPart({ partNo, name: name || partNo, commonName, rackNo });
      if (result === "added") added += 1;
      if (result === "duplicate") duplicate += 1;
      if (result === "invalid") invalid += 1;
    });
    saveState();
    refreshPartsDatalists();
    renderPartsRows();
    renderBuyPartsRows();
    renderPartsList();
    renderPartsPageList();
    renderPartsStats();
    event.target.value = "";
    showToast(`${added} imported. ${duplicate} duplicate skipped. ${invalid} invalid skipped.`);
  };
  reader.readAsText(file);
}

function renderSettings() {
  layout("settings", "Settings", "Theme Setup");
  const theme = loadTheme();
  qs("#pageRoot").innerHTML = `
    <section class="grid-2">
      <article class="panel">
        <div class="panel-head"><div><p class="eyebrow">Theme</p><h3>Colour Settings</h3></div></div>
        <div class="panel-body">
          <form id="themeForm" class="entry-form">
            <label>Primary Colour <input id="themeGreen" type="color" value="${theme.green}"></label>
            <label>Sidebar Colour <input id="themeDeep" type="color" value="${theme.deep}"></label>
            <label>Gold Colour <input id="themeGold" type="color" value="${theme.gold}"></label>
            <label>Background <input id="themeBg" type="color" value="${theme.bg}"></label>
            <label>Panel Colour <input id="themePanel" type="color" value="${theme.panel}"></label>
            <label>Display Mode <select id="themeMode"><option value="3d">Default</option><option value="normal">Normal</option><option value="dark">Dark</option><option value="night">Night</option></select></label>
            <label>3D Effect <select id="themeEffect"><option value="3d">3D Effect</option><option value="flat">Non 3D</option></select></label>
            <label>Glass Effect <select id="themeGlass"><option value="glass">Glass</option><option value="solid">Non Glass</option></select></label>
            <div class="wide row-actions">
              <button class="primary-btn" type="submit">Save Theme</button>
              <button class="soft-btn" id="resetTheme" type="button">Reset</button>
              <button class="soft-btn install-app-btn" type="button" hidden>Install App</button>
            </div>
          </form>
        </div>
      </article>
      <article class="panel glass-preview">
        <div class="panel-head"><div><p class="eyebrow">Preview</p><h3>3D Glass Look</h3></div></div>
        <div class="panel-body">
          <div class="theme-preview-card">
            <span class="brand-logo brand-logo-large"><img src="${LOGO_PATH}" alt="JD Auto Sales logo"></span>
            <div><h3>JD TVS</h3><p class="welcome-name">Welcome, <strong>${currentUser().name}</strong></p></div>
          </div>
        </div>
      </article>
    </section>`;
  qsa("#themeForm input[type='color']").forEach((input) => input.addEventListener("input", previewTheme));
  qs("#themeMode").value = theme.mode || "3d";
  qs("#themeEffect").value = theme.effect || (theme.mode === "normal" ? "flat" : "3d");
  qs("#themeGlass").value = theme.glass || (theme.mode === "normal" ? "solid" : "glass");
  qs("#themeMode").addEventListener("change", previewTheme);
  qs("#themeEffect").addEventListener("change", previewTheme);
  qs("#themeGlass").addEventListener("change", previewTheme);
  qs("#themeForm").addEventListener("submit", saveTheme);
  qs("#resetTheme").addEventListener("click", () => {
    localStorage.removeItem(THEME_KEY);
    applyTheme(defaultTheme);
    renderSettings();
    showToast("Theme reset.");
  });
  bindInstallButton();
}

function themeFromForm() {
  return {
    green: textValue("#themeGreen"),
    deep: textValue("#themeDeep"),
    gold: textValue("#themeGold"),
    bg: textValue("#themeBg"),
    panel: textValue("#themePanel"),
    mode: textValue("#themeMode"),
    effect: textValue("#themeEffect"),
    glass: textValue("#themeGlass"),
  };
}

function previewTheme() {
  const theme = themeFromForm();
  applyTheme(theme);
  updateFooterThemeControls(theme);
  redrawVisibleCharts();
}

function saveTheme(event) {
  event.preventDefault();
  const theme = themeFromForm();
  localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  applyTheme(theme);
  updateFooterThemeControls(theme);
  redrawVisibleCharts();
  showToast("Theme saved.");
}

function redrawVisibleCharts() {
  if (qs("#salesChart") && qs("#statusChart")) drawDashboardCharts();
}

function refreshInstallButtons() {
  qsa(".install-app-btn").forEach((button) => {
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone;
    button.hidden = Boolean(standalone);
  });
}

function bindInstallButton() {
  qsa(".install-app-btn").forEach((button) => {
    refreshInstallButtons();
    button.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return showToast("Mobile browser menu se Add to Home Screen / Install App kare.");
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => null);
      deferredInstallPrompt = null;
      refreshInstallButtons();
    });
  });
}

function loginEmployeeOptions() {
  const options = state.employees
    .filter((employee) => employee.active && employee.password)
    .map((employee) => `<option value="${employee.id}">${employee.name} - ${roleLabels[employee.role]}</option>`)
    .join("");
  return options || `<option value="" disabled selected>No active employee login set</option>`;
}

function forgotPasswordHtml() {
  return `
    <div class="forgot-box">
      <button class="soft-btn" id="toggleForgotPassword" type="button">Forget Password</button>
      <form id="forgotPasswordForm" class="entry-form" hidden>
        <label>Name <input id="forgotName" list="customerNameList" placeholder="Admin name"></label>
        <label>Mobile No. <input id="forgotMobile" list="mobileList" placeholder="Admin mobile"></label>
        <button class="primary-btn" type="submit">Show Password</button>
      </form>
      <div id="forgotPasswordResult" class="notice-list" hidden></div>
    </div>`;
}

function bindForgotPassword() {
  qs("#toggleForgotPassword")?.addEventListener("click", () => {
    qs("#forgotPasswordForm").hidden = !qs("#forgotPasswordForm").hidden;
    qs("#forgotPasswordResult").hidden = true;
  });
  qs("#forgotPasswordForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = textValue("#forgotName");
    const mobile = textValue("#forgotMobile");
    const admin = state.employees.find((employee) => employee.role === "admin" && employee.active && same(employee.name, name) && same(employee.mobile, mobile));
    const anyEmployee = state.employees.find((employee) => employee.active && same(employee.name, name) && same(employee.mobile, mobile));
    const box = qs("#forgotPasswordResult");
    box.hidden = false;
    if (admin) {
      box.innerHTML = `<div class="notice"><strong>Admin Password</strong>${escapeHtml(admin.password || "-")}</div>`;
    } else if (anyEmployee) {
      box.innerHTML = `<div class="notice"><strong>Connect to Admin</strong>Employee password sirf admin reset karega.</div>`;
    } else {
      box.innerHTML = `<div class="notice"><strong>No match found</strong>Name aur mobile number sahi fill kare.</div>`;
    }
  });
}

function renderLogin() {
  syncStandaloneClass();
  document.body.className = "login-page";
  syncStandaloneClass();
  document.body.innerHTML = `
    <section class="login-card">
      <div class="brand-line login-brand-hero"><span class="brand-logo brand-logo-large"><img src="${LOGO_PATH}" alt="JD Auto Sales logo"></span><div><h1>JD TVS</h1><p>Welcome, login with your employee field.</p></div></div>
      <form id="loginForm">
        <label>Employee / Field <select id="loginEmployee" required>${loginEmployeeOptions()}</select></label>
        <label>Password <input id="loginPass" type="password" autocomplete="current-password" required placeholder="1234"></label>
        <button class="primary-btn" type="submit">Login</button>
        <p id="loginError" class="due" hidden>Invalid login or inactive employee.</p>
      </form>
      <p style="color:var(--muted);margin:16px 0 0;text-align:center">Demo: admin / 1234, accounts / 1234, parts / 1234</p>
      ${forgotPasswordHtml()}
    </section>
    ${appFooter()}`;
  bindFooterThemeControls();
  bindForgotPassword();
  qs("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const employeeId = textValue("#loginEmployee");
    const password = qs("#loginPass").value;
    await pullLatestStateForLogin();
    const employee = state.employees.find((item) => item.active && item.id === employeeId && item.password === password);
    qs("#loginError").hidden = Boolean(employee);
    if (!employee) return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: employee.id, password: employee.password }));
    location.href = employee.role === "parts_manager" ? "parts.html" : "dashboard.html";
  });
}

function renderPage() {
  const page = document.body.dataset.page || "dashboard";
  if (redirectIfNeeded(page) === false) return;
  if (page === "login") renderLogin();
  if (page === "dashboard") renderDashboard();
  if (page === "admin") renderAdmin();
  if (page === "sales") renderSales();
  if (page === "rto") renderRtoInsurance();
  if (page === "customer") renderCustomer();
  if (page === "parts") renderParts();
  if (page === "lists") renderLists();
  if (page === "settings") renderSettings();
  setTimeout(() => applyTablePagination(), 0);
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".action-menu")) {
    qsa(".action-menu[open]").forEach((menu) => { menu.open = false; });
  } else if (event.target.closest(".action-menu summary")) {
    const currentMenu = event.target.closest(".action-menu");
    qsa(".action-menu[open]").forEach((menu) => {
      if (menu !== currentMenu) menu.open = false;
    });
  }
  const editEmployee = event.target.closest("[data-edit-employee]");
  const recordEdit = event.target.closest("[data-record-edit]");
  const deleteEmployee = event.target.closest("[data-delete-employee]");
  const resetEmployeePassword = event.target.closest("[data-reset-employee-password]");
  const editDistributor = event.target.closest("[data-edit-distributor]");
  const deleteDistributor = event.target.closest("[data-delete-distributor]");
  const deleteDistributorEntry = event.target.closest("[data-delete-distributor-entry]");
  const renamePdf = event.target.closest("[data-rename-pdf]");
  const deletePdf = event.target.closest("[data-delete-pdf]");
  const printPdf = event.target.closest("[data-print-pdf]");
  const openPdfModal = event.target.closest("[data-open-pdf-modal]");
  const closePdfModal = event.target.closest("[data-close-pdf-modal]");
  const completeRto = event.target.closest("[data-complete-rto]");
  const completeIns = event.target.closest("[data-complete-ins]");
  const deletePart = event.target.closest("[data-delete-part]");
  const deleteBike = event.target.closest("[data-delete-bike]");
  const deleteSale = event.target.closest("[data-delete-sale]");
  const deleteRto = event.target.closest("[data-delete-rto]");
  const deleteInsurance = event.target.closest("[data-delete-insurance]");
  const deletePaymentLog = event.target.closest("[data-delete-payment-log]");
  const customerFor = event.target.closest("[data-open-customer-for]");
  const editCustomer = event.target.closest("[data-edit-customer]");
  const deleteCustomer = event.target.closest("[data-delete-customer]");
  const receivePending = event.target.closest("[data-receive-pending]");
  const fillPendingMatch = event.target.closest("[data-fill-pending-match]");
  const fillOldPendingMatch = event.target.closest("[data-fill-old-pending-match]");
  const fillPartsPayment = event.target.closest("[data-fill-parts-payment]");
  const receiveParts = event.target.closest("[data-receive-parts]");
  const businessStat = event.target.closest("[data-business-stat]");
  const closeBusinessStat = event.target.closest("#closeBusinessStat");
  const destructiveAction = deleteEmployee || deleteDistributor || deleteDistributorEntry || deletePdf || deletePart || deleteBike || deleteSale || deleteRto || deleteInsurance || deleteCustomer || deletePaymentLog;
  if (destructiveAction && currentUser()?.role !== "admin") {
    showToast("Delete sirf admin kar sakta hai.");
    return;
  }
  if (businessStat) showBusinessStat(businessStat.dataset.businessStat);
  if (closeBusinessStat) qs("#businessStatPanel").hidden = true;
  if (openPdfModal) {
    const modal = qs(`[data-pdf-modal="${openPdfModal.dataset.openPdfModal}"]`);
    if (modal) {
      modal.hidden = false;
      renderImportantPdfList();
      qs("[data-pdf-search]", modal)?.focus();
    }
  }
  if (closePdfModal) {
    const modal = closePdfModal.closest("[data-pdf-modal]");
    if (modal) modal.hidden = true;
  }
  if (recordEdit) openRecordEditor(recordEdit.dataset.recordEdit, recordEdit.dataset.id);
  if (printPdf) printImportantPdf(printPdf.dataset.printPdf);
  if (renamePdf) {
    const pdf = state.importantPdfs.find((item) => item.id === renamePdf.dataset.renamePdf);
    const input = qs(`[data-pdf-rename-input="${renamePdf.dataset.renamePdf}"]`);
    if (!pdf || !input) return;
    const name = input.value.trim();
    if (!name) return showToast("PDF name blank nahi ho sakta.");
    pdf.name = name;
    saveState();
    renderImportantPdfList();
    updateImportantPdfButtons();
    showToast("PDF name updated.");
  }
  if (deletePdf) {
    state.importantPdfs = state.importantPdfs.filter((item) => item.id !== deletePdf.dataset.deletePdf);
    saveState();
    renderImportantPdfList();
    updateImportantPdfButtons();
    showToast("PDF deleted.");
  }
  if (resetEmployeePassword) {
    const employee = state.employees.find((item) => item.id === resetEmployeePassword.dataset.resetEmployeePassword);
    const input = qs(`[data-password-reset-input="${resetEmployeePassword.dataset.resetEmployeePassword}"]`);
    if (!employee || !input) return;
    const password = input.value.trim();
    if (!password) return showToast("Password blank nahi ho sakta.");
    employee.password = password;
    employee.active = true;
    saveState();
    pushStateToServer();
    renderAdminRows();
    showToast("Employee password set/reset ho gaya.");
  }
  if (receivePending) {
    const source = receivePending.dataset.receivePending;
    const id = receivePending.dataset.id;
    const item = source === "Sale" ? state.sales.find((sale) => sale.id === id) : state.customers.find((customer) => customer.id === id);
    if (item) openCustomerModal({ id: source === "Customer" ? item.id : "", name: item.name || item.customer, mobile: item.mobile, invoice: item.invoice, bikeNo: item.bikeNo || item.frameNo, total: item.pending, paid: 0, pending: item.pending });
  }
  if (fillPendingMatch) {
    const item = pendingReferenceMatches()[Number(fillPendingMatch.dataset.fillPendingMatch)];
    if (item) openCustomerModal({ id: item.matchSource === "Customer" ? item.id : "", name: item.name || item.customer, mobile: item.mobile, invoice: item.invoice, bikeNo: item.bikeNo || item.frameNo || item.registrationNo, total: item.pending, paid: 0, pending: item.pending });
  }
  if (fillOldPendingMatch) {
    const item = pendingReferenceMatches()[Number(fillOldPendingMatch.dataset.fillOldPendingMatch)];
    const oldPending = Number(fillOldPendingMatch.dataset.oldPending || item?.pending || 0);
    if (item) openCustomerModal({ id: item.matchSource === "Customer" ? item.id : "", name: item.name || item.customer, mobile: item.mobile, invoice: item.invoice, bikeNo: item.bikeNo || item.frameNo || item.registrationNo, partsAmount: 0, total: oldPending, paid: 0, pending: oldPending });
  }
  if (fillPartsPayment) {
    const partsAmount = numberValue("#quickPartsAmount");
    qs("#quickTotal").value = partsAmount;
    qs("#quickPending").value = partsAmount;
    qs("#quickPaid").value = 0;
    qs("#quickDiscount").value = 0;
    updateQuickPaymentPreview();
  }
  if (receiveParts) openPartsPayment(receiveParts.dataset.receiveParts);
  if (editEmployee) {
    const item = state.employees.find((employee) => employee.id === editEmployee.dataset.editEmployee);
    editingEmployeeId = item.id;
    fillEmployeeForm(item);
  }
  if (deleteEmployee) {
    state.employees = state.employees.filter((employee) => employee.id !== deleteEmployee.dataset.deleteEmployee || employee.role === "admin");
    saveState();
    renderAdminRows();
  }
  if (editDistributor) {
    const item = state.distributors.find((distributor) => distributor.id === editDistributor.dataset.editDistributor);
    editingDistributorId = item.id;
    fillDistributorForm(item);
  }
  if (deleteDistributor) {
    state.distributors = state.distributors.filter((item) => item.id !== deleteDistributor.dataset.deleteDistributor);
    state.distributorTransactions = state.distributorTransactions.filter((item) => item.distributorId !== deleteDistributor.dataset.deleteDistributor);
    syncDistributorTotals();
    saveState();
    renderAdminRows();
  }
  if (deleteDistributorEntry) {
    state.distributorTransactions = state.distributorTransactions.filter((item) => item.id !== deleteDistributorEntry.dataset.deleteDistributorEntry);
    syncDistributorTotals();
    saveState();
    renderAdminRows();
    showToast("Distributor entry deleted.");
  }
  if (completeRto) {
    const item = state.rto.find((rto) => rto.id === completeRto.dataset.completeRto);
    item.rtoName = qs(`[data-rto-name="${item.id}"]`).value.trim();
    item.registrationNo = qs(`[data-rto-reg="${item.id}"]`).value.trim();
    item.status = item.rtoName && item.registrationNo ? "Completed" : "Pending";
    saveState();
    renderPage();
  }
  if (completeIns) {
    const item = state.insurance.find((ins) => ins.id === completeIns.dataset.completeIns);
    item.company = qs(`[data-ins-company="${item.id}"]`).value.trim();
    item.policyNo = qs(`[data-ins-policy="${item.id}"]`).value.trim();
    item.expiryDate = qs(`[data-ins-expiry="${item.id}"]`).value;
    item.status = insuranceDisplayStatus(item);
    saveState();
    renderPage();
  }
  if (deletePart) {
    state.parts = state.parts.filter((part) => part.id !== deletePart.dataset.deletePart);
    saveState();
    if (qs("#partsRows")) renderPartsRows();
    else renderPage();
    showToast("Part deleted.");
  }
  if (deleteBike) {
    state.bikes = state.bikes.filter((bike) => bike.id !== deleteBike.dataset.deleteBike);
    saveState();
    renderPage();
    showToast("Bike deleted.");
  }
  if (deleteSale) {
    const id = deleteSale.dataset.deleteSale;
    const sale = state.sales.find((item) => item.id === id);
    state.sales = state.sales.filter((item) => item.id !== id);
    state.customers = state.customers.filter((item) => item.saleId !== id);
    state.rto = state.rto.filter((item) => item.saleId !== id);
    state.insurance = state.insurance.filter((item) => item.saleId !== id);
    if (sale?.frameNo && !state.bikes.some((bike) => same(bike.frameNo, sale.frameNo))) {
      state.bikes.push({ id: createId(), model: sale.bike || "Returned Bike", category: sale.category || "", frameNo: sale.frameNo, engineNo: sale.engineNo || "", colour: sale.colour || "", keyNo: sale.keyNo || "", price: Number(sale.total || 0) });
    }
    saveState();
    renderPage();
    showToast("Sale deleted.");
  }
  if (deleteRto) {
    state.rto = state.rto.filter((item) => item.id !== deleteRto.dataset.deleteRto);
    saveState();
    renderPage();
    showToast("RTO record deleted.");
  }
  if (deleteInsurance) {
    state.insurance = state.insurance.filter((item) => item.id !== deleteInsurance.dataset.deleteInsurance);
    saveState();
    renderPage();
    showToast("Insurance record deleted.");
  }
  if (deletePaymentLog) {
    state.paymentLogs = state.paymentLogs.filter((item) => item.id !== deletePaymentLog.dataset.deletePaymentLog);
    saveState();
    renderPage();
    showToast("Payment list entry deleted.");
  }
  if (editCustomer) {
    const item = state.customers.find((customer) => customer.id === editCustomer.dataset.editCustomer);
    if (item) openCustomerModal(item);
  }
  if (deleteCustomer) {
    state.customers = state.customers.filter((customer) => customer.id !== deleteCustomer.dataset.deleteCustomer);
    saveState();
    renderPage();
    showToast("Customer deleted.");
  }
  if (customerFor) {
    const sale = state.sales.find((item) => item.id === customerFor.dataset.openCustomerFor);
    openCustomerModal({ name: sale.customer, mobile: sale.mobile, invoice: sale.invoice, bikeNo: sale.frameNo, pending: sale.pending });
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.closest("[data-pdf-upload-form]")) uploadImportantPdf(event);
});

document.addEventListener("input", (event) => {
  if (event.target.closest("[data-pdf-search]")) renderImportantPdfList();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  refreshInstallButtons();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  refreshInstallButtons();
  showToast("App installed.");
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((registration) => registration.update()).catch(() => {});
  });
}

saveState();
renderPage();
initServerSync();

const storeKey = "bikeBusinessDashboardSalesV1";
const state = loadState();
let installPrompt = null;

const loginView = document.querySelector("#loginView");
const appShell = document.querySelectorAll(".app-shell");
const loginForm = document.querySelector("#loginForm");
const loginUser = document.querySelector("#loginUser");
const loginPass = document.querySelector("#loginPass");
const loginError = document.querySelector("#loginError");
const logoutBtn = document.querySelector("#logoutBtn");
const installButton = document.querySelector("#installApp");
const menuToggle = document.querySelector("#menuToggle");
const topbar = document.querySelector(".topbar");
const pageTitle = document.querySelector("#pageTitle");
const menuItems = document.querySelectorAll(".menu-item");
const views = document.querySelectorAll(".view");
const salesForm = document.querySelector("#salesForm");
const saleDate = document.querySelector("#saleDate");
const salesRows = document.querySelector("#salesRows");

const totalSales = document.querySelector("#totalSales");
const pendingBalance = document.querySelector("#pendingBalance");
const pendingSummary = document.querySelector("#pendingSummary");
const salesCount = document.querySelector("#salesCount");
const salesCaption = document.querySelector("#salesCaption");
const pendingCaption = document.querySelector("#pendingCaption");
const activityTitle = document.querySelector("#activityTitle");
const activityText = document.querySelector("#activityText");

function loadState() {
  const saved = localStorage.getItem(storeKey);
  if (saved) return JSON.parse(saved);
  return { sales: [] };
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function openView(viewId) {
  views.forEach((view) => view.classList.toggle("active", view.id === viewId));
  menuItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  pageTitle.textContent = viewId === "salesView" ? "Sales" : "Dashboard";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setLoggedIn(isLoggedIn) {
  document.body.classList.toggle("login-active", !isLoggedIn);
  loginView.hidden = isLoggedIn;
  loginView.style.display = isLoggedIn ? "none" : "";
  appShell.forEach((item) => {
    item.hidden = !isLoggedIn;
    item.style.display = isLoggedIn ? "" : "none";
  });
  if (isLoggedIn) {
    sessionStorage.setItem("bikeBusinessLoggedIn", "yes");
  } else {
    sessionStorage.removeItem("bikeBusinessLoggedIn");
    loginForm.reset();
    loginUser.focus();
  }
}

function renderSalesRows() {
  if (!state.sales.length) {
    salesRows.innerHTML = `<tr><td class="empty-row" colspan="8">No sales records found.</td></tr>`;
    return;
  }

  salesRows.innerHTML = state.sales
    .slice()
    .reverse()
    .map((sale) => `
      <tr>
        <td>${sale.date}</td>
        <td>${sale.customer}</td>
        <td>${sale.mobile || "-"}</td>
        <td>${sale.bike || "-"}</td>
        <td>${sale.item}</td>
        <td>${money(sale.total)}</td>
        <td>${money(sale.paid)}</td>
        <td class="${sale.pending > 0 ? "due" : "ok"}">${money(sale.pending)}</td>
      </tr>
    `)
    .join("");
}

function renderDashboard() {
  const total = state.sales.reduce((sum, sale) => sum + sale.total, 0);
  const pending = state.sales.reduce((sum, sale) => sum + sale.pending, 0);
  const count = state.sales.length;

  totalSales.textContent = money(total);
  pendingBalance.textContent = money(pending);
  pendingSummary.textContent = money(pending);
  salesCount.textContent = count;
  salesCaption.textContent = count ? `${count} sale entries recorded` : "No sales recorded yet";
  pendingCaption.textContent = pending ? "Customer dues need follow-up." : "No pending balance available.";

  if (count) {
    const latest = state.sales[state.sales.length - 1];
    activityTitle.textContent = "Latest sale saved";
    activityText.textContent = `${latest.customer} - ${latest.item} - ${money(latest.total)}`;
  } else {
    activityTitle.textContent = "No activity yet";
    activityText.textContent = "Create your first sale entry to start tracking business activity.";
  }
}

function renderAll() {
  renderDashboard();
  renderSalesRows();
}

function addSale(event) {
  event.preventDefault();
  const total = Number(document.querySelector("#saleTotal").value);
  const paid = Number(document.querySelector("#salePaid").value);

  state.sales.push({
    customer: document.querySelector("#customerName").value.trim(),
    mobile: document.querySelector("#customerMobile").value.trim(),
    bike: document.querySelector("#bikeModel").value.trim(),
    item: document.querySelector("#saleItem").value.trim(),
    total,
    paid,
    pending: Math.max(total - paid, 0),
    date: saleDate.value,
  });

  saveState();
  salesForm.reset();
  saleDate.value = today();
  renderAll();
}

let lastScrollY = window.scrollY;

function handleMobileHeader() {
  if (!topbar) return;
  if (window.innerWidth > 680 || document.body.classList.contains("login-active")) {
    topbar.classList.remove("header-hidden");
    lastScrollY = window.scrollY;
    return;
  }

  const currentScrollY = window.scrollY;
  const scrollingDown = currentScrollY > lastScrollY;
  topbar.classList.toggle("header-hidden", scrollingDown && currentScrollY > 80);
  lastScrollY = currentScrollY;
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-view]");
  if (target) openView(target.dataset.view);
});

window.addEventListener("scroll", handleMobileHeader, { passive: true });
window.addEventListener("resize", handleMobileHeader);
menuToggle.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-open");
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const userName = loginUser.value.trim().toLowerCase();
  const employee = (state.employees || []).find((item) =>
    item.active !== false &&
    String(item.username || "").trim().toLowerCase() === userName &&
    item.password === loginPass.value
  );
  const isValid = Boolean(employee) || (userName === "admin" && loginPass.value === "1234");
  loginError.hidden = isValid;
  if (isValid) {
    if (employee?.role === "parts_manager") {
      window.location.href = "parts.html";
      return;
    }
    setLoggedIn(true);
  }
});

logoutBtn.addEventListener("click", () => setLoggedIn(false));
salesForm.addEventListener("submit", addSale);
saleDate.value = today();
renderAll();
setLoggedIn(sessionStorage.getItem("bikeBusinessLoggedIn") === "yes");

if (installButton) {
  installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  if (installButton) installButton.hidden = false;
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

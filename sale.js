const storeKey = "bikeBusinessDashboardSalesV1";
const state = loadState();

const form = document.querySelector("#salePageForm");
const bikeForm = document.querySelector("#bikeForm");
const toast = document.querySelector("#toast");
const bikeSubmitBtn = document.querySelector("#bikeSubmitBtn");
const saleSubmitBtn = document.querySelector("#saleSubmitBtn");
const newBikeModel = document.querySelector("#newBikeModel");
const newBikeCategory = document.querySelector("#newBikeCategory");
const newBikeCompany = document.querySelector("#newBikeCompany");
const customModelWrap = document.querySelector("#customModelWrap");
const customBikeModel = document.querySelector("#customBikeModel");
const customCategoryWrap = document.querySelector("#customCategoryWrap");
const customBikeCategory = document.querySelector("#customBikeCategory");
const saleDate = document.querySelector("#saleDate");
const bikeModel = document.querySelector("#bikeModel");
const saleFrameNo = document.querySelector("#saleFrameNo");
const saleEngineNo = document.querySelector("#saleEngineNo");
const saleKeyNo = document.querySelector("#saleKeyNo");
const saleColour = document.querySelector("#saleColour");
const paymentType = document.querySelector("#paymentType");
const saleTotal = document.querySelector("#saleTotal");
const salePaid = document.querySelector("#salePaid");
const salePending = document.querySelector("#salePending");
const downPayment = document.querySelector("#downPayment");
const emiAmount = document.querySelector("#emiAmount");
const emiMonths = document.querySelector("#emiMonths");
const financeCompany = document.querySelector("#financeCompany");
const totalAmountWrap = document.querySelector("#totalAmountWrap");
const financeFields = document.querySelectorAll(".finance-field");
const notificationBell = document.querySelector("#notificationBell");
const notificationCount = document.querySelector("#notificationCount");
const notificationPanel = document.querySelector("#notificationPanel");
const rows = document.querySelector("#salePageRows");
const bikeRows = document.querySelector("#bikeRows");
const salesSearch = document.querySelector("#salesSearch");
const bikeSearch = document.querySelector("#bikeSearch");
const globalSearch = document.querySelector("#globalSearch");
const voiceSearch = document.querySelector("#voiceSearch");
const salesPanels = document.querySelectorAll(".sales-panel");
const totalEl = document.querySelector("#salePageTotal");
const pendingEl = document.querySelector("#salePagePending");
const paidEl = document.querySelector("#salePagePaid");
const countEl = document.querySelector("#salePageCount");
const todayEl = document.querySelector("#salePageToday");
const menuToggle = document.querySelector("#menuToggle");
const topbar = document.querySelector(".topbar");
let editingBikeId = null;
let editingSaleId = null;
let toastTimer = null;

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

function loadState() {
  const saved = localStorage.getItem(storeKey);
  if (saved) {
    const data = JSON.parse(saved);
    if (!data.bikes) data.bikes = [];
    if (!data.customers) data.customers = [];
    if (!data.rto) data.rto = [];
    if (!data.insurance) data.insurance = [];
    data.sales = (data.sales || []).map((sale) => ({ ...sale, id: sale.id || createId() }));
    data.bikes = data.bikes.map((bike) => ({ ...bike, id: bike.id || createId() }));
    return data;
  }
  return { sales: [], bikes: [], customers: [], rto: [], insurance: [] };
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesText(item, query) {
  if (!query) return true;
  return Object.values(item).join(" ").toLowerCase().includes(query);
}

function activeQuery(specificInput) {
  return normalize(specificInput.value || globalSearch.value);
}

function openPanel(panelId) {
  salesPanels.forEach((panel) => panel.classList.toggle("active", panel.id === panelId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 8000);
}

function renderRows() {
  const query = activeQuery(salesSearch);
  const sales = state.sales.filter((sale) => matchesText(sale, query));

  if (!sales.length) {
    rows.innerHTML = `<tr><td class="empty-row" colspan="21">No sales records found.</td></tr>`;
    return;
  }

  rows.innerHTML = sales
    .slice()
    .reverse()
    .map((sale) => `
      <tr>
        <td>${sale.date}</td>
        <td>${sale.customer}</td>
        <td>${sale.guardian || "-"}</td>
        <td>${sale.idNo || "-"}</td>
        <td>${sale.invoice || "-"}</td>
        <td>${sale.mobile || "-"}</td>
        <td>${sale.address || "-"}</td>
        <td>${sale.bike || "-"}</td>
        <td>${sale.frameNo || "-"}</td>
        <td>${sale.engineNo || "-"}</td>
        <td>${sale.keyNo || "-"}</td>
        <td>${sale.colour || sale.color || "-"}</td>
        <td>${sale.paymentType || sale.item || "-"}</td>
        <td>${money(sale.total)}</td>
        <td>${money(sale.downPayment || 0)}</td>
        <td>${money(sale.emi || 0)}</td>
        <td>${sale.emiMonths || "-"}</td>
        <td>${sale.financeCompany || "-"}</td>
        <td>${money(sale.paid)}</td>
        <td class="${sale.pending > 0 ? "due" : "ok"}">${money(sale.pending)}</td>
        <td>
          <div class="row-actions">
            <button class="edit-btn" data-edit-sale="${sale.id}" type="button">Edit</button>
            <button class="delete-btn" data-delete-sale="${sale.id}" type="button">Delete</button>
          </div>
        </td>
      </tr>
    `)
    .join("");
}

function renderBikes() {
  const query = activeQuery(bikeSearch);
  const bikes = state.bikes.filter((bike) => matchesText(bike, query));

  if (!bikes.length) {
    bikeRows.innerHTML = `<tr><td class="empty-row" colspan="8">No bikes found.</td></tr>`;
    return;
  }

  bikeRows.innerHTML = bikes
    .map((bike) => `
      <tr>
        <td>${bike.model}</td>
        <td>${bike.category || "-"}</td>
        <td>${bike.company || "-"}</td>
        <td>${bike.frameNo || "-"}</td>
        <td>${bike.engineNo || "-"}</td>
        <td>${bike.keyNo || "-"}</td>
        <td>${bike.colour || bike.color || "-"}</td>
        <td>
          <div class="row-actions">
            <button class="edit-btn" data-edit-bike="${bike.id}" type="button">Edit</button>
            <button class="delete-btn" data-delete-bike="${bike.id}" type="button">Delete</button>
          </div>
        </td>
      </tr>
    `)
    .join("");
}

function renderStats() {
  const total = state.sales.reduce((sum, sale) => sum + sale.total, 0);
  const paid = state.sales.reduce((sum, sale) => sum + sale.paid, 0);
  const pending = state.sales.reduce((sum, sale) => sum + sale.pending, 0);
  const todayCount = state.sales.filter((sale) => sale.date === today()).length;

  totalEl.textContent = money(total);
  paidEl.textContent = money(paid);
  pendingEl.textContent = money(pending);
  countEl.textContent = state.sales.length ? `${state.sales.length} sale entries recorded` : "No sales recorded yet";
  todayEl.textContent = todayCount;
}

function renderAll() {
  renderStats();
  renderBikes();
  renderRows();
  renderNotifications();
}

function findBikeByFrameOrEngine(frameNo, engineNo) {
  const frame = normalize(frameNo);
  const engine = normalize(engineNo);
  if (!frame && !engine) return null;

  const exactMatch = state.bikes.find((bike) => {
    const bikeFrame = normalize(bike.frameNo);
    const bikeEngine = normalize(bike.engineNo);
    return (frame && bikeFrame === frame) || (engine && bikeEngine === engine);
  });

  if (exactMatch) return exactMatch;

  return state.bikes.find((bike) => {
    const bikeFrame = normalize(bike.frameNo);
    const bikeEngine = normalize(bike.engineNo);
    return (frame && bikeFrame.includes(frame)) || (engine && bikeEngine.includes(engine));
  }) || null;
}

function fillBikeData(bike) {
  if (!bike) {
    bikeModel.value = "";
    saleKeyNo.value = "";
    saleColour.value = "";
    return;
  }

  bikeModel.value = [bike.model, bike.company].filter(Boolean).join(" - ");
  saleFrameNo.value = bike.frameNo || saleFrameNo.value;
  saleEngineNo.value = bike.engineNo || saleEngineNo.value;
  saleKeyNo.value = bike.keyNo || "";
  saleColour.value = bike.colour || bike.color || "";
}

function autoFetchBike() {
  fillBikeData(findBikeByFrameOrEngine(saleFrameNo.value, saleEngineNo.value));
}

function syncPaymentAmount() {
  if (paymentType.value === "Cash") {
    totalAmountWrap.hidden = true;
    saleTotal.required = false;
    financeFields.forEach((field) => {
      field.hidden = true;
    });
    salePaid.readOnly = false;
    salePending.readOnly = false;
  } else {
    totalAmountWrap.hidden = true;
    saleTotal.required = false;
    financeFields.forEach((field) => {
      field.hidden = false;
    });
    salePaid.value = downPayment.value || 0;
    salePaid.readOnly = true;
    salePending.readOnly = false;
  }
}

function syncBikeModelDetails() {
  newBikeCompany.value = "TVS";
  const isCustom = newBikeModel.value === "__custom__";
  customModelWrap.hidden = !isCustom;
  customCategoryWrap.hidden = !isCustom;
  customBikeModel.required = isCustom;
  customBikeCategory.required = isCustom;
  newBikeCategory.readOnly = !isCustom;
  newBikeCategory.value = isCustom ? customBikeCategory.value : bikeCategories[newBikeModel.value] || "";
}

function addBike(event) {
  event.preventDefault();
  const bike = {
    id: editingBikeId || createId(),
    model: newBikeModel.value === "__custom__" ? customBikeModel.value.trim() : newBikeModel.value,
    category: newBikeModel.value === "__custom__" ? customBikeCategory.value.trim() : newBikeCategory.value,
    company: "TVS",
    frameNo: document.querySelector("#newBikeFrame").value.trim(),
    engineNo: document.querySelector("#newBikeEngine").value.trim(),
    keyNo: document.querySelector("#newBikeKey").value.trim(),
    colour: document.querySelector("#newBikeColour").value.trim(),
  };

  const duplicate = findBikeByFrameOrEngine(bike.frameNo, bike.engineNo);
  const isDuplicate = duplicate && duplicate.id !== editingBikeId;
  if (isDuplicate) {
    alert("This frame number or engine number already exists.");
    return;
  }

  if (editingBikeId) {
    const index = state.bikes.findIndex((item) => item.id === editingBikeId);
    if (index !== -1) state.bikes[index] = bike;
    editingBikeId = null;
    bikeSubmitBtn.textContent = "Add Bike";
    showToast("Bike record updated successfully.");
  } else {
    state.bikes.push(bike);
    showToast("Bike record added successfully.");
  }
  saveState();
  bikeForm.reset();
   globalSearch.value = "";
  bikeSearch.value = "";
  syncBikeModelDetails();
  renderAll();
  openPanel("bikeListPanel");
  saleFrameNo.value = bike.frameNo;
  saleEngineNo.value = bike.engineNo;
  fillBikeData(bike);
}

function addSale(event) {
  event.preventDefault();
  syncPaymentAmount();
  const isFinance = paymentType.value === "Finance";
  const total = Number(salePaid.value) + Number(salePending.value);
  const paid = Number(salePaid.value);
  const bike = findBikeByFrameOrEngine(saleFrameNo.value, saleEngineNo.value);

  if (!bike) {
    alert("Bike data not found. Please add the bike first or check frame/engine number.");
    return;
  }

  const sale = {
    id: editingSaleId || createId(),
    customer: document.querySelector("#customerName").value.trim(),
    guardian: document.querySelector("#guardianName").value.trim(),
    idNo: document.querySelector("#customerIdNo").value.trim(),
    invoice: document.querySelector("#invoiceNo").value.trim(),
    mobile: document.querySelector("#customerMobile").value.trim(),
    address: document.querySelector("#customerAddress").value.trim(),
    bike: bikeModel.value,
    frameNo: saleFrameNo.value.trim(),
    engineNo: saleEngineNo.value.trim(),
    keyNo: saleKeyNo.value.trim(),
    colour: saleColour.value.trim(),
    paymentType: paymentType.value,
    item: paymentType.value,
    total,
    downPayment: isFinance ? Number(downPayment.value) : 0,
    emi: isFinance ? Number(emiAmount.value) : 0,
    emiMonths: isFinance ? Number(emiMonths.value) : 0,
    financeCompany: isFinance ? financeCompany.value.trim() : "",
    paid,
    pending: Number(salePending.value),
    date: saleDate.value,
  };

  if (editingSaleId) {
    const index = state.sales.findIndex((item) => item.id === editingSaleId);
    if (index !== -1) state.sales[index] = sale;
    editingSaleId = null;
    saleSubmitBtn.textContent = "Save Sale";
    showToast("Sale record updated successfully.");
  } else {
    state.sales.push(sale);
    state.customers.push({
      id: createId(),
      saleId: sale.id,
      name: sale.customer,
      mobile: sale.mobile,
      invoice: sale.invoice || sale.id,
      bikeNo: sale.frameNo,
      paid: sale.paid,
      pending: sale.pending,
      date: sale.date,
    });
    state.rto.push({
      id: createId(),
      saleId: sale.id,
      customer: sale.customer,
      mobile: sale.mobile,
      invoice: sale.invoice || sale.id,
      frameNo: sale.frameNo,
      status: "Pending",
      registrationNo: "",
      date: sale.date,
    });
    state.insurance.push({
      id: createId(),
      saleId: sale.id,
      customer: sale.customer,
      mobile: sale.mobile,
      invoice: sale.invoice || sale.id,
      frameNo: sale.frameNo,
      status: "Pending",
      company: "",
      policyNo: "",
      expenses: 0,
      nextDate: "",
    });
    state.bikes = state.bikes.filter((item) => item.id !== bike.id);
    showToast("Sale record saved successfully.");
  }

  saveState();
  form.reset();
  saleDate.value = today();
  saleFrameNo.value = "";
  saleEngineNo.value = "";
  bikeModel.value = "";
  saleKeyNo.value = "";
  saleColour.value = "";
  syncPaymentAmount();
  renderAll();
}

function editBike(id) {
  const bike = state.bikes.find((item) => item.id === id);
  if (!bike) return;
  editingBikeId = id;
  document.querySelector("#newBikeModel").value = bike.model || "";
  const knownModel = Boolean(bikeCategories[bike.model]);
  newBikeModel.value = knownModel ? bike.model : "__custom__";
  customBikeModel.value = knownModel ? "" : bike.model || "";
  customBikeCategory.value = knownModel ? "" : bike.category || "";
  syncBikeModelDetails();
  newBikeCategory.value = bike.category || bikeCategories[bike.model] || "";
  newBikeCompany.value = "TVS";
  document.querySelector("#newBikeFrame").value = bike.frameNo || "";
  document.querySelector("#newBikeEngine").value = bike.engineNo || "";
  document.querySelector("#newBikeKey").value = bike.keyNo || "";
  document.querySelector("#newBikeColour").value = bike.colour || bike.color || "";
  bikeSubmitBtn.textContent = "Update Bike";
  openPanel("bikeFormPanel");
}

function editSale(id) {
  const sale = state.sales.find((item) => item.id === id);
  if (!sale) return;
  editingSaleId = id;
  document.querySelector("#customerName").value = sale.customer || "";
  document.querySelector("#guardianName").value = sale.guardian || "";
  document.querySelector("#customerIdNo").value = sale.idNo || "";
  document.querySelector("#invoiceNo").value = sale.invoice || "";
  document.querySelector("#customerMobile").value = sale.mobile || "";
  document.querySelector("#customerAddress").value = sale.address || "";
  saleFrameNo.value = sale.frameNo || "";
  saleEngineNo.value = sale.engineNo || "";
  bikeModel.value = sale.bike || "";
  saleKeyNo.value = sale.keyNo || "";
  saleColour.value = sale.colour || sale.color || "";
  paymentType.value = sale.paymentType || "Cash";
  downPayment.value = sale.downPayment || 0;
  emiAmount.value = sale.emi || 0;
  emiMonths.value = sale.emiMonths || 12;
  financeCompany.value = sale.financeCompany || "";
  salePaid.value = sale.paid || 0;
  salePending.value = sale.pending || 0;
  saleDate.value = sale.date || today();
  syncPaymentAmount();
  saleSubmitBtn.textContent = "Update Sale";
  openPanel("saleFormPanel");
}

function deleteSale(id) {
  const index = state.sales.findIndex((sale) => sale.id === id);
  if (index === -1) return;
  if (!confirm("Delete this sale record?")) return;
  state.sales.splice(index, 1);
  saveState();
  renderAll();
  showToast("Sale record deleted successfully.");
}

function deleteBike(id) {
  const index = state.bikes.findIndex((bike) => bike.id === id);
  if (index === -1) return;
  if (!confirm("Delete this bike record?")) return;
  state.bikes.splice(index, 1);
  saveState();
  renderAll();
  autoFetchBike();
  showToast("Bike record deleted successfully.");
}

function runVoiceSearch() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice search is not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    globalSearch.value = text;
    salesSearch.value = "";
    bikeSearch.value = "";
    renderAll();
  };
  recognition.start();
}

function insuranceReminders() {
  const now = new Date(`${today()}T00:00:00`);
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  return (state.insurance || []).filter((item) => {
    const expiryText = item.expiryDate || item.nextDate;
    if (!expiryText) return false;
    const diff = new Date(`${expiryText}T00:00:00`) - now;
    return diff >= 0 && diff <= monthMs;
  });
}

function renderNotifications() {
  if (!notificationPanel || !notificationCount) return;
  const notices = [];
  (state.rto || []).filter((item) => item.status !== "Completed").forEach((item) => {
    notices.push({ title: "RTO Pending", text: `${item.customer || "-"} - ${item.invoice || "-"}` });
  });
  (state.insurance || []).filter((item) => item.status !== "Completed").forEach((item) => {
    notices.push({ title: "Insurance Pending", text: `${item.customer || "-"} - ${item.invoice || "-"}` });
  });
  insuranceReminders().forEach((item) => {
    notices.push({ title: "Insurance Expiry", text: `${item.customer || "-"} expires on ${item.expiryDate || item.nextDate}` });
  });

  notificationCount.textContent = notices.length;
  notificationPanel.innerHTML = notices.length
    ? notices.map((notice) => `<div class="notice"><strong>${notice.title}</strong>${notice.text}</div>`).join("")
    : `<div class="notice"><strong>No alerts</strong>All clear right now.</div>`;
}

let lastScrollY = window.scrollY;

function handleMobileHeader() {
  if (!topbar) return;
  if (window.innerWidth > 680) {
    topbar.classList.remove("header-hidden");
    lastScrollY = window.scrollY;
    return;
  }

  const currentScrollY = window.scrollY;
  const scrollingDown = currentScrollY > lastScrollY;
  topbar.classList.toggle("header-hidden", scrollingDown && currentScrollY > 80);
  lastScrollY = currentScrollY;
}

form.addEventListener("submit", addSale);
bikeForm.addEventListener("submit", addBike);
newBikeModel.addEventListener("change", syncBikeModelDetails);
customBikeCategory.addEventListener("input", syncBikeModelDetails);
saleFrameNo.addEventListener("input", autoFetchBike);
saleEngineNo.addEventListener("input", autoFetchBike);
paymentType.addEventListener("change", syncPaymentAmount);
saleTotal.addEventListener("input", syncPaymentAmount);
salePaid.addEventListener("input", syncPaymentAmount);
downPayment.addEventListener("input", syncPaymentAmount);
if (notificationBell) {
  notificationBell.addEventListener("click", () => {
    notificationPanel.hidden = !notificationPanel.hidden;
  });
}
menuToggle.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-open");
});
salesSearch.addEventListener("input", renderRows);
bikeSearch.addEventListener("input", renderBikes);
globalSearch.addEventListener("input", renderAll);
voiceSearch.addEventListener("click", runVoiceSearch);
document.addEventListener("click", (event) => {
  const panelButton = event.target.closest("[data-panel]");
  const saleEdit = event.target.closest("[data-edit-sale]");
  const bikeEdit = event.target.closest("[data-edit-bike]");
  const saleDelete = event.target.closest("[data-delete-sale]");
  const bikeDelete = event.target.closest("[data-delete-bike]");
  if (panelButton) openPanel(panelButton.dataset.panel);
  if (saleEdit) editSale(saleEdit.dataset.editSale);
  if (bikeEdit) editBike(bikeEdit.dataset.editBike);
  if (saleDelete) deleteSale(saleDelete.dataset.deleteSale);
  if (bikeDelete) deleteBike(bikeDelete.dataset.deleteBike);
});
window.addEventListener("scroll", handleMobileHeader, { passive: true });
window.addEventListener("resize", handleMobileHeader);

saleDate.value = today();
syncBikeModelDetails();
syncPaymentAmount();
renderAll();

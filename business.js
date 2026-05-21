
    );
    if (sale) customer.saleId = sale.id;
  });
  data.sales.forEach((sale) => {
    sale.total = Number(sale.total || 0);
    sale.paid = Number(sale.paid || 0);
    sale.discount = Number(sale.discount || 0);
    sale.pending = Math.max(sale.total - sale.paid - sale.discount, 0);
  });
  data.customers.forEach((customer) => {
    if (!customer.saleId) return;
    const sale = data.sales.find((item) => item.id === customer.saleId);
    if (sale) customer.pending = Number(sale.pending || 0);
  });
  data.distributors.forEach((item) => {
    item.name = item.name || "Distributor";
    item.balance = Math.max(Number(item.total || 0) - Number(item.paid || 0), 0);
    item.extra = Math.max(Number(item.paid || 0) - Number(item.total || 0), 0);
  });
  data.partSales.forEach((item) => {
    const amount = Number(item.amount || 0);
    item.paid = Number(item.paid || 0);
    item.discount = Number(item.discount || 0);
    item.pending = Math.max(amount - item.paid - item.discount, 0);
  });
  if (!data.distributorTransactions.length) {
    data.distributors.forEach((item) => {
      if (Number(item.total || 0) > 0) {
      <article class="stat-card stat-action" id="availablePartsCard" role="button" tabindex="0"><span>Available Parts</span><strong id="partsStockCount">0</strong><small>Click to view stock items</small></article>
      <article class="stat-card stat-action" id="lowStockCard" role="button" tabindex="0"><span>Low Stock</span><strong id="partsLowCount">0</strong><small>Click to view refill list</small></article>
      <article class="stat-card stat-action" id="issuedTodayCard" role="button" tabindex="0"><span>Issued Today</span><strong id="partsIssuedToday">0</strong><small>Click to view parts quantity</small></article>
      <article class="stat-card warning"><span>Parts Balance</span><strong id="partsPendingTotal">Rs 0</strong><small>Pending parts payment</small></article>
      ${showStockValue ? `<article class="stat-card stat-action warning" id="partsValueCard" role="button" tabindex="0"><span>Parts Value</span><strong id="partsValueTotal">Rs 0</strong><small>Click to view MRP stock value</small></article>` : ""}
    </section>`;
}
    const appliedCredit = pendingBefore > 0 ? Math.min(receivedNow + discountNow, pendingBefore) : receivedNow + discountNow;
    const appliedPayment = pendingBefore > 0 ? Math.min(receivedNow, pendingBefore) : receivedNow;
    const partsAmount = numberValue("#quickPartsAmount");
    if (partsAmount > 0) {
      const reference = textValue("#quickBikeNo") || textValue("#quickInvoice");
      const partsPendingBefore = partPendingForReference(reference) || partsAmount;
      const partsCredit = Math.min(receivedNow + discountNow, partsPendingBefore);
      const partsPayment = Math.min(receivedNow, partsPendingBefore);
      applyPartsPayment(reference, receivedNow, discountNow);
      state.paymentLogs.push({
        id: createId(),
        source: "Parts",
        date: textValue("#quickDate") || today(),
        name: textValue("#quickCustomerName") || "Parts Sale",
        mobile: textValue("#quickMobile"),
        invoice: textValue("#quickInvoice"),
        bikeNo: textValue("#quickBikeNo"),
        total: partsPendingBefore,
        partsAmount,
        extra: 0,
        paid: partsPayment,
        discount: Math.max(partsCredit - partsPayment, 0),
        pending: Math.max(partsPendingBefore - partsCredit, 0),
      });
      editingCustomerId = null;
      saveState();
      modal.hidden = true;
      renderPage();
      showToast("Parts payment saved.");
      return;
    }
    const serviceCharge = partsAmount > 0 ? Math.max(totalAmount - partsAmount, 0) : Math.max(receivedNow + discountNow - pendingBefore, 0);
    const record = {
      id: existingCustomer?.id || editingCustomerId || createId(),
    (bikeNo && (same(item.bikeNo, bikeNo) || same(item.frameNo, bikeNo) || same(item.registrationNo, bikeNo))) ||
    (invoice && same(item.invoice, invoice));
  const customerRows = state.customers
    .filter((item) => !item.saleId && matchesInput(item) && Number(item.pending || 0) > 0)
    .filter((item) => !item.saleId && !isPartsCustomerEntry(item) && matchesInput(item) && Number(item.pending || 0) > 0)
    .map((item) => ({ ...item, matchSource: "Customer" }));
  const saleRows = state.sales
    .filter((item) => matchesInput(item) && Number(item.pending || 0) > 0)
  const rtoMatches = state.rto.filter(matchesInput);
  const linkedRows = rtoMatches.flatMap((rto) => {
    const linkedCustomers = state.customers
      .filter((item) => !item.saleId && Number(item.pending || 0) > 0 && (same(item.invoice, rto.invoice) || same(item.bikeNo, rto.frameNo) || same(item.bikeNo, rto.registrationNo)))
      .filter((item) => !item.saleId && !isPartsCustomerEntry(item) && Number(item.pending || 0) > 0 && (same(item.invoice, rto.invoice) || same(item.bikeNo, rto.frameNo) || same(item.bikeNo, rto.registrationNo)))
      .map((item) => ({ ...item, registrationNo: rto.registrationNo || item.registrationNo, matchSource: "Customer" }));
    const linkedSales = state.sales
      .filter((item) => Number(item.pending || 0) > 0 && (same(item.invoice, rto.invoice) || same(item.frameNo, rto.frameNo) || same(item.registrationNo, rto.registrationNo)))
  box.innerHTML = `<div class="notice"><strong>Old Pending Box - Total ${money(totalOldPending)}</strong>${issuedPartsHtml}${oldRowsHtml}</div>`;
}

function isPartsCustomerEntry(item = {}) {
  return Number(item.partsAmount || 0) > 0 || normalize(item.name) === "parts sale";
}

function stats() {
  const visibleSales = visibleRowsForUser(state.sales);
  const manualCustomerEntries = visibleRowsForUser(state.customers.filter((item) => !item.saleId));
  const manualCustomerEntries = visibleRowsForUser(state.customers.filter((item) => !item.saleId && !isPartsCustomerEntry(item)));
  const salesTotal = visibleSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const paid = visibleSales.reduce((sum, sale) => sum + Number(sale.paid || 0), 0) + manualCustomerEntries.reduce((sum, item) => sum + Number(item.paid || 0), 0);
  const pending = visibleSales.reduce((sum, sale) => sum + Number(sale.pending || 0), 0) + manualCustomerEntries.reduce((sum, item) => sum + Number(item.pending || 0), 0);
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
function partPendingForReference(reference) {
  return invoicePartRows(reference).reduce((sum, sale) => sum + Number(sale.pending ?? sale.amount ?? 0), 0);
}

function applyPartsPayment(reference, paidAmount, discountAmount = 0) {
  let paidLeft = Number(paidAmount || 0);
  let discountLeft = Number(discountAmount || 0);
  state.partSales.filter((sale) => sameSaleReference(sale, reference)).forEach((sale) => {
    let pending = Number(sale.pending ?? sale.amount ?? 0);
    if (pending <= 0) return;
    const paid = Math.min(paidLeft, pending);
    paidLeft -= paid;
    pending -= paid;
    const discount = Math.min(discountLeft, pending);
    discountLeft -= discount;
    pending -= discount;
    sale.paid = Number(sale.paid || 0) + paid;
    sale.discount = Number(sale.discount || 0) + discount;
    sale.pending = Math.max(pending, 0);
  });
}

    body.innerHTML = `<table><thead><tr><th>Date</th><th>Customer</th><th>Invoice</th><th>Bike</th><th>Total</th><th>Paid</th><th>Pending</th></tr></thead><tbody>${sales.length ? sales.map((sale) => `<tr><td>${sale.date || "-"}</td><td>${sale.customer || "-"}</td><td>${sale.invoice || "-"}</td><td>${sale.bike || "-"}</td><td>${money(sale.total)}</td><td>${money(sale.paid)}</td><td class="${sale.pending ? "due" : "ok"}">${money(sale.pending)}</td></tr>`).join("") : empty(7, "No sales bills.")}</tbody></table>`;
  }
  if (type === "received") {
    const manual = visibleRowsForUser(state.customers).filter((item) => !item.saleId && Number(item.paid || 0) > 0);
    const manual = visibleRowsForUser(state.customers).filter((item) => !item.saleId && !isPartsCustomerEntry(item) && Number(item.paid || 0) > 0);
    const rows = visibleRowsForUser(state.sales).filter((sale) => Number(sale.paid || 0) > 0).map((sale) => ({ date: sale.date, name: sale.customer, invoice: sale.invoice, source: "Sale", paid: sale.paid })).concat(manual.map((item) => ({ date: item.date, name: item.name, invoice: item.invoice, source: "Customer", paid: item.paid })));
    qs("#businessStatEyebrow").textContent = "Receipts";
    qs("#businessStatTitle").textContent = "Received Payments";
    body.innerHTML = `<table><thead><tr><th>Date</th><th>Name</th><th>Invoice</th><th>Source</th><th>Received</th></tr></thead><tbody>${rows.length ? rows.map((row) => `<tr><td>${row.date || "-"}</td><td>${row.name || "-"}</td><td>${row.invoice || "-"}</td><td>${row.source}</td><td>${money(row.paid)}</td></tr>`).join("") : empty(5, "No received payments.")}</tbody></table>`;
  }
  if (type === "pending") {
    const manual = visibleRowsForUser(state.customers).filter((item) => !item.saleId && Number(item.pending || 0) > 0);
    const manual = visibleRowsForUser(state.customers).filter((item) => !item.saleId && !isPartsCustomerEntry(item) && Number(item.pending || 0) > 0);
    const rows = visibleRowsForUser(state.sales).filter((sale) => Number(sale.pending || 0) > 0).map((sale) => ({ id: sale.id, date: sale.date, name: sale.customer, mobile: sale.mobile, invoice: sale.invoice, bikeNo: sale.frameNo, source: "Sale", pending: sale.pending })).concat(manual.map((item) => ({ id: item.id, date: item.date, name: item.name, mobile: item.mobile, invoice: item.invoice, bikeNo: item.bikeNo, source: "Customer", pending: item.pending })));
    qs("#businessStatEyebrow").textContent = "Pending";
    qs("#businessStatTitle").textContent = "Pending Balance";
  }

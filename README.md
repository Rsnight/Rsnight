# JD TVS Business Dashboard

Responsive JD TVS business app with login, dashboard reports, admin employee setup, sales, RTO/insurance, customers, parts stock, PWA install support, and online JSON sync.

Pages:

- `login.html`
- `dashboard.html` / `daskbord.html`
- `admin.html`
- `sales.html`
- `rto-insurance.html`
- `customer.html`
- `parts.html`

Run locally:

```bash
node server.js
```

Mac desktop app launcher:

```text
Double-click JD TVS App.command
```

This starts the online sync server if needed and opens the app.

Open app:

```text
http://localhost:4174/login.html
```

Same data on mobile:

1. Start with `node server.js`.
2. Keep phone and computer on the same Wi-Fi.
3. Open `http://COMPUTER-IP:4174/login.html` on mobile.
4. Install from browser menu or the Install App button.

The shared data file is saved at `data/business-state.json`.

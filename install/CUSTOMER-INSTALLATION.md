# Saltum – Install on a Customer PC (Windows)

Use this guide to install Saltum on a shop or office computer for **daily billing** and **stock management**. Everything runs locally on that PC (no cloud required).

---

## What you need on the customer machine

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 20 LTS or newer | Runs the app |
| **MongoDB Community** | 7.x or 8.x | Local database (invoices, products, stock) |
| **This project folder** | — | Copy from USB / zip / git |

---

## Step 1 – Install Node.js

1. Download **Node.js 20 LTS** from https://nodejs.org/
2. Run the installer (keep default options).
3. Open **PowerShell** and check:

```powershell
node -v
npm -v
```

You should see Node `v20.x` or higher.

---

## Step 2 – Install MongoDB (local database)

1. Download **MongoDB Community Server** for Windows from https://www.mongodb.com/try/download/community
2. During setup, choose **Install MongoDB as a Service** (service name: `MongoDB`).
3. After install, open **Services** (`Win + R` → `services.msc`) and confirm **MongoDB** is **Running**.

> **Why local MongoDB?** The shop can bill and update stock even without internet. Data stays on their PC.

---

## Step 3 – Copy the project

Copy the full project folder to the customer PC, for example:

```
C:\Saltum\
```

Folder should contain `backend`, `frontend`, and `install`.

---

## Step 4 – Run the automatic installer

1. Right-click **Start** → **Terminal (Admin)** or open PowerShell.
2. Run:

```powershell
cd C:\Saltum
powershell -ExecutionPolicy Bypass -File .\install\install-customer.ps1
```

The script will:

- Install npm packages (backend + frontend)
- Create `backend\.env` from the example
- Initialize the database (first time only)
- Build the web app for production

**First login (change password after first login):**

| Field | Value |
|-------|--------|
| Store | `main` |
| Email | `admin@admin.com` |
| Password | `admin123` |

---

## Step 5 – Daily use (start the app)

Double-click:

```
install\start-saltum.bat
```

Or from PowerShell:

```powershell
cd C:\Saltum
.\install\start-saltum.bat
```

The browser opens at **http://localhost:8888**

Leave the black command window open while the shop is open. Closing it stops the app.

---

## Daily workflow for the customer

### Add / manage products

1. **Products** → Add New Product (name, SKU, price, min quantity).
2. **Inventory** → **Import CSV** for bulk stock, or **Adjust Stock** for daily stock-in.

**CSV columns:** `name, sku, quantity, price, cost, barcode, unit, minQuantity, category`

### Billing

1. **Customers** → add customer (once per client).
2. **Invoices** → Create → pick products on each line → Save.
3. Set invoice status to **Sent** (or record payment) → stock is deducted automatically for linked products.

### Check stock

- **Inventory** → low stock list and recent movements.
- **Dashboard** → low stock count.

---

## Optional – Desktop shortcut

After install, copy `install\start-saltum.bat` to the Desktop and rename it to **Start Saltum**.

---

## Backup (important)

Back up these regularly (weekly or daily):

1. **MongoDB data** – use [mongodump](https://www.mongodb.com/docs/database-tools/mongodump/):

```powershell
mongodump --db saltum --out C:\SaltumBackup\2026-06-18
```

2. **Uploaded files** – folder `backend\public\uploads` (if present).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Cannot connect to MongoDB” | Start **MongoDB** service in `services.msc` |
| Port 8888 already in use | Close other Saltum windows or change `PORT=8889` in `backend\.env` |
| Blank page after update | Run `install\install-customer.ps1` again to rebuild frontend |
| Forgot admin password | Contact your installer – password reset requires database access |

---

## Re-install on a new PC

1. Install Node.js + MongoDB on the new PC.
2. Copy project folder + restore MongoDB backup (`mongorestore`).
3. Run `install-customer.ps1` but **skip** fresh setup if you restored a backup (delete `.saltum-installed` only when doing a clean install).

---

## Network access (optional)

By default the app is only on **this PC** (`localhost`). To open from other PCs on the same shop LAN, set in `backend\.env`:

```
PUBLIC_SERVER_FILE="http://192.168.1.50:8888/"
```

(replace with the shop PC’s IP), rebuild frontend (`npm run build` in `frontend`), and allow port **8888** in Windows Firewall.

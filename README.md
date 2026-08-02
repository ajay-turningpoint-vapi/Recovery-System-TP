# Payment Collection Management System (Recovery TP)

A production-ready, full-stack **Payment Collection Management System** built with **Node.js, Express.js, Prisma ORM, MariaDB/MySQL (with SQLite fallback), MSSQL ERP Import Connector, and React + Vite**.

Designed specifically for **Salesmen & Collection Executives** to manage customer outstanding balances, invoice dues, daily follow-ups, collection entries, WhatsApp reminders, and ERP data synchronizations.

---

## 🚀 Quick Start Guide

### 1. Installation

Install dependencies for both **backend** and **frontend**:

```bash
# Install backend dependencies
cd backend
npm install

# Initialize Prisma Database & Seed Data
npx prisma db push
node prisma/seed.js

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Running Locally in Development Mode

Run the backend API server (Port 5001):

```bash
cd backend
npm run dev
```

In a second terminal window, start the React frontend dev server (Port 3000):

```bash
cd frontend
npm run dev
```

Open your browser at **http://localhost:3000**.

---

## 🔑 Demo Credentials

| Role | Username | Password | Salesman Code | Scope / Access |
|---|---|---|---|---|
| **Salesman 1** | `salesman1` | `salesman123` | `SM-001` | Scoped to Rajesh Kumar's customers & invoices |
| **Salesman 2** | `salesman2` | `salesman123` | `SM-002` | Scoped to Amit Sharma's customers & invoices |
| **Admin** | `admin` | `admin123` | *Global* | Access to all customers, MSSQL import, User management |

---

## 🗄 Database & MSSQL Import Configuration

### 1. Database Connection (`backend/.env`)

The backend uses Prisma. By default, it runs with a zero-config SQLite file `dev.db` for instant out-of-the-box demonstration.

To connect to a production **MariaDB / MySQL** server, update `backend/.env`:

```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/recovery_system_db"
```

In `backend/prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "mysql"`, then run:

```bash
npx prisma db push
```

### 2. MSSQL ERP Import Setup

The system connects to **Microsoft SQL Server (MSSQL)** to pull customer vouchers and invoice dues using a configurable SELECT query:

```sql
SELECT VOU_NO, VOUCHER_DATE, PARTY, ALIAS, ADDRESS, CITY, STATE, GSTIN, MOBILE, SALESMAN, ITEM_NAME, HSN, QTY, RATE, TAX, DISC, TOTAL_AMOUNT, DUE_DATE 
FROM VOUCHERS 
WHERE VOUCHER_DATE >= @startdate@ AND VOUCHER_DATE <= @enddate@
```

To configure MSSQL connection parameters:
1. Log in as **Admin** (`admin` / `admin123`).
2. Navigate to **MSSQL Data Import** in the sidebar.
3. Select **MSSQL Connection & SQL Query** tab to update host, port, database, credentials, and custom query.

---

## 📊 Modules & Core Workflow

1. **Dashboard:** 8 summary cards (Total Customers, Total Invoices, Total Outstanding, Overdue Amount, Due Today, Upcoming Due, Follow-ups Due Today, Pending) + Consolidated Customer List with search, quick filters, and sorting.
2. **My Customers:** Master directory of assigned customers, credit limits, credit days, and contact details.
3. **Customer Dashboard:** Dedicated overview per customer displaying invoice-wise outstanding, aging breakdown, full append-only follow-up history, and collection log.
4. **Invoice Outstanding:** Master ledger calculating Days Overdue (`Current Date - Due Date`), Overdue status labels (Not Due, Due Today, X Days Overdue), and line item breakdowns.
5. **My Daily Tasks:** Daily follow-up task manager with Today, Tomorrow, Overdue, This Week, and Pending filters + **Quick Action Follow-Up Modal**.
6. **Collection Entry:** Record payments (NEFT, RTGS, IMPS, UPI, Cheque, Cash) and automatically update invoice & customer outstanding balances.
7. **WhatsApp Module:** Predefined templates (Payment Reminder, Payment Due, Payment Commitment, Custom, Itemized Invoice Breakdown) with multi-invoice selection and direct WhatsApp Web link launch + audit logs.
8. **MSSQL Data Import:** Run ERP synchronization with `@startdate@` and `@enddate@` date range filters, duplicate invoice prevention, upsert logic, and import history logs.
9. **Reports:** Exportable (CSV / Excel / Print) reports for Customer Outstanding, Salesman Collection, Overdue Aging Buckets (0-30, 31-60, 61-90, 91-180, 180+ Days), and Follow-up activities.
10. **User Management:** Create Salesmen accounts and manage roles (`ADMIN`, `SALESMAN`).

---

## 🔌 API Endpoint Reference

### Authentication
- `POST /api/auth/login` - Authenticate user & get JWT token
- `GET  /api/auth/me` - Fetch authenticated user details

### Dashboard & Customers
- `GET /api/dashboard/summary` - Aggregate metrics
- `GET /api/dashboard/customers` - Consolidated customer list with search & sorting
- `GET /api/customers` - List assigned customers
- `GET /api/customers/:id` - Detailed Customer Dashboard & invoice breakdown

### Invoices & Follow-ups
- `GET  /api/invoices` - Master invoice outstanding list
- `GET  /api/invoices/:id` - Single invoice breakdown with items
- `POST /api/followups` - Create follow-up entry
- `GET  /api/followups` - List follow-up logs
- `GET  /api/followups/today` - Daily task action list
- `PUT  /api/followups/:id` - Quick update follow-up & schedule next task

### Collections & WhatsApp
- `POST /api/payments` - Record payment collection entry
- `GET  /api/payments` - Payment transaction history
- `POST /api/whatsapp/send` - Generate WhatsApp link & log action
- `GET  /api/whatsapp/logs` - Sent WhatsApp activity logs

### MSSQL Data Import & Reports
- `POST /api/import/mssql` - Execute MSSQL import pipeline
- `GET  /api/import/history` - View import history audit logs
- `GET  /api/reports/outstanding` - Customer outstanding report (+ CSV)
- `GET  /api/reports/overdue` - Overdue aging buckets report (+ CSV)
- `GET  /api/reports/collections` - Salesman recovery performance report (+ CSV)

---

## 🛠 Production Build Instructions

To build and run in production environment:

```bash
# Build React frontend
cd frontend
npm run build

# Start Express Backend server
cd ../backend
NODE_ENV=production npm start
```

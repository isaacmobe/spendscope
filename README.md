# SpendScope (MERN Personal Finance Dashboard)

SpendScope is a personal finance MVP() that helps users track **income and expenses**, view a **spending trend chart**, and set a **monthly budget** with a warning when spending exceeds the threshold.


## Features

### Core
- ✅ Create / Read / Update / Delete transactions
- ✅ Income vs Expense tracking
- ✅ Balance calculation (derived from totals)
- ✅ Monthly budget input + over-budget warning
- ✅ Spending trend chart (last 14 days of expenses)

### UX
- ✅ Category filter (list + chart follow the selection)
- ✅ Delete confirmation
- ✅ Form supports Add and Edit modes
- ✅ Submit button disables while saving
- ✅ Clear error messages from API → UI

---

## Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Axios (API calls)
- Chart.js + react-chartjs-2 (visualizations)

### Backend
- Node.js + Express
- MongoDB + Mongoose
- dotenv (environment variables)
- cors (local dev)
- nodemon (dev server reload)

---

## Project Structure

```txt
spendscope/
├── client/                         # React + Tailwind frontend (Vite)
│   ├── src/
│   │   ├── api/                    # Axios instance + API wrappers
│   │   ├── components/             # UI components (bento cards, chart, forms, list)
│   │   ├── context/                # Global state (Context Provider)
│   │   ├── utils/                  # Helpers (formatting)
│   │   ├── App.jsx                 # Main dashboard layout
│   │   └── main.jsx                # App entry point + Provider wrapper
│   └── vite.config.js              # Dev proxy: /api -> http://localhost:5000
│
└── server/                         # Express + Mongo backend
    ├── config/                     # DB connection logic
    ├── controllers/                # Request handlers (business logic)
    ├── middleware/                 # Error handling, validation helpers
    ├── models/                     # Mongoose schemas/models
    ├── routes/                     # API routing
    ├── index.js                    # Server entry point
    └── .env                        # Secrets (Mongo URI, PORT) - do not commit
````

---

## Data Model

### Transaction

A transaction is a document in the `transactions` collection.

Example:

```json
{
  "_id": "6567...",
  "title": "Fuel",
  "amount": 1500,
  "type": "expense",
  "category": "Transport",
  "date": "2026-01-14T08:25:00.000Z"
}
```

Fields:

* `title` (string) — name/description
* `amount` (number) — positive number
* `type` ("income" | "expense")
* `category` (string) — e.g. Transport, Food, Rent
* `date` (Date) — auto-set at creation

---

## API Endpoints

Base URL: `http://localhost:5000`

### Health check

* `GET /` → `"API running..."`

### Transactions

* `GET /api/transactions`
  Returns all transactions

* `POST /api/transactions`
  Creates a transaction
  Body:

  ```json
  { "title": "Fuel", "amount": 1500, "type": "expense", "category": "Transport" }
  ```

* `PUT /api/transactions/:id`
  Updates a transaction
  Body:

  ```json
  { "title": "Fuel (Updated)", "amount": 1600, "type": "expense", "category": "Transport" }
  ```

* `DELETE /api/transactions/:id`
  Deletes a transaction

---

## Setup Instructions

### 1) Prerequisites

* Node.js (LTS recommended)
* MongoDB Atlas account (free tier is fine)

### 2) Clone / open the project

Open the `spendscope` folder in VS Code.

### 3) Backend setup

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
```

Run backend:

```bash
npm run dev
```

Verify:

* open `http://localhost:5000/` → should show `API running...`

### 4) Frontend setup

```bash
cd ../client
npm install
npm run dev
```

Open:

* `http://localhost:5173`

---

## Dev Proxy Notes (important)

In development, Vite runs the frontend on `5173` and the backend on `5000`.

We use a Vite proxy so frontend code can call:

* `/api/transactions`

…and Vite automatically forwards it to:

* `http://localhost:5000/api/transactions`

This avoids CORS issues and keeps frontend code clean (no hardcoded URLs).

---

## How SpendScope Works (Architecture Summary)

### Backend (MVC-ish)

* **Routes**: define endpoints (URL + HTTP method)
* **Controllers**: implement business logic (create, update, delete, list)
* **Models**: Mongoose schema defines data shape + validation
* **Config**: DB connection logic separated from server entry point

### Frontend

* **Context Provider** fetches transactions once and stores them globally
* UI components subscribe to context:

  * totals (income/expense/balance) are **derived** from transactions
  * chart aggregates expenses by day (last 14 days)
  * filter produces `filteredItems` without mutating original state
* Form supports Add/Edit by switching based on `editingTransaction`

---

## Future Improvements (Nice follow-ups)

* Authentication (multi-user)
* Date range picker (monthly view, yearly view)
* Recurring transactions
* Export CSV/PDF
* More charts: category breakdown pie chart
* Server-side validation middleware for invalid ObjectIds
* Deploy (Render/Fly.io + Mongo Atlas) with production environment config

---

## Demo Data (quick)

Try adding:

* Income: Salary 50000 (category: Income)
* Expense: Rent 15000 (category: Housing)
* Expense: Fuel 1500 (category: Transport)
* Expense: Food 3000 (category: Food)

Then set budget to 12000 and watch the warning trigger.

---

---

## Running locally (updated setup)

1. `cd server && npm ci`, then copy `server/.env.example` to `server/.env` and fill it in
   (`MONGO_URI`, `JWT_SECRET` of 32+ random characters, `CLIENT_ORIGIN`). `.env` is gitignored: never commit it.
2. `npm run dev` in `server/` (API on port 5000).
3. `cd client && npm ci && npm run dev` (app on port 5173; `/api` is proxied to the server).
4. API tests: `cd server && npm test`. Database tests need a MongoDB: set `MONGO_TEST_URI` to a throwaway
   database, or leave it unset and the in-memory server downloads a `mongod` (needs internet access).

### What the app does now

- Log in or create an account (passwords hashed with scrypt, session in an httpOnly cookie). Every user only sees their own data.
- Enter earnings in the centre hexagon. Six surrounding hexagons (Housing, Food, Transport, Bills, Lifestyle, Motorbike Fund) unlock and take your spending.
- Each month's earnings are split into needs, wants and savings (default 50/30/20, editable in Settings). Each area shows how much of its share is used.
- Set a motorbike goal (price, amount already saved, optional deadline) and see the projected month you can buy it.
- Amounts can be entered and shown in KES or USD. The exchange rate is set by you in Settings (the default is only a placeholder).
- A calm Three.js background reacts when you add earnings, spend or save. It respects "reduce motion", and is lighter on phones.
- Client logic tests: `cd client && npm test`.

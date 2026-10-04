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

## Features

- **Hexagon console.** Enter earnings in the core; six hexagon areas (Housing, Food, Transport, Bills, Lifestyle, Motorbike Fund) take your spending. Light and dark themes, a honeycomb background, and a calm Three.js scene that reacts to what you do. Fully responsive.
- **Savings-first plan.** Earnings are split into needs / wants / savings (default 50/30/20). Savings are set aside first.
- **Goal projection** with compound growth, deadline gap, "what if I save 5% more", and a safety-net target.
- **Safe to spend today**, a **spending-pace chart**, month-by-month **history**, and rule-based advice.
- **Quick add** (Ctrl/Cmd+K): type `food 450 lunch`, `rent 30k`, `+85000 salary`.
- **Undo** for deletes, goal **milestone** celebrations, **CSV export**, **KES / USD** with a typed or live exchange rate.
- **Accounts:** scrypt password hashing, httpOnly cookie sessions, recovery code for forgotten passwords, change password, delete account.
- **Guided tutorial** (question-mark button, or press `?`).
- **Installable** on phones (web app manifest and icons).

## Run it locally

Requirements: Node 20.19+ (or 22.12+) and a MongoDB (Atlas free cluster is fine).

1. `cd server && npm ci`, then copy `server/.env.example` to `server/.env` and fill in `MONGO_URI` and `JWT_SECRET`
   (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` makes a good secret). `.env` is gitignored.
2. `npm run dev` in `server/` (API on port 5000).
3. `cd client && npm ci && npm run dev` (app on **http://localhost:5290**; `/api` is proxied to the server).
   Change the ports in `client/.env` (see `client/.env.example`).
4. Tests: `npm test` in `client/` (engine and helpers) and in `server/` (API; database tests need `MONGO_TEST_URI`, see below).

### Forgot your password?

Passwords are stored as one-way hashes, so they cannot be read back. Options, in order:

1. Use **Forgot password** on the login screen with the **recovery code** shown when you signed up.
2. If you have no code (accounts made before recovery codes existed), run this on the machine that runs the server:
   `cd server && npm run reset-password` (lists accounts), then `npm run reset-password -- you@example.com` (sets a new password and prints a new recovery code). It needs your `server/.env`, so only the server owner can use it.
3. Check your browser's saved passwords (Chrome: `chrome://settings/passwords`, search "localhost").

## Configuration reference

| Where | Variable | Purpose |
| --- | --- | --- |
| `server/.env` | `MONGO_URI` | MongoDB connection string (use a user limited to `readWrite` on one database) |
| `server/.env` | `JWT_SECRET` | 32+ random characters; signs login cookies |
| `server/.env` | `PORT` | API port (default 5000) |
| `server/.env` | `CLIENT_ORIGIN` | Browser origin allowed by CORS (default `http://localhost:5290`) |
| `server/.env` | `TRUST_PROXY` | Set to `1` behind a reverse proxy (Vercel sets it automatically) |
| `server/.env` | `DEFAULT_*` | Starting settings for new accounts (currency, rate, split, growth, safety net) |
| `client/.env` | `CLIENT_PORT`, `API_TARGET` | Dev server port and API proxy target |
| `client/.env` | `VITE_FX_URL` | Alternative live-rate feed returning `{ rates: { KES } }` |
| `client/src/config/plan.js` | | Every planning rule (levels, thresholds, presets) |
| `client/src/config/tour.js` | | The tutorial text |

## How the money logic works

All of it lives in `client/src/lib/finance.js` (pure functions covered by tests); every threshold is in `client/src/config/plan.js`.

1. **Earnings** are the viewed month's income entries, converted to the display currency with your rate.
2. **Pay yourself first.** Earnings are split into needs / wants / savings pools (default 50/30/20, from Warren and Tyagi, *All Your Worth*). "Spendable after saving" = earnings - savings pool.
3. **Areas.** Needs are shared Housing 40%, Food 25%, Transport 15%, Bills 20%; Lifestyle is all of wants; the Motorbike Fund is all of savings (weights in `lib/areas.js`).
4. **Goal projection.** Months to the goal solve `saved*(1+r)^n + P*((1+r)^n - 1)/r = price` (P = monthly savings pool, r = yearly growth / 12; plain division when growth is 0). A deadline gives the required monthly amount, the gap, and the savings percentage needed.
5. **Safe to spend today** = (needs pool + wants pool - spent so far) / days left, today included.
6. **Spending pace** = running total of needs + wants (bills on their due day, savings excluded) against the living budget.
7. **Safety net** = months (default 3) x the planned needs pool.
8. **Advice** is rule-based: overspend, month-end pace for food/transport/lifestyle, bills due within 7 days, saving half of an earnings increase, moving unspent money to savings in the last 7 days.

## Deploy to Vercel

The repo is set up so one Vercel project serves both the React app (static) and the API (one serverless function, `api/index.js`, reusing the Express app). Because both live on the same domain, login cookies work with no CORS setup. `vercel.json` holds the build settings.

1. **Project settings** (Vercel dashboard > your project > Settings > General): Root Directory empty, Framework Preset "Other". Leave the Build/Install/Output overrides off; `vercel.json` provides them.
2. **Environment Variables** (Settings > Environment Variables), for Production and Preview: `MONGO_URI` and `JWT_SECRET` (a fresh 48-byte random value, different from your local one). Nothing else is required.
3. **MongoDB Atlas > Network Access:** Vercel functions use changing IP addresses, so allow `0.0.0.0/0`. Keep it safe by using a database user limited to `readWrite` on the `spendscope` database with a long random password (never an admin user).
4. **Function region** (Settings > Functions): choose the region closest to your Atlas cluster (Ireland: Dublin) to cut latency.
5. **Deploy.** Pushing a branch creates a Preview deployment. Merging to `main` creates the Production deployment. Environment variables only apply to new deployments, so after adding or changing them use Deployments > the latest > Redeploy.
6. **Check:** `https://<your-domain>/api/auth/me` should answer `401` JSON (that means the function and database are up); the site itself should load the login screen.
7. **On your phone:** open the production URL and use "Add to Home Screen".

Notes: Preview URLs may require a Vercel login, depending on your project's Deployment Protection setting. Login sessions last 7 days, and changing a password does not end other existing sessions before they expire.

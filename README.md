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
- **Receive, plan, spend.** Enter money you just received. The system suggests where every shilling goes (bills first, then savings for your goals, then living money); you change any amount and watch what it means for your goals before you confirm. Unspent money stays in its envelope.
- **Several goals**, funded in the order you choose, after a starter emergency fund. Compound growth, deadline checks and "what if I save 5% more" for each.
- **Bills in their own currency**, charged to the Bills envelope on their due day.
- **Envelope hexagons** for Housing, Food, Transport, Bills, Lifestyle and Goals; light and dark themes and a calm 3D hexagon wall. Fully responsive.
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

### Optional: encrypt your local `.env` with dotenvx

`npm run dev` in `server/` runs through [dotenvx](https://dotenvx.com) (the open-source CLI, free), which loads a plain `.env` exactly as before. To encrypt it at rest on your machine: `npm run env:encrypt` in `server/`. That rewrites `.env` with encrypted values and creates `.env.keys` (the private key; both stay gitignored, never commit or share the key). `npm run dev` and `npm run reset-password` decrypt at run time. Use `npx dotenvx run -- node index.js` instead of `npm start` if you start the server directly with an encrypted file. Undo with `npm run env:decrypt`. Vercel keeps using its own environment variables. dotenvx Ops (paid, managed private keys and syncing across machines) is optional and not required.

### MongoDB says "could not connect" or "IP not whitelisted"?

In Atlas open **Network Access > Add IP Address** and add your current IP (or `0.0.0.0/0` while testing). The server no longer stops when this happens: it keeps running, answers the app with a 503, and retries the connection every 5 seconds, so it recovers by itself once Atlas accepts you.

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

All of it lives in `client/src/lib/ledger.js` (pure functions covered by tests, with the compound-growth maths in `savingsMath.js`); every threshold is in `client/src/config/plan.js`.

**Envelopes.** Money you receive is "to assign". You plan it: each part is *allocated* to an envelope (Bills, Housing, Food, Transport, Lifestyle), to the starter emergency fund, or to a goal. An envelope's balance is what was allocated minus what you spent from it, and it carries forward. `To assign = all money received - everything allocated`.

**The suggested plan** for an amount `A` (you can change every line; "left to assign" must reach zero to confirm):

1. **Bills.** Top up the Bills envelope so it covers one month of bills `F` (each bill keeps its own currency and converts at your rate; bills are charged on their due day, starting once the Bills envelope is first funded).
2. **Savings** `S = clamp(monthTarget - alreadySavedThisMonth, 0, cap)`, where `monthTarget = max(minimum share x monthly income, tightest goal deadline)` and `cap = (A - bills) x 65%`, so at least 35% of the money left after bills stays for living (`minLivingShare` in `plan.js`). Pay yourself first (the idea behind 50/30/20, Warren and Tyagi, *All Your Worth*).
3. **Where savings go.** Starter emergency fund first (`starterMonths` x (bills + basic living costs); 1 by default, 0 to skip), then goals in priority order, each up to what it still needs.
4. **Living money** `A - bills - S` is divided between needs and wants in the Needs : Wants ratio from Settings (50:30 by default). Needs are shared Housing 50%, Food 31.25%, Transport 18.75%; Lifestyle gets the wants part.

**The check** (recalculated as you edit): savings pace `= your savings lines x (monthly income / A)`, then savings flow in priority order. For a goal, months solve `P*((1+r)^n - 1)/r = remaining + starter fund missing + goals ahead of it` (r = yearly growth / 12; plain division when growth is 0). It compares that with the deadline (`requiredMonthly`), shows how much sooner 5% more of your income would bring it, how long the emergency fund takes to fill, how many months of bills are covered, and about how much you can spend per day for the rest of the month.

**Deleting a goal** returns the money planned into it to "to assign".

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

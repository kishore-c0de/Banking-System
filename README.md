# Indian "Come Tomorrow" Bank — Banking System (React + Express + MySQL)

A full-stack banking application: user accounts, multiple bank accounts per
user, deposits, withdrawals, account-to-account transfers, and transaction
history — with JWT authentication and row-locked transactions to prevent
race conditions.

## Stack

- **Frontend:** React 18 + Vite + React Router + Axios
- **Backend:** Express.js + JWT auth + bcrypt
- **Database:** MySQL (via `mysql2`)

## Project structure

```
banking-app/
  backend/
    config/        db.js, schema.sql, initDb.js
    controllers/    auth, accounts, transactions
    middleware/     JWT auth, error handler
    routes/
    utils/          account number / transaction reference generators
    server.js
  frontend/
    src/
      api/          axios client
      context/      AuthContext
      components/   Layout, ProtectedRoute
      pages/        Login, Register, Dashboard, Transfer, History
```

## 1. Database setup

Works against a local MySQL server or a managed MySQL instance (e.g. Aiven).

```bash
cd backend
cp .env.example .env
# edit .env — see variables below
npm install
npm run init-db     # creates tables (from schema.sql) inside the database named by DB_NAME
```

`schema.sql` only contains `CREATE TABLE` / `CREATE INDEX` statements — the
target database (`DB_NAME`) must already exist before running `init-db`.
It can also be run manually (`mysql -u <user> -p <db_name> < config/schema.sql`)
if you prefer.

### Backend environment variables

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (Render sets this automatically) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL connection details |
| `DB_SSL_CA` | Optional. PEM CA certificate as a single line with literal `\n` newlines, required for providers like Aiven that enforce TLS |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | JWT signing secret and token lifetime |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins |

## 2. Backend

```bash
cd backend
npm install
npm run dev          # nodemon, http://localhost:5000
# or: npm start
```

Health check: `GET http://localhost:5000/api/health`

### API overview

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | – | Create user + default savings account |
| POST | /api/auth/login | – | Returns JWT + user |
| GET | /api/auth/me | JWT | Current user profile |
| GET | /api/accounts | JWT | List my accounts |
| POST | /api/accounts | JWT | Open a new account (`accountType: savings|checking`) |
| GET | /api/accounts/:id | JWT | Get one account (must be owner or admin) |
| GET | /api/accounts/lookup/:accountNumber | JWT | Look up a recipient by account number (name + type only, no balance) — used to verify a transfer recipient before sending |
| POST | /api/transactions/deposit | JWT | `{ accountId, amount, description }` |
| POST | /api/transactions/withdraw | JWT | `{ accountId, amount, description }` |
| POST | /api/transactions/transfer | JWT | `{ fromAccountId, toAccountNumber, amount, description }` |
| GET | /api/transactions/account/:accountId | JWT | Paginated history (`?limit=&offset=`) |

All money amounts are numbers (USD). JWT goes in `Authorization: Bearer <token>`.

## 3. Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:5000/api
npm install
npm run dev             # http://localhost:5173
```

Register a user (gets a free savings account), log in, and use the
dashboard to deposit/withdraw, open extra accounts, transfer to another
user's account number (verify the recipient's name before sending), and
view transaction history.

Two hardcoded demo logins are available for quick testing (see
`backend/controllers/authController.js`): `admin@bank.com` / `admin123`
and `test@bank.com` / `test1234`. Remove these before any real deployment.

## Deploying

- **Backend:** deploy `backend/` as a Node web service (e.g. Render). Bind
  to `process.env.PORT` on `0.0.0.0` (already done in `server.js`), set the
  environment variables above, and set `CORS_ORIGIN` to your deployed
  frontend's URL.
- **Database:** any managed MySQL works (e.g. Aiven). Create the database
  first, point `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` at it,
  set `DB_SSL_CA` if the provider requires TLS, then run `npm run init-db`
  once against it.
- **Frontend:** deploy `frontend/` as a static site (`npm run build` →
  serve `dist/`). Set `VITE_API_URL` at build time to the live backend's
  `/api` URL.

## Security notes / things to harden before production

- Passwords are hashed with bcrypt; JWTs are short-lived (`JWT_EXPIRES_IN`).
- Transfers and deposits/withdrawals run inside MySQL transactions with
  `SELECT ... FOR UPDATE` row locks to avoid balance race conditions.
- This is a learning/demo-grade app: add rate limiting, input validation
  hardening (e.g. `express-validator` rules per route), HTTPS, refresh
  tokens, and audit logging before using it with real money.
- Remove the hardcoded demo logins in `authController.js` before any real
  deployment — they bypass the database entirely and are visible in source.

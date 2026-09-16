# Nimbus Bank — Banking System (React + Express + MySQL)

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

Make sure MySQL is running locally, then:

```bash
cd backend
cp .env.example .env
# edit .env and set DB_USER / DB_PASSWORD / JWT_SECRET
npm install
npm run init-db     # creates the banking_app database + tables from schema.sql
```

`schema.sql` can also be run manually (`mysql -u root -p < config/schema.sql`)
if you prefer.

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
| GET | /api/accounts/:id | JWT | Get one account |
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
account number, and view transaction history.

## Security notes / things to harden before production

- Passwords are hashed with bcrypt; JWTs are short-lived (`JWT_EXPIRES_IN`).
- Transfers and deposits/withdrawals run inside MySQL transactions with
  `SELECT ... FOR UPDATE` row locks to avoid balance race conditions.
- This is a learning/demo-grade app: add rate limiting, input validation
  hardening (e.g. `express-validator` rules per route), HTTPS, refresh
  tokens, and audit logging before using it with real money.

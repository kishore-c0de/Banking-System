const pool = require('../config/db');
const { generateTransactionReference } = require('../utils/generateIds');

// Helper: load an account row and confirm the requester owns it (or is admin)
async function loadOwnedAccount(conn, accountId, user, forUpdate = false) {
  const query = `SELECT * FROM accounts WHERE id = ?${forUpdate ? ' FOR UPDATE' : ''}`;
  const [rows] = await conn.query(query, [accountId]);
  if (rows.length === 0) {
    const err = new Error('Account not found');
    err.status = 404;
    throw err;
  }
  const account = rows[0];
  if (account.user_id !== user.id && user.role !== 'admin') {
    const err = new Error('Not authorized to use this account');
    err.status = 403;
    throw err;
  }
  if (account.status !== 'active') {
    const err = new Error(`Account is ${account.status} and cannot transact`);
    err.status = 400;
    throw err;
  }
  return account;
}

function validAmount(amount) {
  return typeof amount === 'number' && isFinite(amount) && amount > 0;
}

async function deposit(req, res, next) {
  const { accountId, amount, description } = req.body;
  if (!accountId || !validAmount(amount)) {
    return res.status(400).json({ message: 'accountId and a positive amount are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const account = await loadOwnedAccount(conn, accountId, req.user, true);
    const newBalance = Number(account.balance) + Number(amount);
    const reference = generateTransactionReference();

    await conn.query('UPDATE accounts SET balance = ? WHERE id = ?', [newBalance, accountId]);
    const [txResult] = await conn.query(
      `INSERT INTO transactions (account_id, type, amount, balance_after, description, reference)
       VALUES (?, 'deposit', ?, ?, ?, ?)`,
      [accountId, amount, newBalance, description || 'Deposit', reference]
    );

    await conn.commit();
    res.status(201).json({ transactionId: txResult.insertId, reference, newBalance });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function withdraw(req, res, next) {
  const { accountId, amount, description } = req.body;
  if (!accountId || !validAmount(amount)) {
    return res.status(400).json({ message: 'accountId and a positive amount are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const account = await loadOwnedAccount(conn, accountId, req.user, true);
    if (Number(account.balance) < Number(amount)) {
      const err = new Error('Insufficient funds');
      err.status = 400;
      throw err;
    }

    const newBalance = Number(account.balance) - Number(amount);
    const reference = generateTransactionReference();

    await conn.query('UPDATE accounts SET balance = ? WHERE id = ?', [newBalance, accountId]);
    const [txResult] = await conn.query(
      `INSERT INTO transactions (account_id, type, amount, balance_after, description, reference)
       VALUES (?, 'withdrawal', ?, ?, ?, ?)`,
      [accountId, amount, newBalance, description || 'Withdrawal', reference]
    );

    await conn.commit();
    res.status(201).json({ transactionId: txResult.insertId, reference, newBalance });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function transfer(req, res, next) {
  const { fromAccountId, toAccountNumber, amount, description } = req.body;
  if (!fromAccountId || !toAccountNumber || !validAmount(amount)) {
    return res.status(400).json({
      message: 'fromAccountId, toAccountNumber and a positive amount are required',
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const fromAccount = await loadOwnedAccount(conn, fromAccountId, req.user, true);

    const [toRows] = await conn.query(
      'SELECT * FROM accounts WHERE account_number = ? FOR UPDATE',
      [toAccountNumber]
    );
    if (toRows.length === 0) {
      const err = new Error('Destination account not found');
      err.status = 404;
      throw err;
    }
    const toAccount = toRows[0];

    if (toAccount.id === fromAccount.id) {
      const err = new Error('Cannot transfer to the same account');
      err.status = 400;
      throw err;
    }
    if (toAccount.status !== 'active') {
      const err = new Error('Destination account cannot receive funds');
      err.status = 400;
      throw err;
    }
    if (Number(fromAccount.balance) < Number(amount)) {
      const err = new Error('Insufficient funds');
      err.status = 400;
      throw err;
    }

    const fromNewBalance = Number(fromAccount.balance) - Number(amount);
    const toNewBalance = Number(toAccount.balance) + Number(amount);
    const reference = generateTransactionReference();
    const note = description || `Transfer to ${toAccount.account_number}`;
    const noteIn = description || `Transfer from ${fromAccount.account_number}`;

    await conn.query('UPDATE accounts SET balance = ? WHERE id = ?', [fromNewBalance, fromAccount.id]);
    await conn.query('UPDATE accounts SET balance = ? WHERE id = ?', [toNewBalance, toAccount.id]);

    await conn.query(
      `INSERT INTO transactions (account_id, type, amount, balance_after, related_account_id, description, reference)
       VALUES (?, 'transfer_out', ?, ?, ?, ?, ?)`,
      [fromAccount.id, amount, fromNewBalance, toAccount.id, note, reference]
    );
    await conn.query(
      `INSERT INTO transactions (account_id, type, amount, balance_after, related_account_id, description, reference)
       VALUES (?, 'transfer_in', ?, ?, ?, ?, ?)`,
      [toAccount.id, amount, toNewBalance, fromAccount.id, noteIn, reference]
    );

    await conn.commit();
    res.status(201).json({ reference, newBalance: fromNewBalance });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// Paginated transaction history for one account
async function history(req, res, next) {
  const accountId = req.params.accountId;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  const conn = await pool.getConnection();
  try {
    await loadOwnedAccount(conn, accountId, req.user, false);

    const [rows] = await conn.query(
      `SELECT t.*, a.account_number AS related_account_number
       FROM transactions t
       LEFT JOIN accounts a ON a.id = t.related_account_id
       WHERE t.account_id = ?
       ORDER BY t.created_at DESC, t.id DESC
       LIMIT ? OFFSET ?`,
      [accountId, limit, offset]
    );
    const [[{ total }]] = await conn.query(
      'SELECT COUNT(*) AS total FROM transactions WHERE account_id = ?',
      [accountId]
    );

    res.json({ transactions: rows, total, limit, offset });
  } catch (err) {
    next(err);
  } finally {
    conn.release();
  }
}

module.exports = { deposit, withdraw, transfer, history };

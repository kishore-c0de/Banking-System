const pool = require('../config/db');
const { generateAccountNumber } = require('../utils/generateIds');

// List all accounts belonging to the logged-in user
async function listMyAccounts(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, account_number, account_type, balance, status, created_at FROM accounts WHERE user_id = ? ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Open a new account for the logged-in user
async function openAccount(req, res, next) {
  const { accountType } = req.body;
  const type = accountType === 'checking' ? 'checking' : 'savings';

  try {
    let accountNumber = generateAccountNumber();
    for (let attempts = 0; attempts < 5; attempts++) {
      const [dupe] = await pool.query('SELECT id FROM accounts WHERE account_number = ?', [accountNumber]);
      if (dupe.length === 0) break;
      accountNumber = generateAccountNumber();
    }

    const [result] = await pool.query(
      'INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, 0)',
      [req.user.id, accountNumber, type]
    );

    res.status(201).json({
      id: result.insertId,
      account_number: accountNumber,
      account_type: type,
      balance: 0,
      status: 'active',
    });
  } catch (err) {
    next(err);
  }
}

// Fetch a single account (must belong to the user, unless admin)
async function getAccount(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM accounts WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Account not found' });

    const account = rows[0];
    if (account.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this account' });
    }
    res.json(account);
  } catch (err) {
    next(err);
  }
}

// Look up a recipient account by account number, for transfer confirmation.
// Returns only non-sensitive info (no balance).
async function lookupByAccountNumber(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT accounts.account_number, accounts.account_type, accounts.status, users.full_name
       FROM accounts JOIN users ON users.id = accounts.user_id
       WHERE accounts.account_number = ?`,
      [req.params.accountNumber]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Account not found' });

    const account = rows[0];
    if (account.status !== 'active') {
      return res.status(400).json({ message: 'This account is not active' });
    }
    res.json({
      accountNumber: account.account_number,
      accountType: account.account_type,
      ownerName: account.full_name,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyAccounts, openAccount, getAccount, lookupByAccountNumber };

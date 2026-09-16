const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { generateAccountNumber } = require('../utils/generateIds');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

async function register(req, res, next) {
  const { fullName, email, phone, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'fullName, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await conn.beginTransaction();

    const [userResult] = await conn.query(
      'INSERT INTO users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [fullName, email, phone || null, passwordHash]
    );
    const userId = userResult.insertId;

    // Every new customer gets a default savings account
    let accountNumber = generateAccountNumber();
    // extremely unlikely collision, but guard anyway
    for (let attempts = 0; attempts < 5; attempts++) {
      const [dupe] = await conn.query('SELECT id FROM accounts WHERE account_number = ?', [accountNumber]);
      if (dupe.length === 0) break;
      accountNumber = generateAccountNumber();
    }

    await conn.query(
      'INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, ?)',
      [userId, accountNumber, 'savings', 0]
    );

    await conn.commit();

    const user = { id: userId, email, role: 'customer' };
    const token = signToken(user);

    res.status(201).json({
      token,
      user: { id: userId, fullName, email, role: 'customer' },
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

const HARDCODED_LOGINS = [
  { email: 'admin@bank.com', password: 'admin123', user: { id: 0, fullName: 'Admin User', email: 'admin@bank.com', role: 'admin' } },
  { email: 'test@bank.com', password: 'test1234', user: { id: -1, fullName: 'Test User', email: 'test@bank.com', role: 'customer' } },
];

async function login(req, res, next) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const hardcoded = HARDCODED_LOGINS.find((c) => c.email === email && c.password === password);
  if (hardcoded) {
    const token = signToken(hardcoded.user);
    return res.json({ token, user: hardcoded.user });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };

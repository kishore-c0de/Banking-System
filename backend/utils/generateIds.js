const crypto = require('crypto');

// 10-digit numeric account number, prefixed to look bank-like
function generateAccountNumber() {
  const random = crypto.randomInt(0, 1_000_000_000).toString().padStart(9, '0');
  return `4${random}`; // 10 digits total, starts with 4
}

// Short unique transaction reference, e.g. TXN-8F3K9QZP
function generateTransactionReference() {
  const random = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `TXN-${random}`;
}

module.exports = { generateAccountNumber, generateTransactionReference };

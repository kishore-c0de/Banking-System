import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import client from '../api/client';

export default function Transfer() {
  const [accounts, setAccounts] = useState([]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [recipient, setRecipient] = useState(null);
  const [recipientError, setRecipientError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    client.get('/accounts').then((res) => {
      setAccounts(res.data);
      if (res.data.length > 0) setFromAccountId(res.data[0].id);
    });
  }, []);

  function handleAccountNumberChange(value) {
    setToAccountNumber(value);
    setRecipient(null);
    setRecipientError('');
  }

  async function handleLookup() {
    const trimmed = toAccountNumber.trim();
    if (!trimmed) return;
    setLookingUp(true);
    setRecipient(null);
    setRecipientError('');
    try {
      const res = await client.get(`/accounts/lookup/${encodeURIComponent(trimmed)}`);
      setRecipient(res.data);
    } catch (err) {
      setRecipientError(err.response?.data?.message || 'Could not find that account');
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);

    if (!fromAccountId || !toAccountNumber || !amount || Number(amount) <= 0) {
      setMessage({ type: 'error', text: 'Fill in all fields with a valid amount.' });
      return;
    }
    if (!recipient || recipient.accountNumber !== toAccountNumber.trim()) {
      setMessage({ type: 'error', text: 'Please verify the recipient account before sending.' });
      return;
    }

    setBusy(true);
    try {
      const res = await client.post('/transactions/transfer', {
        fromAccountId: Number(fromAccountId),
        toAccountNumber: toAccountNumber.trim(),
        amount: Number(amount),
        description: note || undefined,
      });
      setMessage({ type: 'success', text: `Transfer complete. Reference ${res.data.reference}.` });
      setAmount('');
      setToAccountNumber('');
      setNote('');
      setRecipient(null);
      client.get('/accounts').then((r) => setAccounts(r.data));
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Transfer failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Transfer Money">
      <div className="card" style={{ maxWidth: 460 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>From account</label>
            <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)}>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_type} · {acc.account_number} — ${Number(acc.balance).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Recipient account number</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={toAccountNumber}
                onChange={(e) => handleAccountNumberChange(e.target.value)}
                placeholder="e.g. 4123456789"
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn"
                onClick={handleLookup}
                disabled={!toAccountNumber.trim() || lookingUp}
              >
                {lookingUp ? 'Checking...' : 'Verify'}
              </button>
            </div>
            {recipient && (
              <div className="success-text" style={{ marginTop: 6 }}>
                Sending to {recipient.ownerName} ({recipient.accountType})
              </div>
            )}
            {recipientError && (
              <div className="error-text" style={{ marginTop: 6 }}>
                {recipientError}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Amount (USD)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {message && (
            <div className={message.type === 'error' ? 'error-text' : 'success-text'}>{message.text}</div>
          )}
          <button
            className="btn"
            type="submit"
            disabled={busy || !recipient || recipient.accountNumber !== toAccountNumber.trim()}
            style={{ width: '100%', marginTop: 8 }}
          >
            {busy ? 'Sending...' : 'Send transfer'}
          </button>
        </form>
      </div>
    </Layout>
  );
}

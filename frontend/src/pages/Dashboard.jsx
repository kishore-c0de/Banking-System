import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import client from '../api/client';

const formatMoney = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [mode, setMode] = useState('deposit'); // 'deposit' | 'withdraw'
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState(null); // { type, text }
  const [busy, setBusy] = useState(false);

  async function loadAccounts() {
    setLoading(true);
    try {
      const res = await client.get('/accounts');
      setAccounts(res.data);
      if (res.data.length > 0 && !selectedAccount) {
        setSelectedAccount(res.data[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpenAccount() {
    const type = window.confirm('Open a Checking account? (Cancel = Savings)') ? 'checking' : 'savings';
    await client.post('/accounts', { accountType: type });
    loadAccounts();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (!selectedAccount || !amount || Number(amount) <= 0) {
      setMessage({ type: 'error', text: 'Choose an account and a valid amount.' });
      return;
    }
    setBusy(true);
    try {
      await client.post(`/transactions/${mode}`, {
        accountId: selectedAccount,
        amount: Number(amount),
        description: note || undefined,
      });
      setMessage({ type: 'success', text: `${mode === 'deposit' ? 'Deposit' : 'Withdrawal'} successful.` });
      setAmount('');
      setNote('');
      loadAccounts();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Transaction failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Dashboard">
      {loading ? (
        <div className="empty-state">Loading accounts...</div>
      ) : (
        <>
          <div className="grid grid-2" style={{ marginBottom: 24 }}>
            {accounts.map((acc) => (
              <div className="account-card" key={acc.id}>
                <span className="type-badge">{acc.account_type}</span>
                <div className="balance">{formatMoney(acc.balance)}</div>
                <div className="acct-number">Account · {acc.account_number}</div>
                <div className="status">● {acc.status}</div>
              </div>
            ))}
            <button
              className="card btn-ghost"
              style={{
                border: '1px dashed var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 120,
                color: 'var(--text-dim)',
                fontSize: '0.9rem',
              }}
              onClick={handleOpenAccount}
            >
              + Open a new account
            </button>
          </div>

          <div className="card" style={{ maxWidth: 440 }}>
            <div className="tabs">
              <div
                className={`tab${mode === 'deposit' ? ' active' : ''}`}
                onClick={() => setMode('deposit')}
              >
                Deposit
              </div>
              <div
                className={`tab${mode === 'withdraw' ? ' active' : ''}`}
                onClick={() => setMode('withdraw')}
              >
                Withdraw
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Account</label>
                <select value={selectedAccount || ''} onChange={(e) => setSelectedAccount(Number(e.target.value))}>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type} · {acc.account_number}
                    </option>
                  ))}
                </select>
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
                <div className={message.type === 'error' ? 'error-text' : 'success-text'}>
                  {message.text}
                </div>
              )}
              <button className="btn" type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
                {busy ? 'Processing...' : mode === 'deposit' ? 'Deposit funds' : 'Withdraw funds'}
              </button>
            </form>
          </div>
        </>
      )}
    </Layout>
  );
}

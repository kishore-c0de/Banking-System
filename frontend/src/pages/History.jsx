import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import client from '../api/client';

const formatMoney = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));

const TYPE_LABELS = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
};

export default function History() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client.get('/accounts').then((res) => {
      setAccounts(res.data);
      if (res.data.length > 0) setAccountId(res.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    client
      .get(`/transactions/account/${accountId}`, { params: { limit: 50 } })
      .then((res) => setTransactions(res.data.transactions))
      .finally(() => setLoading(false));
  }, [accountId]);

  const isCredit = (type) => type === 'deposit' || type === 'transfer_in';

  return (
    <Layout title="Transaction History">
      <div className="card">
        <div className="form-group" style={{ maxWidth: 340 }}>
          <label>Account</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.account_type} · {acc.account_number}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="empty-state">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">No transactions yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Balance after</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.created_at).toLocaleString()}</td>
                  <td>{TYPE_LABELS[tx.type] || tx.type}</td>
                  <td>{tx.description}</td>
                  <td>{tx.reference}</td>
                  <td className={isCredit(tx.type) ? 'amount-in' : 'amount-out'}>
                    {isCredit(tx.type) ? '+' : '-'}
                    {formatMoney(tx.amount)}
                  </td>
                  <td>{formatMoney(tx.balance_after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

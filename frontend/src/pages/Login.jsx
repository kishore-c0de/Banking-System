import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Welcome back</h1>
        <p className="sub">Log in to your Nimbus Bank account.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn" type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
            {busy ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="sub" style={{ marginTop: 18 }}>
          No account? <Link to="/register">Create one</Link>
        </p>

        <div className="sub" style={{ marginTop: 18, fontSize: '0.85em' }}>
          <p style={{ marginBottom: 4 }}>Demo accounts:</p>
          <p style={{ margin: 0 }}>admin@bank.com / admin123</p>
          <p style={{ margin: 0 }}>test@bank.com / test1234</p>
        </div>
      </div>
    </div>
  );
}

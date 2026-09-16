import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="dot" />
          Nimbus Bank
        </div>
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Dashboard
        </NavLink>
        <NavLink to="/transfer" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Transfer Money
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Transaction History
        </NavLink>
        <div style={{ marginTop: 'auto' }}>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <div className="topbar">
          <h1>{title}</h1>
          <div className="user-chip">{user?.fullName || user?.email}</div>
        </div>
        {children}
      </main>
    </div>
  );
}

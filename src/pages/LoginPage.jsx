import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState([]);

  useEffect(() => {
    api.getDemoAccounts().then(setDemoAccounts).catch(() => {});
  }, []);

  const submit = async (e, creds) => {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(creds?.email ?? email, creds?.password ?? password);
      const fallback = user?.role === 'admin' ? '/admin' : '/';
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container auth-page">
      <h1 className="page-title">Log in</h1>
      <p className="muted">Welcome back to Signal &amp; Noise.</p>

      <form onSubmit={submit} className="form">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>

      <p className="muted small">
        Not a member yet? <Link to="/signup" state={location.state}>Create an account</Link>
      </p>

      {demoAccounts.length > 0 && (
        <div className="demo-box">
          <p className="demo-title">Demo accounts (password: <code>demo</code>)</p>
          {demoAccounts.map((a) => (
            <button
              key={a.email}
              type="button"
              className="demo-account"
              disabled={busy}
              onClick={() => submit(null, { email: a.email, password: 'demo' })}
            >
              <span>
                {a.firstName} {a.lastName}
                {a.role === 'admin' ? <span className="admin-flag">Admin</span> : <span className="demo-plan">{a.planName || 'No plan'}</span>}
              </span>
              <code>{a.email}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

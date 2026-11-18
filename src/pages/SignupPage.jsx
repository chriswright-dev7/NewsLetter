import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import PlanPicker from '../components/PlanPicker';

export default function SignupPage() {
  const { user, plans, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = params.get('from') || location.state?.from || '/';

  const initialPlan = plans.find((p) => String(p.id) === params.get('plan'))?.id ?? plans[0]?.id ?? '';
  const [planId, setPlanId] = useState(initialPlan);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={params.get('plan') ? `/account?plan=${params.get('plan')}` : '/account'} replace />;

  const onField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signup({ ...form, planId: planId === '' ? null : planId });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container signup-page">
      <h1 className="page-title">Become a member</h1>
      <p className="muted">Pick a plan, then create your account. You can change plans any time.</p>

      <form onSubmit={submit}>
        <h2 className="step-title">1. Choose a plan</h2>
        <PlanPicker plans={plans} value={planId} onChange={setPlanId} allowNone />

        <h2 className="step-title">2. Your details</h2>
        <div className="form form--grid">
          <label>
            First name
            <input name="firstName" value={form.firstName} onChange={onField} required autoComplete="given-name" />
          </label>
          <label>
            Last name
            <input name="lastName" value={form.lastName} onChange={onField} autoComplete="family-name" />
          </label>
          <label className="span-2">
            Email
            <input type="email" name="email" value={form.email} onChange={onField} required autoComplete="email" />
          </label>
          <label className="span-2">
            Password <span className="hint-inline">at least 8 characters</span>
            <input type="password" name="password" value={form.password} onChange={onField} required minLength={8} autoComplete="new-password" />
          </label>
        </div>

        {error && <p className="form-error">{error}</p>}
        <p className="prototype-note">Prototype: no payment is taken. Paid plans are activated straight away.</p>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>

      <p className="muted small signup-login">
        Already a member? <Link to="/login" state={{ from }}>Log in</Link>
      </p>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/AuthContext';
import PlanPicker from '../components/PlanPicker';
import { TierBadge, Toast, formatDate, useToast } from '../components/ui';

export default function AccountPage() {
  const { user, viewer, plans, refresh } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [toast, notify] = useToast();

  const sub = user?.subscription;
  const requested = plans.find((p) => String(p.id) === params.get('plan'))?.id;
  const [planId, setPlanId] = useState(requested ?? sub?.planId ?? plans[0]?.id ?? '');
  const [profile, setProfile] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState('');

  if (!user) return <Navigate to="/login" state={{ from: '/account' }} replace />;

  const run = async (key, fn, success) => {
    setBusy(key);
    try {
      await fn();
      await refresh();
      if (success) notify(success);
      return true;
    } catch (err) {
      notify(err.message, 'error');
      return false;
    } finally {
      setBusy('');
    }
  };

  const trialUsed = Boolean(user.trialUsedAt);
  const trialPlanIds = plans.filter((p) => Number(p.price) === 0 && p.id !== sub?.planId).map((p) => p.id);
  const unchanged = String(planId) === String(sub?.planId ?? '');
  const chosen = plans.find((p) => p.id === planId);

  const changePlan = async () => {
    const ok = await run('plan', () => api.account.setPlan(planId), `You're now on the ${chosen?.name} plan`);
    const from = params.get('from');
    if (ok && from) navigate(from);
  };

  return (
    <div className="container account">
      <h1 className="page-title">Your account</h1>

      <section className="account-card">
        <h2 className="section-title">Subscription</h2>
        {sub ? (
          <div className="sub-summary">
            <p>
              <strong>{sub.planName}</strong> <TierBadge level={sub.accessTier} name={sub.accessTierName} small />
            </p>
            <p className="muted small">
              Since {formatDate(sub.startedAt)}
              {sub.isTrial && sub.trialEndsAt && (
                <> · {sub.expired ? <strong className="warn">Trial ended {formatDate(sub.trialEndsAt)}</strong> : <>Trial ends {formatDate(sub.trialEndsAt)}</>}</>
              )}
            </p>
          </div>
        ) : (
          <p className="muted">No plan. You can read Public articles.</p>
        )}
        <p className="small">
          Current access: <TierBadge level={viewer?.tier ?? 0} name={viewer?.tierName ?? 'Public'} small />
          {viewer?.isAdmin && <span className="muted"> (admins can read everything)</span>}
        </p>

        <h3 className="sub-title">{sub ? 'Change plan' : 'Choose a plan'}</h3>
        <PlanPicker
          plans={plans}
          value={planId}
          onChange={setPlanId}
          currentPlanId={sub?.planId}
          disabledIds={trialUsed ? trialPlanIds : []}
        />
        {trialUsed && trialPlanIds.length > 0 && <p className="hint">You've already used your free trial.</p>}
        <p className="prototype-note">Prototype: no payment is taken. Plan changes apply immediately.</p>
        <div className="row-actions">
          <button type="button" className="btn" disabled={unchanged || !chosen || busy === 'plan'} onClick={changePlan}>
            {busy === 'plan' ? 'Saving…' : sub ? 'Switch plan' : 'Subscribe'}
          </button>
          {sub && (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy === 'cancel'}
              onClick={() =>
                window.confirm('Cancel your subscription? You will only be able to read Public articles.') &&
                run('cancel', () => api.account.setPlan(null), 'Subscription cancelled').then(() => setPlanId(plans[0]?.id ?? ''))
              }
            >
              Cancel subscription
            </button>
          )}
        </div>
      </section>

      <section className="account-card">
        <h2 className="section-title">Profile</h2>
        <form
          className="form form--grid"
          onSubmit={(e) => {
            e.preventDefault();
            run('profile', () => api.account.updateProfile(profile), 'Profile saved');
          }}
        >
          <label>
            First name
            <input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} required />
          </label>
          <label>
            Last name
            <input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
          </label>
          <label className="span-2">
            Email
            <input value={user.email} disabled />
          </label>
          <div className="span-2">
            <button className="btn" type="submit" disabled={busy === 'profile'}>Save profile</button>
          </div>
        </form>
      </section>

      <section className="account-card">
        <h2 className="section-title">Password</h2>
        <form
          className="form form--grid"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy('pw');
            try {
              await api.account.changePassword(pw);
              api.forgetSession();
              await refresh();
              navigate('/login', { replace: true });
            } catch (err) {
              notify(err.message, 'error');
            } finally {
              setBusy('');
            }
          }}
        >
          <label>
            Current password
            <input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required autoComplete="current-password" />
          </label>
          <label>
            New password
            <input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required minLength={8} autoComplete="new-password" />
          </label>
          <div className="span-2">
            <button className="btn" type="submit" disabled={busy === 'pw'}>Change password</button>
            <span className="hint"> You'll be logged out everywhere.</span>
          </div>
        </form>
      </section>

      <p className="small"><Link to="/">← Back to articles</Link></p>
      <Toast toast={toast} />
    </div>
  );
}

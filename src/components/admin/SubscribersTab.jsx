import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { TierBadge, formatDate } from '../ui';

export default function SubscribersTab({ notify }) {
  const { user: me, refresh } = useAuth();
  const [users, setUsers] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  const load = () =>
    Promise.all([api.admin.listUsers(), api.admin.listPlans()])
      .then(([u, p]) => {
        setUsers(u);
        setPlans(p.plans);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.message));

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? []).filter((u) => {
      if (planFilter === 'none' && u.planId) return false;
      if (planFilter === 'admins' && u.role !== 'admin') return false;
      if (!['all', 'none', 'admins'].includes(planFilter) && String(u.planId) !== planFilter) return false;
      return !q || [u.email, u.firstName, u.lastName].some((v) => v?.toLowerCase().includes(q));
    });
  }, [users, search, planFilter]);

  if (loadError) return <div className="state-msg"><h2>Couldn't load subscribers</h2><p className="muted">{loadError}</p></div>;
  if (!users) return <div className="state-msg">Loading subscribers…</div>;

  const update = async (u, changes, message) => {
    try {
      await api.admin.updateUser(u.id, changes);
      notify(message);
      await load();
      if (u.id === me.id) await refresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}? Their account and plan will be removed.`)) return;
    try {
      await api.admin.deleteUser(u.id);
      notify('Subscriber deleted');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const paying = users.filter((u) => u.subscription && !u.subscription.expired).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="page-title">Subscribers</h1>
          <p className="muted small">
            {users.length} accounts · {paying} with an active plan · {users.filter((u) => u.role === 'admin').length} admins
          </p>
        </div>
      </div>

      <div className="admin-filters">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          aria-label="Search subscribers"
        />
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} aria-label="Plan">
          <option value="all">All accounts</option>
          {plans.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          <option value="none">No plan</option>
          <option value="admins">Admins</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Subscriber</th>
              <th>Plan</th>
              <th>Access</th>
              <th>Role</th>
              <th>Joined</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const sub = u.subscription;
              const self = u.id === me.id;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="admin-title">{u.firstName} {u.lastName}{self && <span className="muted"> (you)</span>}</div>
                    <div className="admin-sub">{u.email}</div>
                  </td>
                  <td>
                    <select
                      value={u.planId ?? ''}
                      aria-label={`Plan for ${u.email}`}
                      onChange={(e) => {
                        const v = e.target.value;
                        const name = plans.find((p) => String(p.id) === v)?.name;
                        update(u, { planId: v === '' ? null : Number(v) }, v === '' ? `Removed ${u.email}'s plan` : `${u.email} moved to ${name}`);
                      }}
                    >
                      <option value="">No plan</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}{p.is_active ? '' : ' (inactive)'}</option>
                      ))}
                    </select>
                    {sub?.isTrial && sub.trialEndsAt && (
                      <div className={`admin-sub${sub.expired ? ' warn' : ''}`}>
                        {sub.expired ? 'Trial ended' : 'Trial ends'} {formatDate(sub.trialEndsAt, { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </td>
                  <td><TierBadge level={u.access.tier} name={u.access.tierName} small /></td>
                  <td>
                    <select
                      value={u.role}
                      disabled={self}
                      title={self ? "You can't change your own role" : undefined}
                      aria-label={`Role for ${u.email}`}
                      onChange={(e) => update(u, { role: e.target.value }, `${u.email} is now ${e.target.value === 'admin' ? 'an admin' : 'a regular user'}`)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="nowrap">{formatDate(u.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td className="admin-actions">
                    {!self && <button type="button" className="danger" onClick={() => remove(u)}>Delete</button>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="muted empty-row">No accounts match.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="hint admin-note">Assigning a plan here takes effect immediately and restarts its period (no payment involved).</p>
    </>
  );
}

import React, { useEffect, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { TierBadge, formatPlanPrice } from '../ui';

const EMPTY = { name: '', description: '', price: '', periodLength: 1, periodUnit: 'month', accessTier: 1, isActive: true };
const UNITS = ['day', 'week', 'month', 'year'];

export default function PlansTab({ notify }) {
  const { refresh } = useAuth();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.admin
      .listPlans()
      .then((d) => {
        setData(d);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.message));

  useEffect(() => {
    load();
  }, []);

  if (loadError) return <div className="state-msg"><h2>Couldn't load plans</h2><p className="muted">{loadError}</p></div>;
  if (!data) return <div className="state-msg">Loading plans…</div>;

  const paidTiers = data.tiers.filter((t) => t.level > 0);

  // Reload this tab and the app-wide plan list (paywalls, membership page).
  const reload = async () => {
    await load();
    await refresh();
  };

  const openEditor = (p) => {
    setForm(
      p
        ? {
            name: p.name,
            description: p.description || '',
            price: String(p.price),
            periodLength: p.period_length,
            periodUnit: p.period_unit,
            accessTier: p.access_tier,
            isActive: p.is_active,
          }
        : EMPTY
    );
    setEditing(p || {});
  };

  const onField = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: Number(form.price),
      periodLength: Number(form.periodLength),
      accessTier: Number(form.accessTier),
    };
    try {
      setSaving(true);
      if (editing.id) await api.admin.updatePlan(editing.id, payload);
      else await api.admin.createPlan(payload);
      notify(editing.id ? 'Plan updated' : 'Plan created');
      setEditing(null);
      await reload();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const quickUpdate = async (p, changes, message) => {
    try {
      await api.admin.updatePlan(p.id, changes);
      notify(message);
      await reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete the "${p.name}" plan?`)) return;
    try {
      await api.admin.deletePlan(p.id);
      notify('Plan deleted');
      await reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="page-title">Plans</h1>
          <p className="muted small">
            Each plan unlocks one tier; higher tiers include everything below them
            ({data.tiers.map((t) => t.name).join(' → ')}). Free plans work as trials and expire after their period.
          </p>
        </div>
        <button type="button" className="btn" onClick={() => openEditor(null)}>New plan</button>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Price</th>
              <th>Unlocks</th>
              <th>Subscribers</th>
              <th>Active</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {data.plans.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="admin-title">{p.name}</div>
                  {p.description && <div className="admin-sub">{p.description}</div>}
                </td>
                <td className="nowrap">{formatPlanPrice(p)}</td>
                <td>
                  <select
                    value={p.access_tier}
                    aria-label={`Tier for ${p.name}`}
                    onChange={(e) =>
                      quickUpdate(p, { accessTier: Number(e.target.value) },
                        `${p.name} now unlocks ${paidTiers.find((t) => t.level === Number(e.target.value))?.name}`)
                    }
                  >
                    {paidTiers.map((t) => <option key={t.level} value={t.level}>{t.name}</option>)}
                  </select>
                </td>
                <td>{p.subscribers}</td>
                <td>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={p.is_active}
                      onChange={() => quickUpdate(p, { isActive: !p.is_active }, p.is_active ? `${p.name} hidden from new subscribers` : `${p.name} is available again`)}
                    />
                    <span aria-hidden="true" />
                    <span className="sr-only">Active</span>
                  </label>
                </td>
                <td className="admin-actions">
                  <button type="button" onClick={() => openEditor(p)}>Edit</button>
                  <button type="button" className="danger" onClick={() => remove(p)}>Delete</button>
                </td>
              </tr>
            ))}
            {data.plans.length === 0 && <tr><td colSpan={6} className="muted empty-row">No plans yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="hint admin-note">
        Inactive plans can't be chosen by readers, but existing subscribers keep their access.
        A plan with subscribers can't be deleted.
      </p>

      {editing && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={editing.id ? 'Edit plan' : 'New plan'}>
          <form className="modal modal--sm" onSubmit={save}>
            <div className="modal-head">
              <h2>{editing.id ? 'Edit plan' : 'New plan'}</h2>
              <button type="button" className="modal-close" onClick={() => setEditing(null)} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              <div className="field-grid">
                <label className="span-2">Name *
                  <input name="name" value={form.name} onChange={onField} required />
                </label>
                <label className="span-2">Description
                  <input name="description" value={form.description} onChange={onField} />
                </label>
                <label>Price (USD) <span className="hint-inline">0 = free trial</span>
                  <input type="number" name="price" min="0" step="0.01" value={form.price} onChange={onField} required />
                </label>
                <label>Unlocks tier
                  <select name="accessTier" value={form.accessTier} onChange={onField}>
                    {paidTiers.map((t) => <option key={t.level} value={t.level}>{t.name} — {t.description}</option>)}
                  </select>
                </label>
                <div className="field-pair span-2">
                  <label>Billing period
                    <input type="number" name="periodLength" min="1" step="1" value={form.periodLength} onChange={onField} required />
                  </label>
                  <label>Unit
                    <select name="periodUnit" value={form.periodUnit} onChange={onField}>
                      {UNITS.map((u) => <option key={u} value={u}>{u}{Number(form.periodLength) === 1 ? '' : 's'}</option>)}
                    </select>
                  </label>
                </div>
                <label className="checkbox-row span-2">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={onField} />
                  Available to new subscribers
                </label>
              </div>
              {form.price !== '' && (
                <p className="hint">
                  Readers will see: <strong>{formatPlanPrice({ price: form.price, period_length: form.periodLength, period_unit: form.periodUnit })}</strong>{' '}
                  <TierBadge level={form.accessTier} name={paidTiers.find((t) => t.level === Number(form.accessTier))?.name} small />
                </p>
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create plan'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

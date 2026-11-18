import React from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Toast, useToast } from '../components/ui';
import ArticlesTab from '../components/admin/ArticlesTab';
import PlansTab from '../components/admin/PlansTab';
import SubscribersTab from '../components/admin/SubscribersTab';

const TABS = [
  { key: 'articles', label: 'Articles', Component: ArticlesTab },
  { key: 'plans', label: 'Plans', Component: PlansTab },
  { key: 'subscribers', label: 'Subscribers', Component: SubscribersTab },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [toast, notify] = useToast();

  if (!user) return <Navigate to="/login" state={{ from: '/admin' }} replace />;
  if (user.role !== 'admin') {
    return (
      <div className="container state-msg">
        <h2>Admins only</h2>
        <p className="muted">Your account doesn't have the admin role.</p>
        <Link to="/">← Back to latest</Link>
      </div>
    );
  }

  const active = TABS.find((t) => t.key === params.get('tab')) ?? TABS[0];
  const { Component } = active;

  return (
    <div className="container admin">
      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === active.key}
            className={`admin-tab${t.key === active.key ? ' admin-tab--active' : ''}`}
            onClick={() => setParams(t.key === 'articles' ? {} : { tab: t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Component notify={notify} />
      <Toast toast={toast} />
    </div>
  );
}

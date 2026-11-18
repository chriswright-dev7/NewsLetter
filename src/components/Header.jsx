import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { TierBadge } from './ui';

export default function Header() {
  const { user, viewer, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <header className="site-header">
      <div className="topbar container">
        <span className="topbar-date">{today}</span>
        <div className="topbar-account">
          {user ? (
            <>
              <Link to="/account" className="topbar-user">
                {user.firstName}
                {viewer && <TierBadge level={viewer.tier} name={viewer.tierName} small />}
              </Link>
              <button type="button" onClick={handleLogout} className="link-quiet">Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="link-quiet">Log in</Link>
              <Link to="/signup" className="btn btn-sm">Subscribe</Link>
            </>
          )}
        </div>
      </div>
      <div className="masthead container">
        <Link to="/" className="masthead-title">Signal &amp; Noise</Link>
        <p className="masthead-tagline">What actually changed this week, and whether it matters.</p>
      </div>
      <nav className="mainnav container">
        <NavLink to="/" end>Latest</NavLink>
        <NavLink to="/membership">Membership</NavLink>
        {user && <NavLink to="/account">Account</NavLink>}
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}
      </nav>
    </header>
  );
}

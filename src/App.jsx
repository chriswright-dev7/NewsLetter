import React from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';
import LoginPage from './pages/LoginPage';
import MembershipPage from './pages/MembershipPage';
import AdminPage from './pages/AdminPage';
import SignupPage from './pages/SignupPage';
import AccountPage from './pages/AccountPage';

function Shell() {
  const { ready, error } = useAuth();
  return (
    <>
      <Header />
      <main className="site-main">
        {!ready ? (
          <div className="container state-msg">Loading…</div>
        ) : error ? (
          <div className="container state-msg">
            <h2>Can't reach the newsletter server</h2>
            <p className="muted">{error}</p>
            <p className="muted">Start it with <code>npm run dev</code>.</p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/articles/:slug" element={<ArticlePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route
              path="*"
              element={
                <div className="container state-msg">
                  <h2>Page not found</h2>
                  <Link to="/">← Back to latest</Link>
                </div>
              }
            />
          </Routes>
        )}
      </main>
      <footer className="site-footer">
        <div className="container">Signal &amp; Noise · Reader-funded, no sponsored posts.</div>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}

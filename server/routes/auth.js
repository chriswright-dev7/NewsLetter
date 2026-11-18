// Sign up, log in, log out, current user.
import express from 'express';
import { config } from '../config.js';
import { plans, sessions, users } from '../store.js';
import { hashPassword, newToken, verifyPassword } from '../passwords.js';
import { publicUser, requireUser } from '../access.js';

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normEmail = (e) => String(e || '').trim().toLowerCase();

const startSession = (res, user, status = 200) => {
  const token = newToken();
  sessions.create(token, user.id, config.sessionDays);
  res.status(status).json({ token, user: publicUser(user) });
};

router.post('/signup', (req, res) => {
  const { firstName, lastName, password, planId } = req.body || {};
  const email = normEmail(req.body?.email);

  const errors = [];
  if (!String(firstName || '').trim()) errors.push('First name is required');
  if (!EMAIL_RE.test(email)) errors.push('A valid email is required');
  if (String(password || '').length < 8) errors.push('Password must be at least 8 characters');
  let plan = null;
  if (planId !== undefined && planId !== null && planId !== '') {
    plan = plans.byId(planId);
    if (!plan || !plan.is_active) errors.push('That plan is not available');
  }
  if (errors.length) return res.status(400).json({ message: errors.join('. ') });
  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ message: 'An account with that email already exists' });
  }

  const user = users.create({
    email,
    firstName: String(firstName).trim(),
    lastName: String(lastName || '').trim(),
    role: 'user',
    planId: plan?.id ?? null,
    planStartedAt: plan ? new Date().toISOString() : null,
    trialUsedAt: plan && Number(plan.price) === 0 ? new Date().toISOString() : null,
    passwordHash: hashPassword(password),
  });
  startSession(res, user, 201);
});

router.post('/login', (req, res) => {
  const user = users.find((u) => u.email === normEmail(req.body?.email));
  if (!user || !verifyPassword(req.body?.password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  startSession(res, user);
});

router.post('/logout', (req, res) => {
  if (req.token) sessions.remove(req.token);
  res.json({ message: 'Logged out' });
});

router.get('/me', requireUser, (req, res) => {
  res.json({ user: publicUser(req.user), viewer: req.viewer });
});

// Seeded demo accounts, listed on the login page for the prototype.
router.get('/demo-accounts', (req, res) => {
  if (!config.showDemoAccounts) return res.json([]);
  res.json(
    users
      .all()
      .filter((u) => u.isDemo)
      .map(({ email, firstName, lastName, role, planId }) => ({
        email, firstName, lastName, role, planName: plans.byId(planId)?.name ?? null,
      }))
  );
});

export default router;

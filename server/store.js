// JSON-file store for articles, plans, users and sessions (prototype persistence).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, DEMO_PASSWORD } from './config.js';
import { hashPassword } from './passwords.js';

const file = config.dataFile instanceof URL ? fileURLToPath(config.dataFile) : config.dataFile;
const seed = (name) => JSON.parse(fs.readFileSync(fileURLToPath(new URL(`./seed/${name}.json`, import.meta.url)), 'utf8'));
const now = () => new Date().toISOString();
const clone = (x) => (x ? structuredClone(x) : x);

const COLLECTIONS = ['articles', 'plans', 'users'];

const seedCollection = (name) => {
  if (name === 'articles') {
    return seed('articles').map((a, i) => ({
      id: i + 1, ...a, cover_image_url: a.cover_image_url || null, created_at: now(), updated_at: now(),
    }));
  }
  if (name === 'plans') return seed('plans').map((p) => ({ ...p, created_at: now(), updated_at: now() }));
  // users: demo accounts share one password
  return seed('users').map((u, i) => ({
    id: i + 1,
    ...u,
    passwordHash: hashPassword(DEMO_PASSWORD),
    planStartedAt: u.planId ? now() : null,
    trialUsedAt: u.planId && Number(db.plans.find((p) => p.id === u.planId)?.price) === 0 ? now() : null,
    isDemo: true,
    created_at: now(),
    updated_at: now(),
  }));
};

let db;

const save = () => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, file);
};

const load = () => {
  db = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  let changed = false;
  db.seq ??= {};
  db.sessions ??= {};
  // Fill any missing collection from the seed (first run, or a data file from an older version).
  for (const name of COLLECTIONS) {
    if (!Array.isArray(db[name])) {
      db[name] = seedCollection(name);
      console.log(`Seeded ${db[name].length} ${name}`);
      changed = true;
    }
    db.seq[name] = Math.max(db.seq[name] || 0, ...db[name].map((r) => r.id), 0);
  }
  // Older data files kept plan tiers separately; drop that.
  if (db.planTiers) {
    delete db.planTiers;
    changed = true;
  }
  if (changed) save();
  console.log(`Data file: ${file}`);
};

load();

// Generic CRUD over a collection.
const collection = (name) => ({
  all: () => db[name].map(clone),
  find: (pred) => clone(db[name].find(pred)),
  byId: (id) => clone(db[name].find((r) => r.id === Number(id))),
  create(data) {
    const row = { id: ++db.seq[name], ...data, created_at: now(), updated_at: now() };
    db[name].push(row);
    save();
    return clone(row);
  },
  update(id, changes) {
    const row = db[name].find((r) => r.id === Number(id));
    if (!row) return null;
    Object.assign(row, changes, { updated_at: now() });
    save();
    return clone(row);
  },
  remove(id) {
    const before = db[name].length;
    db[name] = db[name].filter((r) => r.id !== Number(id));
    if (db[name].length === before) return false;
    save();
    return true;
  },
});

export const articles = collection('articles');
export const plans = collection('plans');
export const users = collection('users');

export const sessions = {
  create(token, userId, days) {
    db.sessions[token] = { userId, expiresAt: Date.now() + days * 86_400_000 };
    // prune expired sessions while we're writing anyway
    for (const [t, s] of Object.entries(db.sessions)) if (s.expiresAt < Date.now()) delete db.sessions[t];
    save();
  },
  get(token) {
    const s = db.sessions[token];
    return s && s.expiresAt > Date.now() ? { ...s } : null;
  },
  remove(token) {
    if (db.sessions[token]) {
      delete db.sessions[token];
      save();
    }
  },
  removeForUser(userId) {
    for (const [t, s] of Object.entries(db.sessions)) if (s.userId === userId) delete db.sessions[t];
    save();
  },
};

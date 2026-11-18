// Runtime configuration (from .env via `node --env-file-if-exists=.env`).
export const config = {
  port: Number(process.env.PORT) || 5100,
  dataFile: process.env.DATA_FILE || new URL('../data/db.json', import.meta.url),
  sessionDays: Number(process.env.SESSION_DAYS) || 30,
  // Lists the seeded demo accounts on the login page. Set to "false" to hide them.
  showDemoAccounts: process.env.SHOW_DEMO_ACCOUNTS !== 'false',
};

export const DEMO_PASSWORD = 'demo';

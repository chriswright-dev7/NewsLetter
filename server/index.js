import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { resolveViewer } from './access.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/account.js';
import articleRoutes from './routes/articles.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Every API route knows who is asking (req.user / req.viewer); anonymous is fine.
app.use('/api', resolveViewer);
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found' }));

// In production, serve the built frontend (npm run build) from the same origin.
const dist = fileURLToPath(new URL('../dist', import.meta.url));
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(`${dist}/index.html`));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status && err.status < 600 ? err.status : 500).json({ message: err.message || 'Server error' });
});

const server = app.listen(config.port, () => {
  console.log(`Newsletter server on http://localhost:${config.port}`);
  if (config.showDemoAccounts) console.log('Demo accounts are listed on the login page (password "demo").');
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Stop the other process or set PORT in .env.`);
    process.exit(1);
  }
  throw err;
});

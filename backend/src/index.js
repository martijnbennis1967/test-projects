import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import companiesRouter from './routes/companies.js';
import ownershipRouter from './routes/ownership.js';
import participationsRouter from './routes/participations.js';
import loansRouter from './routes/loans.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/companies', companiesRouter);
app.use('/api/ownership', ownershipRouter);
app.use('/api/participations', participationsRouter);
app.use('/api/loans', loansRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files in production
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// Catch-all route to serve frontend for client-side routing
app.get('*', (req, res, next) => {
  // Don't catch API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VCA Investment API running on http://0.0.0.0:${PORT}`);
});

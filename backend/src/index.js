import express from 'express';
import cors from 'cors';
import companiesRouter from './routes/companies.js';
import ownershipRouter from './routes/ownership.js';
import participationsRouter from './routes/participations.js';
import loansRouter from './routes/loans.js';

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VCA Investment API running on http://0.0.0.0:${PORT}`);
});

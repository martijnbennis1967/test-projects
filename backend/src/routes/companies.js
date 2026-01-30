import { Router } from 'express';
import db from '../database.js';

const router = Router();

// Get all companies
router.get('/', (req, res) => {
  try {
    const companies = db.prepare('SELECT * FROM companies ORDER BY name').all();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single company with ownership details
router.get('/:id', (req, res) => {
  try {
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get owners (who owns this company)
    const owners = db.prepare(`
      SELECT o.*, c.name as owner_name
      FROM ownership o
      JOIN companies c ON o.owner_id = c.id
      WHERE o.owned_id = ?
    `).all(req.params.id);

    // Get owned companies (what this company owns)
    const owned = db.prepare(`
      SELECT o.*, c.name as owned_name
      FROM ownership o
      JOIN companies c ON o.owned_id = c.id
      WHERE o.owner_id = ?
    `).all(req.params.id);

    res.json({ ...company, owners, owned });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create company
router.post('/', (req, res) => {
  try {
    const { name, type, description } = req.body;
    const result = db.prepare(
      'INSERT INTO companies (name, type, description) VALUES (?, ?, ?)'
    ).run(name, type, description);

    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(company);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update company
router.put('/:id', (req, res) => {
  try {
    const { name, type, description } = req.body;
    db.prepare(
      'UPDATE companies SET name = ?, type = ?, description = ? WHERE id = ?'
    ).run(name, type, description, req.params.id);

    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    res.json(company);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete company
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

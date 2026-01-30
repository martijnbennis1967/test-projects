import { Router } from 'express';
import db from '../database.js';

const router = Router();

// Get all ownership relations
router.get('/', (req, res) => {
  try {
    const ownership = db.prepare(`
      SELECT
        o.*,
        owner.name as owner_name,
        owned.name as owned_name
      FROM ownership o
      JOIN companies owner ON o.owner_id = owner.id
      JOIN companies owned ON o.owned_id = owned.id
      ORDER BY owner.name, owned.name
    `).all();
    res.json(ownership);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create ownership relation
router.post('/', (req, res) => {
  try {
    const { owner_id, owned_id, percentage, acquisition_date, notes } = req.body;

    // Validate that total ownership doesn't exceed 100%
    const existing = db.prepare(
      'SELECT SUM(percentage) as total FROM ownership WHERE owned_id = ? AND owner_id != ?'
    ).get(owned_id, owner_id);

    if (existing && (existing.total || 0) + percentage > 100) {
      return res.status(400).json({
        error: 'Total ownership percentage cannot exceed 100%'
      });
    }

    const result = db.prepare(`
      INSERT INTO ownership (owner_id, owned_id, percentage, acquisition_date, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(owner_id, owned_id, percentage, acquisition_date, notes);

    const ownership = db.prepare(`
      SELECT o.*, owner.name as owner_name, owned.name as owned_name
      FROM ownership o
      JOIN companies owner ON o.owner_id = owner.id
      JOIN companies owned ON o.owned_id = owned.id
      WHERE o.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(ownership);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update ownership relation
router.put('/:id', (req, res) => {
  try {
    const { percentage, acquisition_date, notes } = req.body;
    const current = db.prepare('SELECT * FROM ownership WHERE id = ?').get(req.params.id);

    if (!current) {
      return res.status(404).json({ error: 'Ownership relation not found' });
    }

    // Validate total ownership
    const existing = db.prepare(
      'SELECT SUM(percentage) as total FROM ownership WHERE owned_id = ? AND id != ?'
    ).get(current.owned_id, req.params.id);

    if (existing && (existing.total || 0) + percentage > 100) {
      return res.status(400).json({
        error: 'Total ownership percentage cannot exceed 100%'
      });
    }

    db.prepare(`
      UPDATE ownership SET percentage = ?, acquisition_date = ?, notes = ? WHERE id = ?
    `).run(percentage, acquisition_date, notes, req.params.id);

    const ownership = db.prepare(`
      SELECT o.*, owner.name as owner_name, owned.name as owned_name
      FROM ownership o
      JOIN companies owner ON o.owner_id = owner.id
      JOIN companies owned ON o.owned_id = owned.id
      WHERE o.id = ?
    `).get(req.params.id);

    res.json(ownership);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete ownership relation
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM ownership WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ownership relation not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

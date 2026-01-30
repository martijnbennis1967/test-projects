import { Router } from 'express';
import db from '../database.js';

const router = Router();

// Get all participations
router.get('/', (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM participations';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY name';
    const participations = db.prepare(query).all(...params);
    res.json(participations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single participation
router.get('/:id', (req, res) => {
  try {
    const participation = db.prepare('SELECT * FROM participations WHERE id = ?').get(req.params.id);
    if (!participation) {
      return res.status(404).json({ error: 'Participation not found' });
    }
    res.json(participation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create participation
router.post('/', (req, res) => {
  try {
    const {
      name,
      sector,
      acquisition_date,
      acquisition_value,
      current_value,
      ownership_percentage,
      status,
      notes
    } = req.body;

    const result = db.prepare(`
      INSERT INTO participations
      (name, sector, acquisition_date, acquisition_value, current_value, ownership_percentage, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      sector,
      acquisition_date,
      acquisition_value,
      current_value || acquisition_value,
      ownership_percentage,
      status || 'active',
      notes
    );

    const participation = db.prepare('SELECT * FROM participations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(participation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update participation
router.put('/:id', (req, res) => {
  try {
    const {
      name,
      sector,
      acquisition_date,
      acquisition_value,
      current_value,
      ownership_percentage,
      status,
      notes
    } = req.body;

    db.prepare(`
      UPDATE participations SET
        name = ?,
        sector = ?,
        acquisition_date = ?,
        acquisition_value = ?,
        current_value = ?,
        ownership_percentage = ?,
        status = ?,
        notes = ?
      WHERE id = ?
    `).run(
      name,
      sector,
      acquisition_date,
      acquisition_value,
      current_value,
      ownership_percentage,
      status,
      notes,
      req.params.id
    );

    const participation = db.prepare('SELECT * FROM participations WHERE id = ?').get(req.params.id);
    res.json(participation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete participation
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM participations WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Participation not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get summary statistics
router.get('/stats/summary', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'active' THEN acquisition_value ELSE 0 END) as total_acquisition_value,
        SUM(CASE WHEN status = 'active' THEN current_value ELSE 0 END) as total_current_value
      FROM participations
    `).get();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

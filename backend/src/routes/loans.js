import { Router } from 'express';
import db from '../database.js';

const router = Router();

// Get all loans with company names
router.get('/', (req, res) => {
  try {
    const { status, lender_id, borrower_id } = req.query;
    let query = `
      SELECT
        l.*,
        lender.name as lender_name,
        borrower.name as borrower_name,
        COALESCE(SUM(p.principal_amount), 0) as total_principal_paid,
        COALESCE(SUM(p.interest_amount), 0) as total_interest_paid
      FROM loans l
      JOIN companies lender ON l.lender_id = lender.id
      JOIN companies borrower ON l.borrower_id = borrower.id
      LEFT JOIN loan_payments p ON l.id = p.loan_id
    `;

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('l.status = ?');
      params.push(status);
    }
    if (lender_id) {
      conditions.push('l.lender_id = ?');
      params.push(lender_id);
    }
    if (borrower_id) {
      conditions.push('l.borrower_id = ?');
      params.push(borrower_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY l.id ORDER BY l.start_date DESC';

    const loans = db.prepare(query).all(...params);

    // Calculate remaining balance for each loan
    const loansWithBalance = loans.map(loan => ({
      ...loan,
      remaining_balance: loan.principal - loan.total_principal_paid,
      accrued_interest: calculateAccruedInterest(loan)
    }));

    res.json(loansWithBalance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single loan with all payments
router.get('/:id', (req, res) => {
  try {
    const loan = db.prepare(`
      SELECT
        l.*,
        lender.name as lender_name,
        borrower.name as borrower_name
      FROM loans l
      JOIN companies lender ON l.lender_id = lender.id
      JOIN companies borrower ON l.borrower_id = borrower.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const payments = db.prepare(`
      SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY payment_date DESC
    `).all(req.params.id);

    const totalPrincipalPaid = payments.reduce((sum, p) => sum + (p.principal_amount || 0), 0);
    const totalInterestPaid = payments.reduce((sum, p) => sum + (p.interest_amount || 0), 0);

    res.json({
      ...loan,
      payments,
      total_principal_paid: totalPrincipalPaid,
      total_interest_paid: totalInterestPaid,
      remaining_balance: loan.principal - totalPrincipalPaid,
      accrued_interest: calculateAccruedInterest(loan, totalInterestPaid)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create loan
router.post('/', (req, res) => {
  try {
    const {
      lender_id,
      borrower_id,
      description,
      principal,
      interest_rate,
      interest_type,
      start_date,
      end_date,
      payment_frequency,
      status,
      notes
    } = req.body;

    if (lender_id === borrower_id) {
      return res.status(400).json({ error: 'Lender and borrower cannot be the same' });
    }

    const result = db.prepare(`
      INSERT INTO loans
      (lender_id, borrower_id, description, principal, interest_rate, interest_type, start_date, end_date, payment_frequency, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      lender_id,
      borrower_id,
      description,
      principal,
      interest_rate || 0,
      interest_type || 'fixed',
      start_date,
      end_date,
      payment_frequency || 'monthly',
      status || 'active',
      notes
    );

    const loan = db.prepare(`
      SELECT l.*, lender.name as lender_name, borrower.name as borrower_name
      FROM loans l
      JOIN companies lender ON l.lender_id = lender.id
      JOIN companies borrower ON l.borrower_id = borrower.id
      WHERE l.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update loan
router.put('/:id', (req, res) => {
  try {
    const {
      description,
      principal,
      interest_rate,
      interest_type,
      start_date,
      end_date,
      payment_frequency,
      status,
      notes
    } = req.body;

    db.prepare(`
      UPDATE loans SET
        description = ?,
        principal = ?,
        interest_rate = ?,
        interest_type = ?,
        start_date = ?,
        end_date = ?,
        payment_frequency = ?,
        status = ?,
        notes = ?
      WHERE id = ?
    `).run(
      description,
      principal,
      interest_rate,
      interest_type,
      start_date,
      end_date,
      payment_frequency,
      status,
      notes,
      req.params.id
    );

    const loan = db.prepare(`
      SELECT l.*, lender.name as lender_name, borrower.name as borrower_name
      FROM loans l
      JOIN companies lender ON l.lender_id = lender.id
      JOIN companies borrower ON l.borrower_id = borrower.id
      WHERE l.id = ?
    `).get(req.params.id);

    res.json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete loan
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM loans WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add payment to loan
router.post('/:id/payments', (req, res) => {
  try {
    const { payment_date, principal_amount, interest_amount, notes } = req.body;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const result = db.prepare(`
      INSERT INTO loan_payments (loan_id, payment_date, principal_amount, interest_amount, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, payment_date, principal_amount || 0, interest_amount || 0, notes);

    const payment = db.prepare('SELECT * FROM loan_payments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete payment
router.delete('/:loanId/payments/:paymentId', (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM loan_payments WHERE id = ? AND loan_id = ?'
    ).run(req.params.paymentId, req.params.loanId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get balance summary between all companies
router.get('/summary/balances', (req, res) => {
  try {
    const balances = db.prepare(`
      SELECT
        l.lender_id,
        l.borrower_id,
        lender.name as lender_name,
        borrower.name as borrower_name,
        SUM(l.principal) as total_principal,
        SUM(COALESCE(paid.total_paid, 0)) as total_paid,
        SUM(l.principal - COALESCE(paid.total_paid, 0)) as outstanding_balance
      FROM loans l
      JOIN companies lender ON l.lender_id = lender.id
      JOIN companies borrower ON l.borrower_id = borrower.id
      LEFT JOIN (
        SELECT loan_id, SUM(principal_amount) as total_paid
        FROM loan_payments
        GROUP BY loan_id
      ) paid ON l.id = paid.loan_id
      WHERE l.status = 'active'
      GROUP BY l.lender_id, l.borrower_id
    `).all();

    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate accrued interest
function calculateAccruedInterest(loan, paidInterest = 0) {
  if (!loan.interest_rate || loan.interest_rate === 0) return 0;

  const startDate = new Date(loan.start_date);
  const today = new Date();
  const years = (today - startDate) / (365.25 * 24 * 60 * 60 * 1000);

  // Simple interest calculation
  const totalInterest = loan.principal * (loan.interest_rate / 100) * years;
  return Math.max(0, totalInterest - paidInterest);
}

export default router;

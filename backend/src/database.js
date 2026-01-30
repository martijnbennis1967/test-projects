import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '../data/vca.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Vennootschappen (Companies)
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('holding', 'investment', 'participation')),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Aandeelhouders relaties (Ownership)
  CREATE TABLE IF NOT EXISTS ownership (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    owned_id INTEGER NOT NULL,
    percentage REAL NOT NULL CHECK(percentage >= 0 AND percentage <= 100),
    acquisition_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (owned_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(owner_id, owned_id)
  );

  -- Deelnemingen van VCA (Participations)
  CREATE TABLE IF NOT EXISTS participations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sector TEXT,
    acquisition_date DATE,
    acquisition_value REAL,
    current_value REAL,
    ownership_percentage REAL CHECK(ownership_percentage >= 0 AND ownership_percentage <= 100),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'sold', 'written_off')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Leningen tussen vennootschappen (Loans)
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lender_id INTEGER NOT NULL,
    borrower_id INTEGER NOT NULL,
    description TEXT,
    principal REAL NOT NULL,
    interest_rate REAL NOT NULL DEFAULT 0,
    interest_type TEXT DEFAULT 'fixed' CHECK(interest_type IN ('fixed', 'variable')),
    start_date DATE NOT NULL,
    end_date DATE,
    payment_frequency TEXT DEFAULT 'monthly' CHECK(payment_frequency IN ('monthly', 'quarterly', 'yearly', 'at_maturity', 'on_demand')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paid_off', 'defaulted')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lender_id) REFERENCES companies(id) ON DELETE RESTRICT,
    FOREIGN KEY (borrower_id) REFERENCES companies(id) ON DELETE RESTRICT
  );

  -- Betalingen/Aflossingen (Loan Payments)
  CREATE TABLE IF NOT EXISTS loan_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL,
    payment_date DATE NOT NULL,
    principal_amount REAL DEFAULT 0,
    interest_amount REAL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
  );

  -- Trigger om updated_at bij te werken
  CREATE TRIGGER IF NOT EXISTS update_companies_timestamp
  AFTER UPDATE ON companies
  BEGIN
    UPDATE companies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_ownership_timestamp
  AFTER UPDATE ON ownership
  BEGIN
    UPDATE ownership SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_participations_timestamp
  AFTER UPDATE ON participations
  BEGIN
    UPDATE participations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_loans_timestamp
  AFTER UPDATE ON loans
  BEGIN
    UPDATE loans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
`);

export default db;

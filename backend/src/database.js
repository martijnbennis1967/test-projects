import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../data/vca.db');

// Ensure data directory exists
const dataDir = join(__dirname, '../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize SQL.js
const SQL = await initSqlJs();

// Load existing database or create new one
let db;
if (existsSync(dbPath)) {
  const fileBuffer = readFileSync(dbPath);
  db = new SQL.Database(fileBuffer);
} else {
  db = new SQL.Database();
}

// Save database to file
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

// Wrapper to make sql.js work like better-sqlite3
const dbWrapper = {
  prepare: (sql) => ({
    run: (...params) => {
      try {
        const flatParams = params.flat();
        if (flatParams.length > 0) {
          db.run(sql, flatParams);
        } else {
          db.run(sql);
        }
        saveDatabase();
        const result = db.exec("SELECT last_insert_rowid() as id");
        const lastId = result[0]?.values[0]?.[0] || 0;
        return { lastInsertRowid: lastId, changes: db.getRowsModified() };
      } catch (err) {
        console.error('DB run error:', err.message, 'SQL:', sql, 'Params:', params);
        throw err;
      }
    },
    get: (...params) => {
      try {
        const flatParams = params.flat();
        const stmt = db.prepare(sql);
        if (flatParams.length > 0) {
          stmt.bind(flatParams);
        }
        let row = undefined;
        if (stmt.step()) {
          row = stmt.getAsObject();
        }
        stmt.free();
        return row;
      } catch (err) {
        console.error('DB get error:', err.message, 'SQL:', sql, 'Params:', params);
        throw err;
      }
    },
    all: (...params) => {
      try {
        const flatParams = params.flat();
        const stmt = db.prepare(sql);
        if (flatParams.length > 0) {
          stmt.bind(flatParams);
        }
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      } catch (err) {
        console.error('DB all error:', err.message, 'SQL:', sql, 'Params:', params);
        throw err;
      }
    }
  }),
  exec: (sql) => {
    try {
      db.run(sql);
      saveDatabase();
    } catch (err) {
      console.error('DB exec error:', err.message, 'SQL:', sql);
      throw err;
    }
  },
  pragma: () => {}
};

// Create tables
dbWrapper.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

dbWrapper.exec(`
  CREATE TABLE IF NOT EXISTS ownership (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    owned_id INTEGER NOT NULL,
    percentage REAL NOT NULL,
    acquisition_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_id, owned_id)
  )
`);

dbWrapper.exec(`
  CREATE TABLE IF NOT EXISTS participations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sector TEXT,
    acquisition_date DATE,
    acquisition_value REAL,
    current_value REAL,
    ownership_percentage REAL,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

dbWrapper.exec(`
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lender_id INTEGER NOT NULL,
    borrower_id INTEGER NOT NULL,
    description TEXT,
    principal REAL NOT NULL,
    interest_rate REAL NOT NULL DEFAULT 0,
    interest_type TEXT DEFAULT 'fixed',
    start_date DATE NOT NULL,
    end_date DATE,
    payment_frequency TEXT DEFAULT 'monthly',
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

dbWrapper.exec(`
  CREATE TABLE IF NOT EXISTS loan_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL,
    payment_date DATE NOT NULL,
    principal_amount REAL DEFAULT 0,
    interest_amount REAL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default dbWrapper;

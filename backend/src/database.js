import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use DATABASE_PATH env variable for Railway volume, or default to local data folder
const dataDir = process.env.DATABASE_PATH || join(__dirname, '../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}
const dbPath = join(dataDir, 'vca.db');

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

// Convert undefined/null to null for SQL
function sanitizeParams(params) {
  return params.map(p => (p === undefined || p === '' ? null : p));
}

// Wrapper to make sql.js work like better-sqlite3
const dbWrapper = {
  prepare: (sql) => ({
    run: (...params) => {
      try {
        const cleanParams = sanitizeParams(params);
        db.run(sql, cleanParams);
        saveDatabase();
        const result = db.exec("SELECT last_insert_rowid() as id");
        const lastId = result[0]?.values[0]?.[0] || 0;
        return { lastInsertRowid: lastId, changes: db.getRowsModified() };
      } catch (err) {
        console.error('DB run error:', err.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw err;
      }
    },
    get: (...params) => {
      try {
        const cleanParams = sanitizeParams(params);
        const stmt = db.prepare(sql);
        if (cleanParams.length > 0) {
          stmt.bind(cleanParams);
        }
        let row = undefined;
        if (stmt.step()) {
          row = stmt.getAsObject();
        }
        stmt.free();
        return row;
      } catch (err) {
        console.error('DB get error:', err.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw err;
      }
    },
    all: (...params) => {
      try {
        const cleanParams = sanitizeParams(params);
        const stmt = db.prepare(sql);
        if (cleanParams.length > 0) {
          stmt.bind(cleanParams);
        }
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      } catch (err) {
        console.error('DB all error:', err.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw err;
      }
    }
  }),
  exec: (sql) => {
    try {
      db.run(sql);
      saveDatabase();
    } catch (err) {
      // Ignore "table already exists" errors
      if (!err.message.includes('already exists')) {
        console.error('DB exec error:', err.message);
        throw err;
      }
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

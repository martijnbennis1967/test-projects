import db from './database.js';

// Clear existing data
db.exec(`
  DELETE FROM loan_payments;
  DELETE FROM loans;
  DELETE FROM participations;
  DELETE FROM ownership;
  DELETE FROM companies;
`);

// Insert the three main companies
const insertCompany = db.prepare(
  'INSERT INTO companies (name, type, description) VALUES (?, ?, ?)'
);

const sonnevanck = insertCompany.run(
  'Sonnevanck',
  'holding',
  'Holding vennootschap - aandeelhouder VCA (50%)'
);

const bennisDam = insertCompany.run(
  'Bennis-Dam Holding',
  'holding',
  'Holding vennootschap - aandeelhouder VCA (50%)'
);

const vca = insertCompany.run(
  'VCA',
  'investment',
  'VCA Investeringsbedrijf - centrale investeringsvennootschap'
);

// Set up ownership relations
const insertOwnership = db.prepare(
  'INSERT INTO ownership (owner_id, owned_id, percentage, notes) VALUES (?, ?, ?, ?)'
);

insertOwnership.run(sonnevanck.lastInsertRowid, vca.lastInsertRowid, 50, 'Oorspronkelijk aandeelhouder');
insertOwnership.run(bennisDam.lastInsertRowid, vca.lastInsertRowid, 50, 'Oorspronkelijk aandeelhouder');

// Insert some example participations
const insertParticipation = db.prepare(`
  INSERT INTO participations (name, sector, acquisition_date, acquisition_value, current_value, ownership_percentage, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

insertParticipation.run(
  'Tech Startup BV',
  'Technologie',
  '2023-01-15',
  100000,
  150000,
  25,
  'Innovatief tech bedrijf'
);

insertParticipation.run(
  'Vastgoed Beheer NV',
  'Vastgoed',
  '2022-06-01',
  500000,
  550000,
  40,
  'Commercieel vastgoed portfolio'
);

insertParticipation.run(
  'Duurzame Energie BV',
  'Energie',
  '2024-03-20',
  250000,
  250000,
  15,
  'Zonne-energie projecten'
);

// Insert example loans
const insertLoan = db.prepare(`
  INSERT INTO loans (lender_id, borrower_id, description, principal, interest_rate, interest_type, start_date, end_date, payment_frequency, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const loan1 = insertLoan.run(
  sonnevanck.lastInsertRowid,
  vca.lastInsertRowid,
  'Financiering Tech Startup investering',
  75000,
  3.5,
  'fixed',
  '2023-01-01',
  '2028-01-01',
  'yearly',
  'Lening voor acquisitie Tech Startup BV'
);

const loan2 = insertLoan.run(
  bennisDam.lastInsertRowid,
  vca.lastInsertRowid,
  'Financiering Vastgoed investering',
  300000,
  4.0,
  'fixed',
  '2022-06-01',
  '2027-06-01',
  'quarterly',
  'Lening voor acquisitie Vastgoed Beheer NV'
);

const loan3 = insertLoan.run(
  sonnevanck.lastInsertRowid,
  vca.lastInsertRowid,
  'Werkkapitaal financiering',
  50000,
  2.5,
  'fixed',
  '2024-01-01',
  null,
  'on_demand',
  'Rekening-courant faciliteit'
);

// Insert some example payments
const insertPayment = db.prepare(`
  INSERT INTO loan_payments (loan_id, payment_date, principal_amount, interest_amount, notes)
  VALUES (?, ?, ?, ?, ?)
`);

insertPayment.run(loan1.lastInsertRowid, '2024-01-01', 15000, 2625, 'Jaarlijkse aflossing 2024');
insertPayment.run(loan2.lastInsertRowid, '2023-09-01', 15000, 3000, 'Q3 2023 aflossing');
insertPayment.run(loan2.lastInsertRowid, '2023-12-01', 15000, 3000, 'Q4 2023 aflossing');
insertPayment.run(loan2.lastInsertRowid, '2024-03-01', 15000, 3000, 'Q1 2024 aflossing');

console.log('Database seeded successfully!');
console.log('Created companies:', sonnevanck.lastInsertRowid, bennisDam.lastInsertRowid, vca.lastInsertRowid);
console.log('Created 2 ownership relations');
console.log('Created 3 participations');
console.log('Created 3 loans with 4 payments');

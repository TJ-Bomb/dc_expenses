-- DC Expenses v2 — run this once in Neon SQL Editor against a NEW database.
CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(140) NOT NULL,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS accounting_titles (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(80) NOT NULL UNIQUE,
  transaction_type VARCHAR(12) NOT NULL DEFAULT 'expense' CHECK (transaction_type IN ('income','expense','both')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(12) NOT NULL CHECK (transaction_type IN ('income','expense')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  user_label VARCHAR(80) NOT NULL,
  particulars TEXT NOT NULL,
  accounting_title_id BIGINT REFERENCES accounting_titles(id) ON DELETE RESTRICT,
  created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  updated_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_title ON transactions(accounting_title_id);
CREATE INDEX IF NOT EXISTS idx_transactions_creator ON transactions(created_by);
INSERT INTO accounting_titles (title, transaction_type) VALUES
 ('Food','expense'),('Grocery','expense'),('Medicine','expense'),('HMO','expense'),
 ('Cloths','expense'),('Hclick','expense'),('Car','expense'),('Others','both')
ON CONFLICT (title) DO NOTHING;

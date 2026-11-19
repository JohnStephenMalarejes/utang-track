-- =====================================================================
-- Utang Tracker :: SQLite Schema (with local authentication)
-- =====================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  email          TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  salt           TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users (lower(trim(email)));

CREATE TABLE IF NOT EXISTS auth_session (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  contact     TEXT CHECK (contact IS NULL OR length(contact) <= 200),
  notes       TEXT CHECK (notes IS NULL OR length(notes) <= 1000),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS members_user_name_unique
  ON members (COALESCE(user_id, ''), lower(trim(name)));

CREATE TABLE IF NOT EXISTS expenses (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id) ON DELETE CASCADE,
  description   TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 200),
  category      TEXT NOT NULL CHECK (category IN ('Breakfast','Lunch','Dinner','Snack','Pre-workout','Other')),
  total_amount  NUMERIC NOT NULL CHECK (total_amount > 0),
  expense_date  TEXT NOT NULL,
  paid_by       TEXT REFERENCES members(id) ON DELETE SET NULL,
  notes         TEXT CHECK (notes IS NULL OR length(notes) <= 1000),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses (category);
CREATE INDEX IF NOT EXISTS expenses_paid_by_idx ON expenses (paid_by);
CREATE INDEX IF NOT EXISTS expenses_user_idx ON expenses (user_id);

CREATE TABLE IF NOT EXISTS expense_shares (
  id              TEXT PRIMARY KEY,
  expense_id      TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id       TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  share_amount    NUMERIC NOT NULL CHECK (share_amount >= 0),
  settled_amount  NUMERIC NOT NULL DEFAULT 0 CHECK (settled_amount >= 0),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  UNIQUE (expense_id, member_id)
);

CREATE INDEX IF NOT EXISTS expense_shares_member_idx ON expense_shares (member_id);
CREATE INDEX IF NOT EXISTS expense_shares_expense_idx ON expense_shares (expense_id);

CREATE TABLE IF NOT EXISTS payments (
  id                TEXT PRIMARY KEY,
  user_id           TEXT REFERENCES users(id) ON DELETE CASCADE,
  member_id         TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  expense_share_id  TEXT NOT NULL REFERENCES expense_shares(id) ON DELETE CASCADE,
  amount            NUMERIC NOT NULL CHECK (amount > 0),
  payment_date      TEXT NOT NULL,
  notes             TEXT CHECK (notes IS NULL OR length(notes) <= 1000),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS payments_member_idx ON payments (member_id);
CREATE INDEX IF NOT EXISTS payments_share_idx ON payments (expense_share_id);
CREATE INDEX IF NOT EXISTS payments_date_idx ON payments (payment_date DESC);
CREATE INDEX IF NOT EXISTS payments_user_idx ON payments (user_id);

CREATE TABLE IF NOT EXISTS calendar_expenses (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  amount        NUMERIC NOT NULL CHECK (amount > 0),
  expense_date  TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS calendar_expenses_user_date_idx
  ON calendar_expenses (user_id, expense_date DESC);

CREATE TRIGGER IF NOT EXISTS payments_validate_insert
BEFORE INSERT ON payments
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM expense_shares WHERE id = NEW.expense_share_id)
      THEN RAISE(ABORT, 'Expense share not found')
    WHEN (SELECT member_id FROM expense_shares WHERE id = NEW.expense_share_id) <> NEW.member_id
      THEN RAISE(ABORT, 'This expense share does not belong to the selected member')
    WHEN (
      SELECT e.paid_by
      FROM expense_shares es
      JOIN expenses e ON e.id = es.expense_id
      WHERE es.id = NEW.expense_share_id
    ) = NEW.member_id
      THEN RAISE(ABORT, 'The payer''s own share is not a debt and cannot receive payments')
  END;
END;

CREATE TRIGGER IF NOT EXISTS payments_validate_update
BEFORE UPDATE ON payments
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM expense_shares WHERE id = NEW.expense_share_id)
      THEN RAISE(ABORT, 'Expense share not found')
    WHEN (SELECT member_id FROM expense_shares WHERE id = NEW.expense_share_id) <> NEW.member_id
      THEN RAISE(ABORT, 'This expense share does not belong to the selected member')
    WHEN (
      SELECT e.paid_by
      FROM expense_shares es
      JOIN expenses e ON e.id = es.expense_id
      WHERE es.id = NEW.expense_share_id
    ) = NEW.member_id
      THEN RAISE(ABORT, 'The payer''s own share is not a debt and cannot receive payments')
  END;
END;

CREATE TRIGGER IF NOT EXISTS payments_sync_settled_insert
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
  UPDATE expense_shares
     SET settled_amount = COALESCE((SELECT ROUND(SUM(amount), 2) FROM payments WHERE expense_share_id = NEW.expense_share_id), 0)
   WHERE id = NEW.expense_share_id;
END;

CREATE TRIGGER IF NOT EXISTS payments_sync_settled_update
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
  UPDATE expense_shares
     SET settled_amount = COALESCE((SELECT ROUND(SUM(amount), 2) FROM payments WHERE expense_share_id = OLD.expense_share_id), 0)
   WHERE id = OLD.expense_share_id;
  UPDATE expense_shares
     SET settled_amount = COALESCE((SELECT ROUND(SUM(amount), 2) FROM payments WHERE expense_share_id = NEW.expense_share_id), 0)
   WHERE id = NEW.expense_share_id;
END;

CREATE TRIGGER IF NOT EXISTS payments_sync_settled_delete
AFTER DELETE ON payments
FOR EACH ROW
BEGIN
  UPDATE expense_shares
     SET settled_amount = COALESCE((SELECT ROUND(SUM(amount), 2) FROM payments WHERE expense_share_id = OLD.expense_share_id), 0)
   WHERE id = OLD.expense_share_id;
END;

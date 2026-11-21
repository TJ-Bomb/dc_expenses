-- DC Expenses security migration. Does not alter financial records.
CREATE TABLE IF NOT EXISTS auth_login_attempts (
  attempt_key VARCHAR(180) PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_window ON auth_login_attempts(window_started_at);
DELETE FROM auth_login_attempts WHERE window_started_at<NOW()-INTERVAL '24 hours';

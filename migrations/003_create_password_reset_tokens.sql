-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 003_create_password_reset_tokens
-- Purpose: Store single-use, time-limited password reset tokens
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT        UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookups by token (used on reset)
CREATE INDEX IF NOT EXISTS idx_prt_token   ON password_reset_tokens(token);
-- Fast lookups by user (used to invalidate old tokens before generating new one)
CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);

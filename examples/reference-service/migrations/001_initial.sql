-- Sanitized reconstruction based on implemented systems.
-- Minimal schema for standalone evidence only.

CREATE TABLE spaces (
  id text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE memberships (
  space_id text NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('viewer', 'member', 'editor', 'admin', 'owner')),
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (space_id, user_id)
);

CREATE TABLE records (
  id text PRIMARY KEY,
  space_id text NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE idempotency_keys (
  actor_id text NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  resource_id text NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, key)
);

CREATE TABLE outbox_events (
  id text PRIMARY KEY,
  aggregate_id text NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  job_id text NOT NULL UNIQUE,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outbox_pending_idx
  ON outbox_events (available_at, created_at)
  WHERE processed_at IS NULL;

CREATE TABLE processed_events (
  outbox_id text PRIMARY KEY REFERENCES outbox_events(id) ON DELETE CASCADE,
  job_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

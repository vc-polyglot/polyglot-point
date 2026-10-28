-- Additive migration only. Back up san_ignacio and restore-test it first.
CREATE SCHEMA IF NOT EXISTS san_ignacio;
CREATE TABLE IF NOT EXISTS san_ignacio.site_documents (
  id TEXT PRIMARY KEY, record JSONB NOT NULL, version INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS san_ignacio.site_messages (
  id TEXT PRIMARY KEY, record JSONB NOT NULL
);

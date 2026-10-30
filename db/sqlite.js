const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const INITIAL_MIGRATION_VERSION = '001_init_multi_user_auth';
const INVITE_AND_SETTINGS_MIGRATION_VERSION = '002_invite_codes_and_settings';

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const selectMigrationStmt = db.prepare(
    'SELECT version FROM schema_migrations WHERE version = ?'
  );
  const insertMigrationStmt = db.prepare(
    'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)'
  );

  if (!selectMigrationStmt.get(INITIAL_MIGRATION_VERSION)) {
    const runInitMigration = db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE,
          name TEXT NOT NULL,
          email TEXT,
          password_hash TEXT,
          auth_provider TEXT NOT NULL DEFAULT 'local',
          state INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS oidc_identities (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          issuer TEXT NOT NULL,
          subject TEXT NOT NULL,
          email TEXT,
          name TEXT,
          last_login_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(issuer, subject),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_oidc_identities_user_id ON oidc_identities(user_id);

        CREATE TABLE IF NOT EXISTS refresh_tokens (
          jti TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          revoked_at INTEGER,
          replaced_by_jti TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

        CREATE TABLE IF NOT EXISTS oidc_transactions (
          state TEXT PRIMARY KEY,
          nonce TEXT NOT NULL,
          code_verifier TEXT NOT NULL,
          return_to TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS oidc_exchange_codes (
          code TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          return_to TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          consumed_at INTEGER,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      insertMigrationStmt.run(INITIAL_MIGRATION_VERSION, new Date().toISOString());
    });

    runInitMigration();
  }

  if (!selectMigrationStmt.get(INVITE_AND_SETTINGS_MIGRATION_VERSION)) {
    const runSecondMigration = db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS invite_codes (
          code TEXT PRIMARY KEY,
          created_by TEXT NOT NULL,
          note TEXT,
          used_by TEXT,
          used_by_username TEXT,
          expires_at INTEGER NOT NULL,
          consumed_at INTEGER,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS oidc_pending_registrations (
          token TEXT PRIMARY KEY,
          issuer TEXT NOT NULL,
          subject TEXT NOT NULL,
          name TEXT NOT NULL,
          preferred_username TEXT,
          email TEXT,
          return_to TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      insertMigrationStmt.run(INVITE_AND_SETTINGS_MIGRATION_VERSION, new Date().toISOString());
    });

    runSecondMigration();
  }
}

function createDatabase(sqlitePath = ':memory:') {
  if (sqlitePath !== ':memory:') {
    const dir = path.dirname(path.resolve(sqlitePath));
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(sqlitePath);
  if (sqlitePath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  initSchema(db);
  return db;
}

module.exports = {
  createDatabase,
  initSchema
};

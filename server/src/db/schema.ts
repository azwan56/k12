import type { DbClient } from './database.js';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    internal_email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    avatar_id TEXT NOT NULL DEFAULT 'owl',
    photo_url TEXT,
    grade TEXT NOT NULL DEFAULT 'G6',
    provider TEXT NOT NULL DEFAULT 'wechat',
    profile_json TEXT NOT NULL DEFAULT '{}',
    rewards_json TEXT NOT NULL DEFAULT '{}',
    mathgenius_profile_json TEXT,
    notify_settings_json TEXT NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS user_identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    identifier TEXT NOT NULL,
    meta_json TEXT NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL,
    UNIQUE (provider, identifier)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities (user_id)`,

  `CREATE TABLE IF NOT EXISTS wechat_qr_sessions (
    scene_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    user_id TEXT,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    consumed_at BIGINT
  )`,

  `CREATE TABLE IF NOT EXISTS guardian_invites (
    code TEXT PRIMARY KEY,
    parent_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_name TEXT NOT NULL DEFAULT '家长',
    expires_at BIGINT NOT NULL,
    used_by_student_id TEXT,
    created_at BIGINT NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_guardian_invites_parent ON guardian_invites (parent_user_id, expires_at DESC)`,

  `CREATE TABLE IF NOT EXISTS guardian_links (
    id TEXT PRIMARY KEY,
    parent_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_email TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    student_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_email TEXT NOT NULL,
    student_name TEXT NOT NULL DEFAULT '',
    student_avatar_id TEXT NOT NULL DEFAULT 'owl',
    student_photo_url TEXT,
    notify_channel TEXT NOT NULL DEFAULT 'wechat_tpl',
    notify_webhook_url TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    UNIQUE (parent_user_id, student_user_id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_guardian_links_parent ON guardian_links (parent_user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_guardian_links_student ON guardian_links (student_user_id)`,

  `CREATE TABLE IF NOT EXISTS student_progress (
    student_user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    summary_json TEXT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS student_activities (
    id TEXT PRIMARY KEY,
    student_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    grade TEXT NOT NULL,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    accuracy_pct INTEGER NOT NULL,
    is_complete INTEGER NOT NULL DEFAULT 1,
    record_json TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_student_activities_student_created ON student_activities (student_user_id, created_at DESC)`,

  `CREATE TABLE IF NOT EXISTS wordsmith_dictionary_cache (
    word_lower TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    part_of_speech TEXT NOT NULL,
    definition TEXT NOT NULL,
    synonyms_json TEXT NOT NULL DEFAULT '[]',
    created_at BIGINT NOT NULL
  )`
];

export async function ensureSchema(db: DbClient): Promise<void> {
  for (const stmt of SCHEMA_STATEMENTS) {
    await db.execute(stmt);
  }
}

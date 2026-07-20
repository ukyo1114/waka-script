-- 001_init.sql — schema.dbml に対応する初期スキーマ

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE game_phase AS ENUM ('PRE_GAME', 'DAY', 'NIGHT', 'POST_GAME');
CREATE TYPE channel_entry_status AS ENUM ('active', 'cancelled', 'consumed');
CREATE TYPE message_type AS ENUM (
  'NORMAL',
  'WEREWOLF',
  'SYSTEM',
  'SPECTATOR',
  'SHARED'
);
CREATE TYPE player_role AS ENUM (
  'VILLAGER',
  'WEREWOLF',
  'FORTUNE_TELLER',
  'MEDIUM',
  'HUNTER',
  'POSSESSED',
  'FOX',
  'TRAITOR',
  'SHARER',
  'FANATIC'
);
CREATE TYPE player_status AS ENUM ('ALIVE', 'DEAD', 'NON_PLAYER');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar,
  password_hash text,
  display_name varchar NOT NULL,
  is_guest boolean NOT NULL DEFAULT false,
  email_verified_at timestamptz,
  locked_at timestamptz,
  login_attempts int NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique
  ON users (email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE avatars (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id),
  name varchar NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX avatars_user_id_idx ON avatars (user_id);

CREATE TABLE channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES avatars (id),
  title varchar(100) NOT NULL,
  description varchar(500) NOT NULL DEFAULT '',
  settings jsonb NOT NULL,
  game_settings jsonb NOT NULL,
  entry_processing boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE channel_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels (id),
  avatar_id uuid NOT NULL REFERENCES avatars (id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX channel_participants_active_avatar
  ON channel_participants (channel_id, avatar_id)
  WHERE deleted_at IS NULL;

CREATE TABLE channel_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES channel_participants (id),
  status channel_entry_status NOT NULL DEFAULT 'active',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX channel_entries_active_participant
  ON channel_entries (participant_id)
  WHERE status = 'active';

CREATE TABLE blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels (id),
  avatar_id uuid NOT NULL REFERENCES avatars (id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX blocked_users_active_avatar
  ON blocked_users (channel_id, avatar_id)
  WHERE deleted_at IS NULL;

CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels (id),
  description text NOT NULL DEFAULT '',
  game_settings jsonb NOT NULL,
  logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  processing boolean NOT NULL DEFAULT false,
  phase_info jsonb NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games (id),
  avatar_id uuid NOT NULL REFERENCES avatars (id),
  name varchar NOT NULL,
  picture_url text NOT NULL,
  role player_role NOT NULL,
  status player_status NOT NULL DEFAULT 'ALIVE',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  sender_id varchar NOT NULL,
  content varchar(1000) NOT NULL,
  message_type message_type NOT NULL,
  reply_to_message_id uuid REFERENCES messages (id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_room_type_created
  ON messages (room_id, message_type, created_at DESC);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_token_id uuid REFERENCES refresh_tokens (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);

CREATE TABLE email_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar NOT NULL,
  user_id uuid REFERENCES users (id),
  purpose varchar NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  attempt_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_codes_email_purpose_created_idx
  ON email_codes (email, purpose, created_at DESC);

CREATE TABLE email_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar NOT NULL,
  user_id uuid REFERENCES users (id),
  purpose varchar NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_tokens_email_purpose_idx
  ON email_tokens (email, purpose);

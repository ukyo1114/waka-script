import type { Pool } from "pg";
import type { UserId } from "../../domain/user/index.js";
import { MAX_LOGIN_ATTEMPTS } from "../../domain/user/index.js";
import type {
  CreateUserInput,
  UserRecord,
  UserRepository,
} from "./user.repository.types.js";

type UserRow = {
  id: string;
  email: string | null;
  password_hash: string | null;
  display_name: string;
  is_guest: boolean;
  email_verified_at: Date | null;
  locked_at: Date | null;
  login_attempts: number;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    isGuest: row.is_guest,
    emailVerifiedAt: row.email_verified_at,
    lockedAt: row.locked_at,
    loginAttempts: row.login_attempts,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const USER_COLUMNS = `
  id, email, password_hash, display_name, is_guest,
  email_verified_at, locked_at, login_attempts, deleted_at,
  created_at, updated_at
`;

/** Postgres 実装 */
export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateUserInput): Promise<UserRecord> {
    const result = await this.pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, display_name, is_guest)
       VALUES ($1, $2, $3, $4)
       RETURNING ${USER_COLUMNS}`,
      [input.email, input.passwordHash, input.displayName, input.isGuest],
    );
    return mapUser(result.rows[0]!);
  }

  async findById(id: UserId): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users
       WHERE email = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [email],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async markEmailVerified(
    id: UserId,
    verifiedAt = new Date(),
  ): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `UPDATE users
       SET email_verified_at = $2, updated_at = now()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [id, verifiedAt],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async updatePasswordHash(
    id: UserId,
    passwordHash: string,
  ): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `UPDATE users
       SET password_hash = $2, updated_at = now()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [id, passwordHash],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async updateDisplayName(
    id: UserId,
    displayName: string,
  ): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `UPDATE users
       SET display_name = $2, updated_at = now()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [id, displayName],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async updateEmail(id: UserId, email: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `UPDATE users
       SET email = $2, updated_at = now()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [id, email],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async clearLock(id: UserId): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `UPDATE users
       SET locked_at = NULL, login_attempts = 0, updated_at = now()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async recordFailedLogin(id: UserId): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `UPDATE users
       SET
         login_attempts = login_attempts + 1,
         locked_at = CASE
           WHEN login_attempts + 1 >= $2 THEN COALESCE(locked_at, now())
           ELSE locked_at
         END,
         updated_at = now()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [id, MAX_LOGIN_ATTEMPTS],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async resetLoginAttempts(id: UserId): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `UPDATE users
       SET login_attempts = 0, updated_at = now()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async softDelete(id: UserId): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `UPDATE users
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }
}

import type { Pool } from "pg";
import type { UserId } from "../../domain/user/index.js";
import type {
  CreateRefreshTokenInput,
  RefreshToken,
  RefreshTokenId,
  RefreshTokenRepository,
} from "./refresh-token.repository.types.js";

type RefreshTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by_token_id: string | null;
  created_at: Date;
};

function mapRefreshToken(row: RefreshTokenRow): RefreshToken {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    replacedByTokenId: row.replaced_by_token_id,
    createdAt: row.created_at,
  };
}

const REFRESH_COLUMNS = `
  id, user_id, token_hash, expires_at, revoked_at, replaced_by_token_id, created_at
`;

/** Postgres 実装 */
export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    const result = await this.pool.query<RefreshTokenRow>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING ${REFRESH_COLUMNS}`,
      [input.userId, input.tokenHash, input.expiresAt],
    );
    return mapRefreshToken(result.rows[0]!);
  }

  async findById(id: RefreshTokenId): Promise<RefreshToken | null> {
    const result = await this.pool.query<RefreshTokenRow>(
      `SELECT ${REFRESH_COLUMNS} FROM refresh_tokens WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapRefreshToken(row) : null;
  }

  async revoke(
    id: RefreshTokenId,
    revokedAt = new Date(),
    replacedByTokenId: RefreshTokenId | null = null,
  ): Promise<RefreshToken | null> {
    const result = await this.pool.query<RefreshTokenRow>(
      `UPDATE refresh_tokens
       SET revoked_at = $2, replaced_by_token_id = $3
       WHERE id = $1
       RETURNING ${REFRESH_COLUMNS}`,
      [id, revokedAt, replacedByTokenId],
    );
    const row = result.rows[0];
    return row ? mapRefreshToken(row) : null;
  }

  async revokeAllForUser(
    userId: UserId,
    revokedAt = new Date(),
  ): Promise<number> {
    const result = await this.pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = $2
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId, revokedAt],
    );
    return result.rowCount ?? 0;
  }
}

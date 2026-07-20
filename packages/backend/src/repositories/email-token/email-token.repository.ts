import type { Pool } from "pg";
import type { EmailActionPurpose } from "../../domain/email/index.js";
import type {
  CreateEmailTokenInput,
  EmailToken,
  EmailTokenId,
  EmailTokenRepository,
} from "./email-token.repository.types.js";

type EmailTokenRow = {
  id: string;
  email: string;
  user_id: string | null;
  purpose: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
};

function mapEmailToken(row: EmailTokenRow): EmailToken {
  return {
    id: row.id,
    email: row.email,
    userId: row.user_id,
    purpose: row.purpose as EmailActionPurpose,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
}

const TOKEN_COLUMNS = `
  id, email, user_id, purpose, token_hash, expires_at, used_at, created_at
`;

/** Postgres 実装 */
export class EmailTokenRepositoryImpl implements EmailTokenRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateEmailTokenInput): Promise<EmailToken> {
    const result = await this.pool.query<EmailTokenRow>(
      `INSERT INTO email_tokens (email, user_id, purpose, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${TOKEN_COLUMNS}`,
      [
        input.email,
        input.userId,
        input.purpose,
        input.tokenHash,
        input.expiresAt,
      ],
    );
    return mapEmailToken(result.rows[0]!);
  }

  async findById(id: EmailTokenId): Promise<EmailToken | null> {
    const result = await this.pool.query<EmailTokenRow>(
      `SELECT ${TOKEN_COLUMNS} FROM email_tokens WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapEmailToken(row) : null;
  }

  async markUsed(
    id: EmailTokenId,
    usedAt = new Date(),
  ): Promise<EmailToken | null> {
    const result = await this.pool.query<EmailTokenRow>(
      `UPDATE email_tokens
       SET used_at = $2
       WHERE id = $1
       RETURNING ${TOKEN_COLUMNS}`,
      [id, usedAt],
    );
    const row = result.rows[0];
    return row ? mapEmailToken(row) : null;
  }

  async invalidateActiveForEmail(
    email: string,
    purpose: EmailActionPurpose,
  ): Promise<number> {
    const result = await this.pool.query(
      `UPDATE email_tokens
       SET used_at = now()
       WHERE email = $1 AND purpose = $2 AND used_at IS NULL`,
      [email, purpose],
    );
    return result.rowCount ?? 0;
  }
}

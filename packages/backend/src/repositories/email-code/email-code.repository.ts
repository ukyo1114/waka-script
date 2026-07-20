import type { Pool } from "pg";
import type { EmailPurpose } from "../../domain/email/index.js";
import type {
  CreateEmailCodeInput,
  EmailCode,
  EmailCodeRepository,
} from "./email-code.repository.types.js";

type EmailCodeRow = {
  id: string;
  email: string;
  user_id: string | null;
  purpose: string;
  code_hash: string;
  expires_at: Date;
  used_at: Date | null;
  attempt_count: number;
  created_at: Date;
};

function mapEmailCode(row: EmailCodeRow): EmailCode {
  return {
    id: row.id,
    email: row.email,
    userId: row.user_id,
    purpose: row.purpose as EmailPurpose,
    codeHash: row.code_hash,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    attemptCount: row.attempt_count,
    createdAt: row.created_at,
  };
}

const CODE_COLUMNS = `
  id, email, user_id, purpose, code_hash, expires_at,
  used_at, attempt_count, created_at
`;

/** Postgres 実装 */
export class EmailCodeRepositoryImpl implements EmailCodeRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateEmailCodeInput): Promise<EmailCode> {
    const result = await this.pool.query<EmailCodeRow>(
      `INSERT INTO email_codes (email, user_id, purpose, code_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${CODE_COLUMNS}`,
      [
        input.email,
        input.userId,
        input.purpose,
        input.codeHash,
        input.expiresAt,
      ],
    );
    return mapEmailCode(result.rows[0]!);
  }

  async findValidByCodeHash(
    purpose: EmailPurpose,
    codeHash: string,
    now = new Date(),
  ): Promise<EmailCode | null> {
    const result = await this.pool.query<EmailCodeRow>(
      `SELECT ${CODE_COLUMNS} FROM email_codes
       WHERE purpose = $1
         AND code_hash = $2
         AND used_at IS NULL
         AND expires_at > $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [purpose, codeHash, now],
    );
    const row = result.rows[0];
    return row ? mapEmailCode(row) : null;
  }

  async findLatestByEmailAndPurpose(
    email: string,
    purpose: EmailPurpose,
  ): Promise<EmailCode | null> {
    const result = await this.pool.query<EmailCodeRow>(
      `SELECT ${CODE_COLUMNS} FROM email_codes
       WHERE email = $1 AND purpose = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, purpose],
    );
    const row = result.rows[0];
    return row ? mapEmailCode(row) : null;
  }

  async markUsed(id: string, usedAt = new Date()): Promise<EmailCode | null> {
    const result = await this.pool.query<EmailCodeRow>(
      `UPDATE email_codes
       SET used_at = $2
       WHERE id = $1
       RETURNING ${CODE_COLUMNS}`,
      [id, usedAt],
    );
    const row = result.rows[0];
    return row ? mapEmailCode(row) : null;
  }

  async incrementAttemptCount(id: string): Promise<EmailCode | null> {
    const result = await this.pool.query<EmailCodeRow>(
      `UPDATE email_codes
       SET attempt_count = attempt_count + 1
       WHERE id = $1
       RETURNING ${CODE_COLUMNS}`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapEmailCode(row) : null;
  }

  async invalidateActiveForEmail(
    email: string,
    purpose: EmailPurpose,
  ): Promise<number> {
    const result = await this.pool.query(
      `UPDATE email_codes
       SET used_at = now()
       WHERE email = $1 AND purpose = $2 AND used_at IS NULL`,
      [email, purpose],
    );
    return result.rowCount ?? 0;
  }
}

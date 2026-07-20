import type { Pool } from "pg";
import type { UserId } from "../../domain/user/index.js";
import type {
  Avatar,
  AvatarId,
  AvatarRepository,
  CreateAvatarInput,
} from "./avatar.repository.types.js";

type AvatarRow = {
  id: string;
  user_id: string;
  name: string;
  image_url: string;
  created_at: Date;
  updated_at: Date;
};

function mapAvatar(row: AvatarRow): Avatar {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const AVATAR_COLUMNS = `id, user_id, name, image_url, created_at, updated_at`;

/** Postgres 実装 */
export class AvatarRepositoryImpl implements AvatarRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateAvatarInput): Promise<Avatar> {
    const result = await this.pool.query<AvatarRow>(
      `INSERT INTO avatars (id, user_id, name, image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING ${AVATAR_COLUMNS}`,
      [input.id, input.userId, input.name, input.imageUrl],
    );
    return mapAvatar(result.rows[0]!);
  }

  async findById(id: AvatarId): Promise<Avatar | null> {
    const result = await this.pool.query<AvatarRow>(
      `SELECT ${AVATAR_COLUMNS} FROM avatars WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapAvatar(row) : null;
  }

  async listByUserId(userId: UserId): Promise<Avatar[]> {
    const result = await this.pool.query<AvatarRow>(
      `SELECT ${AVATAR_COLUMNS} FROM avatars
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId],
    );
    return result.rows.map(mapAvatar);
  }

  async countByUserId(userId: UserId): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM avatars WHERE user_id = $1`,
      [userId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async updateName(id: AvatarId, name: string): Promise<Avatar | null> {
    const result = await this.pool.query<AvatarRow>(
      `UPDATE avatars
       SET name = $2, updated_at = now()
       WHERE id = $1
       RETURNING ${AVATAR_COLUMNS}`,
      [id, name],
    );
    const row = result.rows[0];
    return row ? mapAvatar(row) : null;
  }

  async delete(id: AvatarId): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM avatars WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

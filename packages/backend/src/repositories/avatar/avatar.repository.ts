import type { UserId } from "../../domain/user/index.js";
import type {
  Avatar,
  AvatarId,
  AvatarRepository,
  CreateAvatarInput,
} from "./avatar.repository.types.js";

function notImplemented(): never {
  throw new Error("AvatarRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class AvatarRepositoryImpl implements AvatarRepository {
  create(_input: CreateAvatarInput): Promise<Avatar> {
    return notImplemented();
  }

  findById(_id: AvatarId): Promise<Avatar | null> {
    return notImplemented();
  }

  listByUserId(_userId: UserId): Promise<Avatar[]> {
    return notImplemented();
  }

  countByUserId(_userId: UserId): Promise<number> {
    return notImplemented();
  }

  updateName(_id: AvatarId, _name: string): Promise<Avatar | null> {
    return notImplemented();
  }
}

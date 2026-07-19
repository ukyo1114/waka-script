import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { AVATAR_IMAGE_MAX_BYTES } from "../services/avatar/service.js";
import { InvalidAvatarImageError } from "../shared/errors.js";
import { handleControllerError } from "../shared/http.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_IMAGE_MAX_BYTES },
}).single("image");

/** multipart フィールド名 `image`。メモリ上に保持し S3 へ put する。 */
export function avatarImageUpload(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  upload(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return handleControllerError(
          res,
          new InvalidAvatarImageError("image file must be 1MB or less"),
        );
      }
      return handleControllerError(
        res,
        new InvalidAvatarImageError(err.message),
      );
    }
    if (err) {
      return handleControllerError(res, err);
    }
    next();
  });
}

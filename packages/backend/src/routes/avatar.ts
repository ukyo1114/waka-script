import { Router } from "express";
import {
  createAvatar,
  deleteAvatar,
  listAvatars,
  updateAvatarImage,
  updateAvatarName,
} from "../controllers/avatar/index.js";
import { avatarImageUpload } from "../middleware/avatar-image-upload.js";
import { requireAccessToken } from "../middleware/index.js";

const avatarRouter = Router();

avatarRouter.post("/", requireAccessToken, createAvatar);
avatarRouter.get("/", requireAccessToken, listAvatars);
avatarRouter.patch("/:id", requireAccessToken, updateAvatarName);
avatarRouter.put(
  "/:id/image",
  requireAccessToken,
  avatarImageUpload,
  updateAvatarImage,
);
avatarRouter.delete("/:id", requireAccessToken, deleteAvatar);

export { avatarRouter };

import { Router } from "express";
import { createAvatar, listAvatars } from "../controllers/avatar/index.js";
import { requireAccessToken } from "../middleware/index.js";

const avatarRouter = Router();

avatarRouter.post("/", requireAccessToken, createAvatar);
avatarRouter.get("/", requireAccessToken, listAvatars);

export { avatarRouter };

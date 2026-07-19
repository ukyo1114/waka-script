import { Router } from "express";
import {
  blockChannelUser,
  createChannel,
  joinChannel,
  listBlockedUsers,
  listChannels,
  unblockChannelUser,
  updateChannel,
} from "../controllers/channel/index.js";
import { requireAccessToken } from "../middleware/index.js";

const channelRouter = Router();

channelRouter.post("/", requireAccessToken, createChannel);
channelRouter.get("/", requireAccessToken, listChannels);
channelRouter.post("/:id/join", requireAccessToken, joinChannel);
channelRouter.patch("/:id", requireAccessToken, updateChannel);
channelRouter.get("/:id/blocked-users", requireAccessToken, listBlockedUsers);
channelRouter.post("/:id/blocked-users", requireAccessToken, blockChannelUser);
channelRouter.delete(
  "/:id/blocked-users/:blockedUserId",
  requireAccessToken,
  unblockChannelUser,
);

export { channelRouter };

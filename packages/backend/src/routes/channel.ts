import { Router } from "express";
import {
  createChannel,
  joinChannel,
  listChannels,
  updateChannel,
} from "../controllers/channel/index.js";
import { requireAccessToken } from "../middleware/index.js";

const channelRouter = Router();

channelRouter.post("/", requireAccessToken, createChannel);
channelRouter.get("/", requireAccessToken, listChannels);
channelRouter.post("/:id/join", requireAccessToken, joinChannel);
channelRouter.patch("/:id", requireAccessToken, updateChannel);

export { channelRouter };

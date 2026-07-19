import { Router } from "express";
import {
  createMessage,
  listMessageReplies,
  listMessages,
  listMessagesAfter,
} from "../controllers/message/index.js";
import { requireAccessToken } from "../middleware/index.js";

const messageRouter = Router();

messageRouter.get("/:roomId", requireAccessToken, listMessages);
messageRouter.get("/:roomId/after", requireAccessToken, listMessagesAfter);
messageRouter.get(
  "/:roomId/:messageId/replies",
  requireAccessToken,
  listMessageReplies,
);
messageRouter.post("/:roomId", requireAccessToken, createMessage);

export { messageRouter };

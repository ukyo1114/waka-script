import { Router } from "express";
import {
  postAttack,
  postDivination,
  postGuard,
  postVote,
} from "../controllers/game/index.js";
import { requireAccessToken } from "../middleware/index.js";

const gameRouter = Router();

gameRouter.post("/:id/vote", requireAccessToken, postVote);
gameRouter.post("/:id/divination", requireAccessToken, postDivination);
gameRouter.post("/:id/attack", requireAccessToken, postAttack);
gameRouter.post("/:id/guard", requireAccessToken, postGuard);

export { gameRouter };

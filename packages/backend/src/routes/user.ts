import { Router } from "express";
import {
  login,
  logout,
  refresh,
  register,
  updateDisplayName,
} from "../controllers/user/index.js";
import { requireAccessToken } from "../middleware/index.js";

const userRouter = Router();

userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/token/refresh", refresh);
userRouter.post("/logout", logout);
userRouter.patch("/display-name", requireAccessToken, updateDisplayName);

export { userRouter };

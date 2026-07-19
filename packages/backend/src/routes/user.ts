import { Router } from "express";
import {
  changePassword,
  completeEmailChange,
  completePasswordReset,
  deleteAccount,
  getMe,
  login,
  loginAsGuest,
  logout,
  refresh,
  register,
  updateDisplayName,
} from "../controllers/user/index.js";
import { requireAccessToken } from "../middleware/index.js";

const userRouter = Router();

userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/guest", loginAsGuest);
userRouter.post("/token/refresh", refresh);
userRouter.post("/logout", logout);
userRouter.post("/password-reset", completePasswordReset);
userRouter.get("/me", requireAccessToken, getMe);
userRouter.patch("/display-name", requireAccessToken, updateDisplayName);
userRouter.patch("/password", requireAccessToken, changePassword);
userRouter.patch("/email", requireAccessToken, completeEmailChange);
userRouter.delete("/account", requireAccessToken, deleteAccount);

export { userRouter };

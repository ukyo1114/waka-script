import { Router } from "express";
import { login, logout, refresh, register } from "../controllers/user/index.js";

const userRouter = Router();

userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/token/refresh", refresh);
userRouter.post("/logout", logout);

export { userRouter };

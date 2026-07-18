import { Router } from "express";
import { login, logout, me, register } from "../handlers/user.js";

const userRouter = Router();

userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/logout", logout);
userRouter.get("/me", me);

export { userRouter };

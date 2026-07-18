import { Router } from "express";
import { sendCode, verifyCode } from "../handlers/email.js";

const emailRouter = Router();

emailRouter.post("/send/:purpose", sendCode);
emailRouter.post("/verify/:purpose", verifyCode);

export { emailRouter };

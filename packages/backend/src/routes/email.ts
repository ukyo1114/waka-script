import { Router } from "express";
import {
  forgotPassword,
  resend,
  resetPassword,
  verify,
} from "../handlers/email.js";

const emailRouter = Router();

emailRouter.post("/verify", verify);
emailRouter.post("/resend", resend);
emailRouter.post("/forgot-password", forgotPassword);
emailRouter.post("/reset-password", resetPassword);

export { emailRouter };

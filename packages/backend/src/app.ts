import express from "express";
import { emailRouter } from "./routes/email.js";
import { userRouter } from "./routes/user.js";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/user", userRouter);
  app.use("/email", emailRouter);

  return app;
}

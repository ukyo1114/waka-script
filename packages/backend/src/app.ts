import express from "express";
import type { Repositories } from "./repositories/index.js";
import { emailRouter } from "./routes/email.js";
import { userRouter } from "./routes/user.js";

export function createApp(repos?: Repositories) {
  const app = express();

  if (repos) {
    app.locals.repos = repos;
  }

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/user", userRouter);
  app.use("/email", emailRouter);

  return app;
}

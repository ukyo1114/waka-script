import express from "express";
import type { Repositories } from "./repositories/index.js";
import { avatarRouter } from "./routes/avatar.js";
import { channelRouter } from "./routes/channel.js";
import { emailRouter } from "./routes/email.js";
import { userRouter } from "./routes/user.js";
import { getObjectStorageImpl } from "./shared/get-object-storage.js";
import type { ObjectStorage } from "./shared/object-storage.js";

export type CreateAppOptions = {
  repos?: Repositories;
  objectStorage?: ObjectStorage;
};

export function createApp(options?: CreateAppOptions | Repositories) {
  const app = express();

  // 互換: 旧シグネチャ createApp(repos)
  const opts: CreateAppOptions =
    options && "users" in options
      ? { repos: options }
      : (options ?? {});

  if (opts.repos) {
    app.locals.repos = opts.repos;
  }

  app.locals.objectStorage = opts.objectStorage ?? getObjectStorageImpl();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/user", userRouter);
  app.use("/email", emailRouter);
  app.use("/avatar", avatarRouter);
  app.use("/channel", channelRouter);

  return app;
}

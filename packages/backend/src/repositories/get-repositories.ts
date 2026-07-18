import type { Request } from "express";
import type { Repositories } from "./index.js";

export function getRepositories(req: Request): Repositories {
  const repos = req.app.locals.repos as Repositories | undefined;
  if (!repos) {
    throw new Error("repositories are not configured");
  }
  return repos;
}

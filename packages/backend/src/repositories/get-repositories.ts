import type { Request } from "express";
import type { Repositories } from "../repositories/index.js";

export function getRepositories(req: Request): Repositories {
  return req.app.locals.repos as Repositories;
}

import type { NextFunction, Request, Response } from "express";
import { InvalidAccessTokenError } from "../shared/errors.js";
import { verifyAccessToken } from "../shared/access-token.js";
import { handleControllerError } from "../shared/http.js";

export type AuthContext = {
  userId: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

/**
 * Authorization: Bearer <accessToken> を検証し req.auth に userId を載せる。
 */
export async function requireAccessToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = readBearerToken(req);
    if (!token) throw new InvalidAccessTokenError();

    const claims = await verifyAccessToken({
      token,
      secret: process.env.JWT_SECRET,
    });
    req.auth = { userId: claims.userId };
    next();
  } catch (error) {
    return handleControllerError(res, error);
  }
}

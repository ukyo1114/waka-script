import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export type NodeEnv = "development" | "production" | "test";

/** 開発用 docker-compose（postgres）の接続文字列 */
export const DEVELOPMENT_DATABASE_URL =
  "postgresql://jinro:jinro@localhost:5432/jinro";

let loaded = false;

/**
 * `.env` → `.env.${NODE_ENV}` の順で読み込む（後者が優先）。
 * NODE_ENV 未設定時は development 扱い。
 */
export function loadEnv(): void {
  if (loaded) return;

  const nodeEnv = process.env.NODE_ENV ?? "development";
  dotenv.config({ path: path.join(backendRoot, ".env") });
  dotenv.config({
    path: path.join(backendRoot, `.env.${nodeEnv}`),
    override: true,
  });

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
  }

  loaded = true;
}

export function getNodeEnv(): NodeEnv {
  const value = process.env.NODE_ENV ?? "development";
  if (value === "production" || value === "test" || value === "development") {
    return value;
  }
  return "development";
}

/**
 * 開発: DATABASE_URL があればそれ、なければ docker-compose のデフォルト。
 * 本番: DATABASE_URL 必須（未設定なら throw）。
 * テスト: DATABASE_URL があればそれ、なければ開発用デフォルト（接続はテストで使わない想定）。
 */
export function getDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) return fromEnv;

  if (getNodeEnv() === "production") {
    throw new Error(
      "DATABASE_URL is required when NODE_ENV=production",
    );
  }

  return DEVELOPMENT_DATABASE_URL;
}

export function getPort(): number {
  const raw = process.env.PORT;
  if (!raw) return 3000;
  const port = Number(raw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`invalid PORT: ${raw}`);
  }
  return port;
}

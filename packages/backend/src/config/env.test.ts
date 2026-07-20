import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  DEVELOPMENT_DATABASE_URL,
  getDatabaseUrl,
  getNodeEnv,
} from "./env.js";

describe("getDatabaseUrl", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it("DATABASE_URL があればそれを返す", () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://custom:custom@db:5432/app";
    assert.equal(
      getDatabaseUrl(),
      "postgresql://custom:custom@db:5432/app",
    );
  });

  it("開発で未設定なら docker-compose のデフォルトを返す", () => {
    process.env.NODE_ENV = "development";
    delete process.env.DATABASE_URL;
    assert.equal(getDatabaseUrl(), DEVELOPMENT_DATABASE_URL);
  });

  it("本番で未設定なら throw する", () => {
    process.env.NODE_ENV = "production";
    delete process.env.DATABASE_URL;
    assert.throws(() => getDatabaseUrl(), /DATABASE_URL is required/);
  });
});

describe("getNodeEnv", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it("production / test / development を返す", () => {
    process.env.NODE_ENV = "production";
    assert.equal(getNodeEnv(), "production");
    process.env.NODE_ENV = "test";
    assert.equal(getNodeEnv(), "test");
  });
});
